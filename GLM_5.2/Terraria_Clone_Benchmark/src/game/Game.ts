// Game: the central coordinator. Owns the world, player, entities, camera,
// input, UI, lighting, particles, day/night cycle, spawning, and the main loop.
// This file wires together all subsystems defined in the rest of the codebase.

import { BlockId, TILE, WORLD_HEIGHT, CHUNK_WIDTH, getBlock } from '../block/Blocks';
import { World } from './World';
import { Camera } from './Camera';
import { Input } from './Input';
import { Player, InvSlot } from '../entity/Player';
import { Monster } from '../entity/Monster';
import { NPC, NPCKind } from '../entity/NPC';
import { getBlockTexture, getCrackOverlay } from '../textures/TextureAtlas';
import { HUD } from '../ui/HUD';
import { DialogBox } from '../ui/DialogBox';
import { InventoryUI } from '../ui/Inventory';
import { Lighting } from '../render/Lighting';
import { ParticleSystem } from '../render/ParticleSystem';
import { SaveSystem } from '../save/SaveSystem';
import { buildVillage, VillageHouse } from '../generation/VillageGen';
import { miningSpeed } from '../tools/Tools';
import { RNG } from './Noise';

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: Input;
  world: World;
  player: Player;
  camera: Camera;
  hud: HUD;
  dialog: DialogBox;
  inventoryUI: InventoryUI;
  lighting = new Lighting();
  particles = new ParticleSystem();

  monsters: Monster[] = [];
  npcs: NPC[] = [];
  villageHouses: VillageHouse[] = [];

  /** day cycle 0..1 (0.5 = noon) */
  time = 0.3;
  /** real seconds per full day */
  dayLength = 600;
  fps = 60;

  bossDefeated = false;
  bossActive = false;
  autoSaveTimer = 0;
  spawnTimer = 0;
  private nearNPC: NPC | null = null;

  /** is there a crafting table adjacent to the player? */
  private nearTable = false;

  constructor(canvas: HTMLCanvasElement, seed: number, save: ReturnType<typeof SaveSystem.load>) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.input = new Input(canvas);
    this.world = new World(seed);

    // spawn player at origin on the surface
    const surfaceY = this.findSpawnSurface(0);
    this.player = new Player(0.5, surfaceY);
    this.player.mode = 'survival';
    this.player.giveStarterSurvival();

    this.camera = new Camera(canvas.width, canvas.height);
    this.camera.x = this.player.x * TILE;
    this.camera.y = this.player.y * TILE;

    this.hud = new HUD(this.player);
    this.dialog = new DialogBox();
    this.inventoryUI = new InventoryUI(this.player);

    // restore save if present
    if (save) {
      SaveSystem.applyToWorld(save, this.world);
      SaveSystem.applyToPlayer(save, this.player);
      this.time = save.time;
      this.bossDefeated = save.player.bossDefeated;
    }

    // build village once (after world is available, before first frame)
    if (!this.world.villageBuilt) {
      this.ensureChunksAround(0, 3);
      this.villageHouses = buildVillage(this.world, seed);
      this.world.villageBuilt = true;
      this.spawnVillagers();
    } else {
      // village was already built in a prior session; respawn NPCs at their door
      this.villageHouses = buildVillage(this.world, seed);
      this.spawnVillagers();
    }

    this.bindUI();
    this.hint('Drücke M für Creative, E für Inventar. Rede mit dem Guide (E).');
  }

  private bindUI() {
    this.canvas.addEventListener('click', () => {
      if (this.dialog.active) this.dialog.advance();
      else if (this.inventoryUI.open) {
        const handled = this.inventoryUI.handleClick(this.input.mouse.x, this.input.mouse.y, this.nearTable);
      }
    });
  }

  private findSpawnSurface(x: number): number {
    this.world.chunkFor(x);
    return this.world.surfaceY(x);
  }

  private ensureChunksAround(worldX: number, radiusChunks: number) {
    const cx = Math.floor(worldX / CHUNK_WIDTH);
    for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
      this.world.getOrCreate(cx + dx);
    }
  }

  private spawnVillagers() {
    for (const h of this.villageHouses) {
      // only spawn if not already present
      if (this.npcs.some((n) => n.npcKind === h.npcKind)) continue;
      const npc = new NPC(h.npcKind, h.x + 0.5, h.y);
      this.npcs.push(npc);
    }
  }

  // ---------------- Loop ----------------

  private lastTime = 0;
  start() {
    const loop = (t: number) => {
      const dt = this.lastTime ? Math.min(0.05, (t - this.lastTime) / 1000) : 0.016;
      this.lastTime = t;
      this.fps = this.fps * 0.9 + (1 / dt) * 0.1;
      this.update(dt);
      this.render();
      this.input.endFrame();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private hint(text: string) { this.hud.showHint(text); }

  // ---------------- Update ----------------

  private update(dt: number) {
    // day/night
    this.time = (this.time + dt / this.dayLength) % 1;

    this.hud.update(dt);
    this.dialog.update(dt);
    this.inventoryUI.update();
    this.particles.update(dt);

    this.handleGlobalKeys();

    // only run world simulation when not in a dialog/inventory
    const uiBlocking = this.dialog.active || this.inventoryUI.open;
    if (!uiBlocking) {
      this.handleMovement(dt);
      this.handleMining(dt);
      this.handleHotbarSelection();
      this.handlePlacement();
    }

    this.updateEntities(dt);
    this.updateSpawning(dt);
    this.checkNPCInteraction();

    // camera follows player
    this.camera.resize(this.canvas.width, this.canvas.height);
    this.camera.follow(this.player.x, this.player.y - 0.5, dt);

    // zoom via +/- (wheel is reserved for hotbar selection)
    if (this.input.take('+', '=')) this.camera.setZoom(this.camera.zoom + 0.3);
    if (this.input.take('-', '_')) this.camera.setZoom(this.camera.zoom - 0.3);

    // check crafting table proximity
    this.nearTable = this.isNearCraftingTable();

    // autosave
    this.autoSaveTimer += dt;
    if (this.autoSaveTimer > 60) {
      this.autoSaveTimer = 0;
      if (SaveSystem.save(this.world, this.player, this.time, this.bossDefeated)) {
        this.hud.message('Spiel automatisch gespeichert.');
      }
    }

    // unload distant chunks to save memory
    const pcx = Math.floor(this.player.x / CHUNK_WIDTH);
    this.world.unloadDistant(pcx, 12);
  }

  private handleGlobalKeys() {
    // toggle mode
    if (this.input.take('m')) {
      const newMode = this.player.mode === 'survival' ? 'creative' : 'survival';
      this.setMode(newMode);
    }
    // inventory
    if (this.input.take('e')) {
      if (this.dialog.active) { this.dialog.advance(); return; }
      this.inventoryUI.toggle();
    }
    // interact (NPC)
    if (this.input.take('f')) {
      this.interactNPC();
    }
    // summon boss (dev-ish): press B if holding summon item
    if (this.input.take('b')) {
      this.trySummonBoss();
    }
    // quick save
    if (this.input.take('p')) {
      if (SaveSystem.save(this.world, this.player, this.time, this.bossDefeated)) {
        this.hud.message('Spiel gespeichert! (P)');
      }
    }
  }

  private setMode(mode: 'survival' | 'creative') {
    this.player.mode = mode;
    if (mode === 'creative') {
      this.player.giveStarterCreative();
      this.player.health = this.player.maxHealth;
      this.hud.message('Creative Mode: Fliegen mit W, unendlich Blöcke, kein Schaden.');
    } else {
      this.hud.message('Survival Mode: Herzen, Schaden, Werkzeuge nötig.');
    }
  }

  private handleMovement(dt: number) {
    const p = this.player;
    const speed = 7;
    let move = 0;
    if (this.input.isDown('a', 'arrowleft')) move -= 1;
    if (this.input.isDown('d', 'arrowright')) move += 1;
    p.vx = move * speed;

    if (p.flying) {
      // creative flight
      let vy = 0;
      if (this.input.isDown('w', 'arrowup', ' ')) vy -= 1;
      if (this.input.isDown('s', 'arrowdown')) vy += 1;
      p.vy = vy * speed;
      p.onGround = false;
    } else {
      if ((this.input.isDown('w', 'arrowup', ' ')) && p.onGround) {
        p.vy = -11;
        p.onGround = false;
      }
      // swim up in water
      const inWater = this.getBlockAtEntity(p) === BlockId.Water;
      if (inWater && this.input.isDown('w', 'arrowup', ' ')) {
        p.vy = -4;
      }
    }

    if (move !== 0) p.facing = move > 0 ? 1 : -1;

    p.applyGravity(dt);
    p.moveAndCollide(this.world, dt);

    // fall damage (survival only)
    if (!p.flying && p.mode === 'survival' && p.onGround) {
      if (this.lastFallVel > 22) {
        const dmg = Math.floor((this.lastFallVel - 22) * 0.8);
        if (dmg > 0) p.hurt(dmg, 0, 0);
      }
      this.lastFallVel = 0;
    }
    if (!p.flying) this.lastFallVel = Math.max(this.lastFallVel, p.vy);

    // respawn on death
    if (!p.alive) {
      this.respawn();
    }
  }
  private lastFallVel = 0;

  private respawn() {
    const surfY = this.world.surfaceY(Math.floor(this.player.x));
    this.player.x = Math.floor(this.player.x) + 0.5;
    this.player.y = surfY;
    this.player.vx = 0; this.player.vy = 0;
    this.player.health = this.player.maxHealth;
    this.player.alive = true;
    this.player.invuln = 2;
    this.hud.message('Du bist gestorben. Respawn am Boden.');
  }

  private getBlockAtEntity(e: { x: number; y: number }): BlockId {
    return this.world.getBlock(Math.floor(e.x), Math.floor(e.y - 0.5));
  }

  // ---------------- Mining ----------------

  private handleMining(dt: number) {
    const p = this.player;
    if (!this.input.mouse.down) {
      p.miningTarget = null;
      p.miningProgress = 0;
      return;
    }
    const [tx, ty] = this.camera.screenToTile(this.input.mouse.x, this.input.mouse.y);
    // reach check (5 tiles)
    const dx = tx - p.x;
    const dy = ty - (p.y - 1);
    if (Math.hypot(dx, dy) > 6) { p.miningTarget = null; p.miningProgress = 0; return; }

    const id = this.world.getBlock(tx, ty);
    if (id === BlockId.Air || id === BlockId.Bedrock) {
      p.miningTarget = null; p.miningProgress = 0; return;
    }

    // swing animation
    if (!p.swinging) p.swing();

    const def = getBlock(id);
    const sel = p.selectedSlot;
    const tool = sel?.tool ?? null;
    const speed = miningSpeed(tool ?? null, def.requiredTier, def.tool);

    // face the block
    p.facing = tx > p.x ? 1 : -1;

    if (p.mode === 'creative') {
      // instant break + maybe attack monsters
      this.breakBlock(tx, ty);
      this.tryAttack(tx, ty, tool);
      return;
    }

    if (!p.miningTarget || p.miningTarget.tx !== tx || p.miningTarget.ty !== ty) {
      p.miningTarget = { tx, ty };
      p.miningProgress = 0;
    }
    // progress: total time = hardness / speed seconds
    const totalTime = def.hardness / speed;
    p.miningProgress += dt / Math.max(0.05, totalTime);
    if (p.miningProgress >= 1) {
      this.breakBlock(tx, ty);
      p.miningProgress = 0;
      p.miningTarget = null;
    } else {
      // periodically emit particles
      if (Math.random() < 0.3) {
        this.particles.emit({
          x: tx + 0.5, y: ty + 0.5, color: def.color,
          vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3,
          life: 0.4, size: 2, gravity: 20,
        });
      }
    }
  }

  private breakBlock(tx: number, ty: number) {
    const id = this.world.getBlock(tx, ty);
    if (id === BlockId.Air || id === BlockId.Bedrock) return;
    const def = getBlock(id);
    this.world.setBlock(tx, ty, BlockId.Air);
    // particle burst in block color
    this.particles.burst(tx + 0.5, ty + 0.5, def.color, 8, 5);
    // drop
    if (def.drop !== undefined && def.drop !== BlockId.Air) {
      if (this.player.mode === 'survival') {
        this.player.addItem(def.drop, 1);
      }
    }
  }

  private tryAttack(tx: number, ty: number, tool: any) {
    const damage = tool?.damage ?? 1;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      if (Math.abs(m.x - tx) < 1.2 && Math.abs((m.y - m.height / 2) - ty) < 1.5) {
        const dir = m.x > this.player.x ? 1 : -1;
        if (m.hurt(damage, dir * 8, -4)) {
          this.particles.burst(m.x, m.y - m.height / 2, '#ff4040', 6, 4);
        }
        if (!m.alive) this.onMonsterDeath(m);
      }
    }
    // also NPCs can be hit (no death drops) - but let's not kill villagers
  }

  private onMonsterDeath(m: Monster) {
    this.particles.burst(m.x, m.y - m.height / 2, m.color, 16, 7);
    if (m.kind === 'boss') {
      this.bossDefeated = true;
      this.bossActive = false;
      this.hud.boss = null;
      this.hud.message('Du hast das Auge des Cthulhu besiegt! 🏆');
      // reward
      this.player.addItem(BlockId.DiamondOre, 5);
    }
  }

  // ---------------- Placement ----------------

  private placementCooldown = 0;
  private handlePlacement() {
    this.placementCooldown -= 0.016;
    if (!this.input.mouse.rightDown) return;
    if (this.placementCooldown > 0) return;
    const p = this.player;
    const sel = p.selectedSlot;
    if (!sel || sel.block === undefined || sel.count <= 0) return;
    const [tx, ty] = this.camera.screenToTile(this.input.mouse.x, this.input.mouse.y);
    const dx = tx - p.x;
    const dy = ty - (p.y - 1);
    if (Math.hypot(dx, dy) > 6) return;
    if (this.world.getBlock(tx, ty) !== BlockId.Air) return;
    // don't place inside the player
    if (Math.abs(tx - p.x) < 1 && ty > p.top && ty < p.bottom && getBlock(sel.block).solid) return;
    this.world.setBlock(tx, ty, sel.block);
    if (p.mode !== 'creative') p.consumeSelected();
    this.placementCooldown = 0.15;
    p.swing();
  }

  private handleHotbarSelection() {
    for (let i = 1; i <= 9; i++) {
      if (this.input.take(String(i))) this.player.selected = i - 1;
    }
    const wheel = this.input.consumeWheel();
    if (wheel) {
      this.player.selected = (this.player.selected + (wheel > 0 ? 1 : -1) + 9) % 9;
    }
  }

  private isNearCraftingTable(): boolean {
    const px = Math.floor(this.player.x);
    const py = Math.floor(this.player.y - 1);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (this.world.getBlock(px + dx, py + dy) === BlockId.CraftingTable) return true;
      }
    }
    return false;
  }

  // ---------------- Entities ----------------

  private updateEntities(dt: number) {
    const p = this.player;
    // inject player target into monsters
    const target = { x: p.x, y: p.y, health: p.health, mode: p.mode };
    for (const m of this.monsters) {
      m.targetPlayer = p.mode === 'survival' ? target : null;
      m.hurtPlayer = (dmg, kx, ky) => p.hurt(dmg, kx, ky);
      m.spawnSlime = (x, y) => this.monsters.push(new Monster({ x, y, kind: 'slime' }));
      m.update(dt, this.world);
    }
    for (const n of this.npcs) n.update(dt, this.world);

    // remove dead monsters
    this.monsters = this.monsters.filter((m) => !m.removed);

    // boss HUD tracking
    const boss = this.monsters.find((m) => m.kind === 'boss' && m.alive);
    this.hud.boss = boss ?? null;
    if (!boss && this.bossActive) {
      // boss was active but now gone and not via death (e.g. daytime flee)
      this.bossActive = false;
    }
    // boss flees at dawn
    if (boss && this.time > 0.22 && this.time < 0.3) {
      boss.removed = true;
      this.bossActive = false;
      this.hud.boss = null;
      this.hud.message('Das Auge des Cthulhu ist bei Tagesanbruch geflohen...');
    }
  }

  // ---------------- Spawning ----------------

  private updateSpawning(dt: number) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = 2.5;

    const isNight = this.time < 0.23 || this.time > 0.77;
    const cap = isNight ? 14 : 6;
    if (this.monsters.length >= cap) return;

    // spawn off-screen but near the player
    const dist = 24 + Math.random() * 10;
    const side = Math.random() < 0.5 ? -1 : 1;
    const sx = Math.floor(this.player.x + side * dist);
    const sy = this.world.surfaceY(sx) - 1;
    if (sy <= 0 || sy >= WORLD_HEIGHT) return;

    let kind: Monster['kind'] | null = null;
    if (isNight) {
      const r = Math.random();
      kind = r < 0.5 ? 'zombie' : r < 0.85 ? 'slime' : 'bandit';
    } else {
      // daytime: occasional slimes and rare bandit
      if (Math.random() < 0.6) kind = 'slime';
      else if (Math.random() < 0.2) kind = 'bandit';
    }
    if (!kind) return;
    // don't spawn right on top of village NPCs
    if (this.npcs.some((n) => Math.abs(n.x - sx) < 6)) return;
    const m = new Monster({ x: sx + 0.5, y: sy, kind });
    this.monsters.push(m);
  }

  private trySummonBoss() {
    if (this.bossActive) { this.hud.message('Der Boss ist bereits da!'); return; }
    // require night
    const isNight = this.time < 0.23 || this.time > 0.77;
    if (!isNight) { this.hud.message('Der Boss kann nur nachts beschworen werden (B).'); return; }
    // consume a "summon eye" — for simplicity, requires 1 cloud-marker block in inventory
    // search the real hotbar + inventory slots so the edit persists
    const allSlots: (InvSlot | null)[][] = [this.player.hotbar, this.player.inventory];
    let foundArr: (InvSlot | null)[] | null = null;
    let foundIdx = -1;
    for (const arr of allSlots) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] && arr[i]!.block === BlockId.Cloud) { foundArr = arr; foundIdx = i; break; }
      }
      if (foundArr) break;
    }
    if (!foundArr || foundIdx < 0) {
      this.hud.message('Du brauchst einen "Verdächtigen Blick" (craften).');
      return;
    }
    // consume
    const slot = foundArr[foundIdx]!;
    slot.count--;
    if (slot.count <= 0) foundArr[foundIdx] = null;

    // spawn boss above player
    const bx = this.player.x;
    const by = this.player.y - 10;
    const boss = new Monster({ x: bx, y: by, kind: 'boss' });
    this.monsters.push(boss);
    this.bossActive = true;
    this.hud.boss = boss;
    this.hud.message('Das Auge des Cthulhu ist erschienen!!');
  }

  // ---------------- NPCs ----------------

  private checkNPCInteraction() {
    this.nearNPC = null;
    let closest: NPC | null = null;
    let closestDist = 3.5;
    for (const n of this.npcs) {
      const d = Math.hypot(n.x - this.player.x, n.y - this.player.y);
      if (d < closestDist) { closestDist = d; closest = n; }
    }
    this.nearNPC = closest;
    if (closest) {
      this.hud.showHint(`Drücke F, um mit ${closest.npcKind === 'guide' ? 'dem Guide' : closest.npcKind === 'merchant' ? 'dem Händler' : 'der Schwester'} zu reden.`);
    }
  }

  private interactNPC() {
    if (!this.nearNPC) return;
    const lines = this.nearNPC.getDialog(this.bossDefeated);
    this.dialog.start(lines, () => {
      // nurse heals
      if (this.nearNPC?.npcKind === 'nurse') {
        this.player.health = this.player.maxHealth;
        this.hud.message('Du wurdest vollständig geheilt.');
      }
      // merchant gives torches
      if (this.nearNPC?.npcKind === 'merchant') {
        this.player.addItem(BlockId.Torch, 10);
      }
    });
  }

  // ---------------- Render ----------------

  private render() {
    const ctx = this.ctx;
    const vw = this.canvas.width;
    const vh = this.canvas.height;

    // sky gradient (day/night aware)
    this.renderSky(ctx, vw, vh);

    // world tiles
    this.renderWorld(ctx, vw, vh);

    // entities
    const camState = { x: this.camera.x, y: this.camera.y, scale: this.camera.scale };
    // draw monsters, npcs, then player on top
    for (const m of this.monsters) m.render(ctx, camState, vw, vh);
    for (const n of this.npcs) {
      n.render(ctx, camState, vw, vh);
      // "!" indicator if player near
      if (this.nearNPC === n) {
        const r = n.screenRect(camState, vw, vh);
        const bob = Math.sin(performance.now() / 200) * 2;
        ctx.fillStyle = '#ffd040';
        ctx.font = 'bold 18px Trebuchet MS';
        ctx.textAlign = 'center';
        ctx.fillText('!', r.x + r.w / 2, r.y - 6 + bob);
        ctx.textAlign = 'left';
      }
    }
    this.player.render(ctx, camState, vw, vh);

    // particles
    this.particles.render(ctx, camState, vw, vh);

    // lighting overlay
    this.lighting.render(ctx, this.world, this.camera, vw, vh, this.time, []);

    // UI
    this.hud.render(ctx, vw, vh, this.time, this.fps);
    this.inventoryUI.render(ctx, vw, vh, this.nearTable);
    this.dialog.render(ctx, vw, vh);

    // death overlay
    if (!this.player.alive) {
      ctx.fillStyle = 'rgba(120,0,0,0.4)';
      ctx.fillRect(0, 0, vw, vh);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.fillText('Du bist gestorben', vw / 2, vh / 2);
      ctx.font = '16px Trebuchet MS';
      ctx.fillText('Respawn läuft...', vw / 2, vh / 2 + 30);
      ctx.textAlign = 'left';
    }
  }

  private renderSky(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
    const t = this.time;
    // colors based on time
    const day = [120, 180, 240];
    const noon = [110, 170, 235];
    const sunset = [240, 130, 70];
    const night = [12, 16, 40];

    let top: number[]; let bottom: number[];
    if (t > 0.22 && t < 0.3) { // sunrise
      const k = (t - 0.22) / 0.08;
      top = lerp3(night, sunset, k); bottom = lerp3(night, day, k);
    } else if (t >= 0.3 && t < 0.7) { // day
      top = noon; bottom = day;
    } else if (t >= 0.7 && t < 0.8) { // sunset
      const k = (t - 0.7) / 0.1;
      top = lerp3(noon, sunset, k); bottom = lerp3(day, sunset, k);
    } else { // night
      top = night; bottom = [lerp(night[0], night[0], 1), lerp(night[1], night[1], 1), lerp(night[2], night[2], 1)];
    }
    const grad = ctx.createLinearGradient(0, 0, 0, vh);
    grad.addColorStop(0, `rgb(${top[0] | 0},${top[1] | 0},${top[2] | 0})`);
    grad.addColorStop(1, `rgb(${bottom[0] | 0},${bottom[1] | 0},${bottom[2] | 0})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);

    // sun / moon
    const sunAngle = (t - 0.25) * Math.PI; // sunrise at 0.25
    const cx = vw / 2 + Math.cos(sunAngle - Math.PI / 2) * vw * 0.4;
    const cy = vh * 0.5 - Math.sin(sunAngle) * vh * 0.4;
    const isDay = t > 0.25 && t < 0.75;
    ctx.fillStyle = isDay ? '#fff6a0' : '#d0d0f0';
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();
    if (!isDay) {
      ctx.fillStyle = 'rgba(180,180,220,0.4)';
      ctx.beginPath(); ctx.arc(cx - 8, cy - 6, 20, 0, Math.PI * 2); ctx.fill();
    }

    // stars at night
    if (!isDay) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const rng = new RNG(12345);
      for (let i = 0; i < 80; i++) {
        const sx = rng.next() * vw;
        const sy = rng.next() * vh * 0.6;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
    }
  }

  private renderWorld(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
    const cam = this.camera;
    const b = cam.viewBounds();
    const minTx = Math.floor(b.minX / TILE);
    const maxTx = Math.ceil(b.maxX / TILE);
    const minTy = Math.max(0, Math.floor(b.minY / TILE));
    const maxTy = Math.min(WORLD_HEIGHT - 1, Math.ceil(b.maxY / TILE));

    const [originX, originY] = cam.worldToScreen(minTx * TILE, minTy * TILE);
    const tileSize = TILE * cam.scale;

    // draw visible tiles
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const id = this.world.getBlock(tx, ty);
        if (id === BlockId.Air) continue;
        const tex = getBlockTexture(id);
        const sx = (tx - minTx) * tileSize + originX;
        const sy = (ty - minTy) * tileSize + originY;
        ctx.drawImage(tex, sx, sy, tileSize + 0.5, tileSize + 0.5);

        // mining crack overlay
        if (this.player.miningTarget && this.player.miningTarget.tx === tx && this.player.miningTarget.ty === ty) {
          const stage = Math.floor(this.player.miningProgress * 9);
          if (stage >= 0) {
            const crack = getCrackOverlay(stage);
            ctx.drawImage(crack, sx, sy, tileSize, tileSize);
          }
        }
      }
    }
  }
}

// color helpers
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerp3(a: number[], b: number[], t: number): number[] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
