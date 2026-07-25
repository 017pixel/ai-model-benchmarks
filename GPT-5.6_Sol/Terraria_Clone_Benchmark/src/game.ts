import { AudioSystem } from './audio';
import { BLOCKS, CONFIG, HOTBAR_ITEMS, ITEM_NAMES, type BlockType, type ItemType, type ToolType } from './config';
import { hash2 } from './noise';
import type {
  BreakState,
  Dialogue,
  Entity,
  FloatingText,
  InputState,
  Particle,
  PlayerState,
  WorldSave,
} from './types';
import { World, isBreakable } from './world';

export interface HudState {
  health: number;
  maxHealth: number;
  mode: 'survival' | 'creative';
  inventory: Record<string, number>;
  selected: number;
  depth: number;
  timeLabel: string;
  quest: string;
  boss?: { name: string; health: number; maxHealth: number };
  pvp: boolean;
  tier: number;
}

interface GameCallbacks {
  onHud: (hud: HudState) => void;
  onToast: (message: string) => void;
  onDialogue: (dialogue: Dialogue | null) => void;
  onSave: (save: WorldSave) => void;
  onPause: () => void;
}

const TOOLS = new Set<ItemType>(['pickaxe', 'axe', 'sword', 'shovel']);
const PLAYER_W = 22;
const PLAYER_H = 52;

export class Game {
  readonly save: WorldSave;
  readonly world: World;
  readonly canvas: HTMLCanvasElement;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly callbacks: GameCallbacks;
  private readonly audio = new AudioSystem();
  private readonly input: InputState = {
    keys: new Set(), pressed: new Set(), mouse: { x: 0, y: 0 }, mouseWorld: { x: 0, y: 0 }, left: false, right: false,
  };
  private readonly textures = new Map<string, HTMLCanvasElement>();
  private readonly particles: Particle[] = [];
  private readonly texts: FloatingText[] = [];
  private entities: Entity[] = [];
  private player: PlayerState;
  private breakState: BreakState | null = null;
  private camera = { x: 0, y: 0 };
  private animationFrame = 0;
  private lastTime = 0;
  private autosaveTimer = 0;
  private spawnTimer = 2;
  private entityId = 1;
  private running = false;
  private placeLatch = false;
  private attackLatch = false;
  private pvpEnabled = false;
  private dialogOpen = false;
  private shake = 0;
  private dpr = 1;
  private readonly announced = new Set<string>();

  constructor(canvas: HTMLCanvasElement, save: WorldSave, callbacks: GameCallbacks) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D wird von diesem Browser nicht unterstützt.');
    this.canvas = canvas;
    this.ctx = context;
    this.save = save;
    this.world = new World(save.seed, save.changes);
    const spawnY = (this.world.surfaceAt(0) - 2) * CONFIG.tileSize - PLAYER_H;
    this.player = {
      x: save.player.x || -CONFIG.tileSize,
      y: save.player.y || spawnY,
      vx: 0,
      vy: 0,
      width: PLAYER_W,
      height: PLAYER_H,
      facing: 1,
      grounded: false,
      health: save.mode === 'creative' ? save.player.maxHealth : save.player.health,
      maxHealth: save.player.maxHealth,
      invulnerable: 0,
      swing: 0,
      walk: 0,
    };
    this.callbacks = callbacks;
    this.setupNpcs();
    this.bindInput();
    this.resize();
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.animationFrame = requestAnimationFrame(this.loop);
    this.callbacks.onToast('Sprich mit Mira am Dorfbrunnen. Drücke E.');
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationFrame);
    this.persist();
    this.unbindInput();
  }

  resize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  };

  selectSlot(index: number): void {
    this.save.selectedSlot = Math.max(0, Math.min(HOTBAR_ITEMS.length - 1, index));
    this.emitHud();
  }

  toggleMode(): void {
    this.save.mode = this.save.mode === 'survival' ? 'creative' : 'survival';
    if (this.save.mode === 'creative') {
      this.player.health = this.player.maxHealth;
      for (const item of HOTBAR_ITEMS) if (!TOOLS.has(item)) this.save.inventory[item] = Math.max(999, this.save.inventory[item] ?? 0);
    }
    this.callbacks.onToast(this.save.mode === 'creative' ? 'Creative: Flug, Unverwundbarkeit, sofortiger Abbau' : 'Survival: Schwerkraft, Schaden und Werkzeugtempo');
    this.emitHud();
  }

  saveNow(): void {
    this.persist();
    this.callbacks.onToast('Welt lokal gespeichert');
  }

  summonBoss(): void {
    if (this.entities.some((entity) => entity.type === 'warden')) {
      this.callbacks.onToast('Der Tiefenwächter ist bereits erwacht.');
      return;
    }
    if (this.save.mode === 'survival' && ((this.save.inventory.crystal ?? 0) < 3 || this.save.progress.tier < 2)) {
      this.callbacks.onToast('Benötigt: Werkzeugstufe II und 3 Tiefenkristalle');
      return;
    }
    if (this.save.mode === 'survival') this.save.inventory.crystal -= 3;
    this.spawnWarden();
  }

  togglePvp(): void {
    const rival = this.entities.find((entity) => entity.type === 'rival');
    if (rival) {
      this.entities = this.entities.filter((entity) => entity !== rival);
      this.pvpEnabled = false;
      this.callbacks.onToast('Lokales PvP beendet');
    } else {
      this.entities.push(this.createEntity('rival', this.player.x + 90, this.player.y, 80));
      this.pvpEnabled = true;
      this.callbacks.onToast('PvP: Spieler 2 nutzt Pfeiltasten, Enter zum Angriff');
    }
    this.emitHud();
  }

  handleDialogueAction(action: string): void {
    if (action === 'close') {
      this.dialogOpen = false;
      this.callbacks.onDialogue(null);
      return;
    }
    if (action === 'guide-more') {
      this.callbacks.onDialogue({
        speaker: 'Mira, Kundschafterin',
        text: 'Baue Holz, Kupfer und Kristalle ab. Linksklick hält den Abbau, Rechtsklick setzt den gewählten Block. Tiefenkristalle liegen weit unter der Oberfläche. Mit B kannst du später den Wächter rufen.',
        choices: [{ label: 'Verstanden', action: 'close' }],
      });
      return;
    }
    if (action === 'forge') {
      const cost = this.save.progress.tier === 1 ? 8 : 14;
      if (this.save.progress.tier >= 3) {
        this.callbacks.onToast('Deine Werkzeuge haben bereits die höchste Stufe.');
      } else if ((this.save.inventory.copper ?? 0) >= cost && (this.save.inventory.wood ?? 0) >= 4) {
        this.save.inventory.copper -= cost;
        this.save.inventory.wood -= 4;
        this.save.progress.tier += 1;
        this.audio.play('pickup');
        this.callbacks.onToast(`Werkzeugstufe ${this.save.progress.tier} geschmiedet`);
      } else {
        this.callbacks.onToast(`Benötigt: ${cost} Kupfer und 4 Holz`);
      }
      this.emitHud();
      return;
    }
    if (action === 'boss') {
      this.dialogOpen = false;
      this.callbacks.onDialogue(null);
      this.summonBoss();
    }
  }

  touchControl(control: string, active: boolean): void {
    const keyMap: Record<string, string> = { left: 'KeyA', right: 'KeyD', jump: 'Space', down: 'KeyS' };
    const key = keyMap[control];
    if (key) {
      if (active) this.input.keys.add(key);
      else this.input.keys.delete(key);
    }
    if (control === 'mine') {
      if (active) this.input.keys.add('_touchMine');
      else this.input.keys.delete('_touchMine');
    }
    if (!active) return;
    if (control === 'place') this.placeFacingBlock();
    if (control === 'attack') this.attackFacing();
  }

  private loop = (time: number): void => {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.033);
    this.lastTime = time;
    this.update(dt);
    this.render();
    this.input.pressed.clear();
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.dialogOpen) {
      this.player.vx *= 0.75;
      this.updateCamera(dt);
      return;
    }
    this.save.time = (this.save.time + dt / CONFIG.dayLength) % 1;
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.player.swing = Math.max(0, this.player.swing - dt * 4.6);
    this.shake = Math.max(0, this.shake - dt * 18);
    this.handlePlayerInput(dt);
    this.updateEntities(dt);
    this.updateParticles(dt);
    this.updateCamera(dt);
    this.handleActions(dt);
    this.checkProgression();
    this.autosaveTimer += dt * 1000;
    if (this.autosaveTimer >= CONFIG.autosaveMs) {
      this.autosaveTimer = 0;
      this.persist();
    }
    this.emitHud();
  }

  private handlePlayerInput(dt: number): void {
    const left = this.input.keys.has('KeyA');
    const right = this.input.keys.has('KeyD');
    const up = this.input.keys.has('KeyW') || this.input.keys.has('Space');
    const down = this.input.keys.has('KeyS');
    const direction = Number(right) - Number(left);
    if (direction !== 0) this.player.facing = direction as -1 | 1;

    if (this.save.mode === 'creative') {
      this.player.vx += (direction * CONFIG.flySpeed - this.player.vx) * Math.min(1, dt * 10);
      const vertical = Number(down) - Number(up);
      this.player.vy += (vertical * CONFIG.flySpeed - this.player.vy) * Math.min(1, dt * 10);
      if (!vertical) this.player.vy *= Math.pow(0.02, dt);
      this.moveActor(this.player, dt, false);
    } else {
      this.player.vx += (direction * CONFIG.playerSpeed - this.player.vx) * Math.min(1, dt * (this.player.grounded ? 13 : 5));
      if (!direction && this.player.grounded) this.player.vx *= Math.pow(0.001, dt);
      if (up && this.player.grounded && !this.input.keys.has('_jumpLatch')) {
        this.player.vy = -CONFIG.jumpSpeed;
        this.player.grounded = false;
        this.input.keys.add('_jumpLatch');
        this.audio.play('jump');
      }
      if (!up) this.input.keys.delete('_jumpLatch');
      this.player.vy += CONFIG.gravity * dt;
      this.moveActor(this.player, dt, true);
    }

    if (Math.abs(this.player.vx) > 20 && this.player.grounded) this.player.walk += dt * Math.abs(this.player.vx) * 0.055;
    if (this.player.y > CONFIG.worldBottom * CONFIG.tileSize + 200) this.respawn();
  }

  private moveActor(actor: PlayerState | Entity, dt: number, collide: boolean): void {
    actor.x += actor.vx * dt;
    if (collide) this.resolveAxis(actor, 'x');
    actor.y += actor.vy * dt;
    actor.grounded = false;
    if (collide) this.resolveAxis(actor, 'y');
  }

  private resolveAxis(actor: PlayerState | Entity, axis: 'x' | 'y'): void {
    const size = CONFIG.tileSize;
    const left = Math.floor(actor.x / size);
    const right = Math.floor((actor.x + actor.width - 1) / size);
    const top = Math.floor(actor.y / size);
    const bottom = Math.floor((actor.y + actor.height - 1) / size);
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        if (!this.world.isSolid(x, y)) continue;
        if (axis === 'x') {
          if (actor.vx > 0) actor.x = x * size - actor.width;
          else if (actor.vx < 0) actor.x = (x + 1) * size;
          actor.vx = 0;
        } else {
          if (actor.vy > 0) {
            actor.y = y * size - actor.height;
            actor.grounded = true;
          } else if (actor.vy < 0) actor.y = (y + 1) * size;
          actor.vy = 0;
        }
      }
    }
  }

  private handleActions(dt: number): void {
    for (let i = 0; i < HOTBAR_ITEMS.length; i += 1) {
      if (this.input.pressed.has(`Digit${i + 1}`)) this.selectSlot(i);
    }
    if (this.input.pressed.has('KeyC')) this.toggleMode();
    if (this.input.pressed.has('KeyP')) this.togglePvp();
    if (this.input.pressed.has('KeyB')) this.summonBoss();
    if (this.input.pressed.has('Escape')) this.callbacks.onPause();
    if (this.input.pressed.has('KeyE')) this.talkToNearestNpc();
    if (this.input.pressed.has('KeyF')) this.attackFacing();

    const hoveredEntity = this.findEntityAt(this.input.mouseWorld.x, this.input.mouseWorld.y);
    const touchMine = this.input.keys.has('_touchMine');
    if (this.input.left && hoveredEntity && !this.attackLatch) {
      this.attackEntity(hoveredEntity);
      this.attackLatch = true;
      this.breakState = null;
    } else if (this.input.left && !hoveredEntity) {
      this.updateBreaking(dt);
    } else if (touchMine) {
      const target = {
        x: this.player.x + this.player.width / 2 + this.player.facing * 50,
        y: this.player.y + this.player.height / 2,
      };
      this.updateBreaking(dt, target);
    } else if (!this.input.left) {
      this.breakState = null;
      this.attackLatch = false;
    }

    if (this.input.right && !this.placeLatch) {
      this.placeAtMouse();
      this.placeLatch = true;
    }
    if (!this.input.right) this.placeLatch = false;
  }

  private updateBreaking(dt: number, target = this.input.mouseWorld): void {
    const tx = Math.floor(target.x / CONFIG.tileSize);
    const ty = Math.floor(target.y / CONFIG.tileSize);
    const block = this.world.get(tx, ty);
    if (!block || !this.inReach(tx, ty) || !isBreakable(block)) {
      this.breakState = null;
      return;
    }
    if (this.save.mode === 'creative') {
      this.breakBlock(tx, ty, block);
      return;
    }
    if (!this.breakState || this.breakState.x !== tx || this.breakState.y !== ty) {
      this.breakState = { x: tx, y: ty, progress: 0, block };
    }
    const selected = HOTBAR_ITEMS[this.save.selectedSlot];
    const required = BLOCKS[block].tool;
    const correct = selected === required || required === 'any';
    const tierBoost = 1 + (this.save.progress.tier - 1) * 0.55;
    const speed = (correct ? 1.25 : 0.42) * tierBoost;
    this.breakState.progress += (dt * speed) / BLOCKS[block].hardness;
    this.player.swing = 0.35 + (Math.sin(performance.now() * 0.012) + 1) * 0.25;
    if (Math.floor(this.breakState.progress * 8) !== Math.floor((this.breakState.progress - dt * speed) * 8)) this.audio.play('mine');
    if (this.breakState.progress >= 1) {
      this.breakBlock(tx, ty, block);
      this.breakState = null;
    }
  }

  private breakBlock(x: number, y: number, block: BlockType): void {
    this.world.set(x, y, null);
    if (this.save.mode === 'survival') {
      const drop = BLOCKS[block].drop;
      this.save.inventory[drop] = (this.save.inventory[drop] ?? 0) + 1;
      if (drop === 'wood') this.save.progress.woodMined += 1;
      if (drop === 'copper') this.save.progress.copperMined += 1;
      if (drop === 'crystal') this.save.progress.crystalsMined += 1;
    }
    this.spawnBlockParticles(x, y, BLOCKS[block].color);
    this.audio.play('mine');
  }

  private placeAtMouse(): void {
    const tx = Math.floor(this.input.mouseWorld.x / CONFIG.tileSize);
    const ty = Math.floor(this.input.mouseWorld.y / CONFIG.tileSize);
    this.placeBlock(tx, ty);
  }

  private placeFacingBlock(): void {
    const tx = Math.floor((this.player.x + this.player.width / 2 + this.player.facing * 48) / CONFIG.tileSize);
    const ty = Math.floor((this.player.y + this.player.height * 0.55) / CONFIG.tileSize);
    this.placeBlock(tx, ty);
  }

  private placeBlock(tx: number, ty: number): void {
    const selected = HOTBAR_ITEMS[this.save.selectedSlot];
    if (TOOLS.has(selected) || selected === 'bedrock' || !this.inReach(tx, ty) || this.world.get(tx, ty)) return;
    if (!this.hasSolidNeighbor(tx, ty)) {
      this.callbacks.onToast('Blöcke brauchen eine feste Nachbarfläche.');
      return;
    }
    const block = selected as BlockType;
    const rect = { x: tx * CONFIG.tileSize, y: ty * CONFIG.tileSize, width: CONFIG.tileSize, height: CONFIG.tileSize };
    if (this.overlaps(this.player, rect)) return;
    if (this.save.mode === 'survival' && (this.save.inventory[selected] ?? 0) <= 0) {
      this.callbacks.onToast(`${ITEM_NAMES[selected]} ist leer.`);
      return;
    }
    this.world.set(tx, ty, block);
    if (this.save.mode === 'survival') this.save.inventory[selected] -= 1;
    this.audio.play('place');
  }

  private hasSolidNeighbor(x: number, y: number): boolean {
    return this.world.get(x - 1, y) !== null || this.world.get(x + 1, y) !== null || this.world.get(x, y - 1) !== null || this.world.get(x, y + 1) !== null;
  }

  private inReach(tx: number, ty: number): boolean {
    if (this.save.mode === 'creative') return true;
    const dx = tx * CONFIG.tileSize + 16 - (this.player.x + this.player.width / 2);
    const dy = ty * CONFIG.tileSize + 16 - (this.player.y + this.player.height / 2);
    return Math.hypot(dx, dy) <= CONFIG.reach;
  }

  private attackFacing(): void {
    const centerX = this.player.x + this.player.width / 2 + this.player.facing * 48;
    const centerY = this.player.y + this.player.height / 2;
    const target = this.entities
      .filter((entity) => !['guide', 'smith', 'projectile'].includes(entity.type))
      .find((entity) => Math.abs(entity.x + entity.width / 2 - centerX) < 60 && Math.abs(entity.y + entity.height / 2 - centerY) < 56);
    if (target) this.attackEntity(target);
    else {
      this.player.swing = 1;
      this.audio.play('hit');
    }
  }

  private attackEntity(entity: Entity): void {
    const selected = HOTBAR_ITEMS[this.save.selectedSlot];
    const base = selected === 'sword' ? 22 : selected === 'axe' ? 10 : 6;
    const damage = this.save.mode === 'creative' ? 999 : Math.round(base * (0.75 + this.save.progress.tier * 0.35));
    entity.health -= damage;
    entity.hurt = 0.22;
    entity.vx += this.player.facing * 190;
    this.player.swing = 1;
    this.shake = entity.type === 'warden' ? 5 : 2;
    this.addText(entity.x, entity.y, `${damage}`, '#f3d287');
    this.audio.play('hit');
    if (entity.health <= 0) this.killEntity(entity);
  }

  private updateEntities(dt: number): void {
    this.spawnTimer -= dt;
    const hostileCount = this.entities.filter((entity) => ['slime', 'crawler', 'shade'].includes(entity.type)).length;
    if (this.spawnTimer <= 0 && hostileCount < CONFIG.maxMonsters) {
      this.spawnTimer = 2.2 + Math.random() * 2.8;
      this.trySpawnMonster();
    }

    for (const entity of [...this.entities]) {
      entity.cooldown = Math.max(0, entity.cooldown - dt);
      entity.hurt = Math.max(0, entity.hurt - dt);
      if (entity.type === 'guide' || entity.type === 'smith') continue;
      if (entity.type === 'projectile') {
        entity.x += entity.vx * dt;
        entity.y += entity.vy * dt;
        entity.phase -= dt;
        if (this.overlaps(entity, this.player)) {
          this.damagePlayer(entity.damage, entity.vx > 0 ? 1 : -1);
          this.entities = this.entities.filter((item) => item !== entity);
        } else if (entity.phase <= 0 || this.world.isSolid(Math.floor(entity.x / 32), Math.floor(entity.y / 32))) {
          this.entities = this.entities.filter((item) => item !== entity);
        }
        continue;
      }
      if (entity.type === 'rival') {
        this.updateRival(entity, dt);
        continue;
      }
      if (entity.type === 'warden') {
        this.updateWarden(entity, dt);
        continue;
      }
      const dx = this.player.x - entity.x;
      entity.facing = dx < 0 ? -1 : 1;
      if (entity.type === 'shade') {
        entity.vx += (entity.facing * 105 - entity.vx) * Math.min(1, dt * 3);
        entity.vy += ((this.player.y - 35) - entity.y) * dt * 2.2;
        entity.vy *= Math.pow(0.08, dt);
        this.moveActor(entity, dt, false);
      } else {
        const speed = entity.type === 'crawler' ? 135 : 82;
        entity.vx += (entity.facing * speed - entity.vx) * Math.min(1, dt * 4);
        if (entity.grounded && (Math.random() < dt * 0.8 || Math.abs(dx) < 100)) entity.vy = entity.type === 'slime' ? -350 : -265;
        entity.vy += CONFIG.gravity * dt;
        this.moveActor(entity, dt, true);
      }
      if (this.overlaps(entity, this.player) && entity.cooldown <= 0) {
        this.damagePlayer(entity.damage, entity.facing);
        entity.cooldown = 0.8;
      }
      if (Math.abs(entity.x - this.player.x) > 1600 || entity.y > CONFIG.worldBottom * 32 + 300) {
        this.entities = this.entities.filter((item) => item !== entity);
      }
    }
  }

  private updateRival(rival: Entity, dt: number): void {
    const left = this.input.keys.has('ArrowLeft');
    const right = this.input.keys.has('ArrowRight');
    const jump = this.input.keys.has('ArrowUp');
    const direction = Number(right) - Number(left);
    if (direction) rival.facing = direction as -1 | 1;
    rival.vx += (direction * CONFIG.playerSpeed - rival.vx) * Math.min(1, dt * 10);
    if (jump && rival.grounded) rival.vy = -CONFIG.jumpSpeed;
    rival.vy += CONFIG.gravity * dt;
    this.moveActor(rival, dt, true);
    if (this.input.pressed.has('Enter') && rival.cooldown <= 0) {
      rival.cooldown = 0.45;
      rival.phase = 1;
      if (Math.abs(rival.x - this.player.x) < 86 && Math.abs(rival.y - this.player.y) < 64) this.damagePlayer(18, rival.facing);
    }
    rival.phase = Math.max(0, rival.phase - dt * 4.5);
    if (rival.health <= 0) {
      rival.health = rival.maxHealth;
      rival.x = this.player.x + 100;
      rival.y = this.player.y - 20;
      this.callbacks.onToast('Spieler 1 gewinnt die PvP-Runde');
    }
  }

  private updateWarden(boss: Entity, dt: number): void {
    const healthRatio = boss.health / boss.maxHealth;
    const desiredX = this.player.x + Math.sin(performance.now() * 0.0012) * 280;
    const desiredY = this.player.y - (healthRatio < 0.5 ? 170 : 230);
    boss.vx += (desiredX - boss.x) * dt * (healthRatio < 0.5 ? 2.2 : 1.4);
    boss.vy += (desiredY - boss.y) * dt * 1.7;
    boss.vx *= Math.pow(0.025, dt);
    boss.vy *= Math.pow(0.025, dt);
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
    boss.facing = boss.x > this.player.x ? -1 : 1;
    boss.phase += dt;
    const fireRate = healthRatio < 0.5 ? 0.65 : 1.1;
    if (boss.cooldown <= 0) {
      boss.cooldown = fireRate;
      const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
      const count = healthRatio < 0.35 ? 3 : 1;
      for (let i = 0; i < count; i += 1) {
        const spread = (i - (count - 1) / 2) * 0.22;
        const projectile = this.createEntity('projectile', boss.x + boss.width / 2, boss.y + boss.height / 2, 1);
        projectile.width = 14;
        projectile.height = 14;
        projectile.vx = Math.cos(angle + spread) * 310;
        projectile.vy = Math.sin(angle + spread) * 310;
        projectile.damage = healthRatio < 0.5 ? 24 : 17;
        projectile.phase = 4;
        this.entities.push(projectile);
      }
    }
    if (this.overlaps(boss, this.player) && boss.cooldown < 0.25) this.damagePlayer(28, boss.facing);
  }

  private damagePlayer(amount: number, direction: number): void {
    if (this.save.mode === 'creative' || this.player.invulnerable > 0) return;
    this.player.health -= amount;
    this.player.invulnerable = 0.75;
    this.player.vx = direction * 240;
    this.player.vy = -210;
    this.shake = 9;
    this.addText(this.player.x, this.player.y, `-${amount}`, '#e36f5d');
    this.audio.play('hit');
    if (this.player.health <= 0) this.respawn();
  }

  private respawn(): void {
    this.player.x = 0;
    this.player.y = (this.world.surfaceAt(0) - 3) * CONFIG.tileSize;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.health = this.player.maxHealth;
    this.player.invulnerable = 2;
    for (const resource of ['stone', 'wood', 'copper', 'crystal']) this.save.inventory[resource] = Math.floor((this.save.inventory[resource] ?? 0) * 0.9);
    this.callbacks.onToast('Du wurdest am Dorfbrunnen wiederbelebt. 10% Rohstoffe gingen verloren.');
  }

  private trySpawnMonster(): void {
    const direction = Math.random() < 0.5 ? -1 : 1;
    const x = Math.floor(this.player.x / 32) + direction * (16 + Math.floor(Math.random() * 14));
    if (x > CONFIG.villageLeft - 3 && x < CONFIG.villageRight + 3) return;
    const playerDepth = Math.floor(this.player.y / 32) - this.world.surfaceAt(Math.floor(this.player.x / 32));
    const isNight = this.save.time > 0.68 || this.save.time < 0.14;
    if (!isNight && playerDepth < 6) return;
    let y = this.world.surfaceAt(x) - 2;
    if (playerDepth > 8) y = Math.floor(this.player.y / 32) - 4 + Math.floor(Math.random() * 8);
    for (let scan = 0; scan < 18; scan += 1) {
      if (!this.world.isSolid(x, y + 1) || this.world.isSolid(x, y)) y += 1;
      else break;
    }
    const roll = Math.random();
    const type = playerDepth > 20 && roll > 0.58 ? 'shade' : roll > 0.55 ? 'crawler' : 'slime';
    const health = type === 'slime' ? 38 : type === 'crawler' ? 55 : 72;
    this.entities.push(this.createEntity(type, x * 32, y * 32 - 30, health));
  }

  private spawnWarden(): void {
    const boss = this.createEntity('warden', this.player.x + 420, this.player.y - 280, 720);
    boss.width = 94;
    boss.height = 76;
    boss.damage = 28;
    this.entities.push(boss);
    this.audio.play('boss');
    this.shake = 16;
    this.callbacks.onToast('Der Tiefenwächter ist erwacht.');
  }

  private createEntity(type: Entity['type'], x: number, y: number, health: number): Entity {
    const dimensions: Record<string, [number, number]> = {
      slime: [34, 25], crawler: [42, 24], shade: [30, 42], warden: [94, 76], guide: [22, 50], smith: [24, 52], rival: [22, 52], projectile: [14, 14],
    };
    const [width, height] = dimensions[type];
    return {
      id: this.entityId++, type, x, y, vx: 0, vy: 0, width, height, health, maxHealth: health,
      damage: type === 'slime' ? 12 : type === 'crawler' ? 16 : type === 'shade' ? 20 : 0,
      grounded: false, facing: -1, cooldown: 0, hurt: 0, phase: 0,
    };
  }

  private killEntity(entity: Entity): void {
    this.entities = this.entities.filter((item) => item !== entity);
    for (let i = 0; i < 14; i += 1) this.spawnParticle(entity.x + entity.width / 2, entity.y + entity.height / 2, entity.type === 'warden' ? '#75b5a8' : '#7f9b66');
    if (entity.type === 'rival') {
      this.callbacks.onToast('Spieler 1 gewinnt die PvP-Runde');
      setTimeout(() => this.togglePvp(), 700);
      return;
    }
    this.save.progress.monstersSlain += 1;
    if (entity.type === 'warden') {
      this.save.progress.bossDefeated = true;
      this.save.inventory.crystal = (this.save.inventory.crystal ?? 0) + 12;
      this.player.maxHealth = 120;
      this.player.health = 120;
      this.callbacks.onToast('Tiefenwächter besiegt. Maximale Lebenskraft erhöht.');
    } else {
      if (Math.random() < 0.55) this.save.inventory.coal = (this.save.inventory.coal ?? 0) + 1;
      if (Math.random() < 0.18) this.save.inventory.torch = (this.save.inventory.torch ?? 0) + 1;
    }
  }

  private setupNpcs(): void {
    const groundY = CONFIG.surfaceBase * CONFIG.tileSize;
    const guide = this.createEntity('guide', -28, groundY - 52, 999);
    guide.label = 'Mira';
    const smith = this.createEntity('smith', 9 * 32, groundY - 53, 999);
    smith.label = 'Bram';
    this.entities.push(guide, smith);
  }

  private talkToNearestNpc(): void {
    const npc = this.entities
      .filter((entity) => entity.type === 'guide' || entity.type === 'smith')
      .find((entity) => Math.abs(entity.x - this.player.x) < 100 && Math.abs(entity.y - this.player.y) < 90);
    if (!npc) {
      this.callbacks.onToast('Kein Dorfbewohner in Reichweite.');
      return;
    }
    this.dialogOpen = true;
    if (npc.type === 'guide') {
      this.callbacks.onDialogue({
        speaker: 'Mira, Kundschafterin',
        text: this.save.progress.bossDefeated
          ? 'Du hast die Tiefe bezwungen. Hinter jedem Horizont wartet eine neue, prozedural erzeugte Wildnis auf dich.'
          : 'Willkommen in Tiefenruh. Unter uns verzweigt sich ein endloses Höhlennetz. Sammle zuerst Holz, dann Kupfer. Bram verbessert daraus deine Werkzeuge.',
        choices: [{ label: 'Wie spiele ich?', action: 'guide-more' }, { label: 'Bis später', action: 'close' }],
      });
    } else {
      this.callbacks.onDialogue({
        speaker: 'Bram, Schmied',
        text: `Deine Werkzeuge sind Stufe ${this.save.progress.tier}. Eine bessere Legierung arbeitet schneller und trifft härter. Der Tiefenwächter reagiert auf drei Kristalle.`,
        choices: [
          { label: 'Werkzeuge schmieden', action: 'forge' },
          { label: 'Wächter rufen', action: 'boss' },
          { label: 'Schließen', action: 'close' },
        ],
      });
    }
  }

  private checkProgression(): void {
    const milestones: Array<[string, boolean, string]> = [
      ['wood', this.save.progress.woodMined >= 1, 'Erster Rohstoff: Holz. Sammle 8 Kupfer für Bram.'],
      ['copper', this.save.progress.copperMined >= 1, 'Kupfer gefunden. Acht Stück genügen für die erste Legierung.'],
      ['crystal', this.save.progress.crystalsMined >= 1, 'Tiefenkristall geborgen. Drei davon erwecken den Wächter.'],
    ];
    for (const [key, reached, message] of milestones) {
      if (!reached || this.announced.has(key)) continue;
      this.announced.add(key);
      this.callbacks.onToast(message);
    }
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 500 * dt;
    }
    for (let i = this.particles.length - 1; i >= 0; i -= 1) if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    for (const text of this.texts) {
      text.life -= dt;
      text.y -= 30 * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i -= 1) if (this.texts[i].life <= 0) this.texts.splice(i, 1);
  }

  private updateCamera(dt: number): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const targetX = this.player.x + this.player.width / 2 - width / 2;
    const targetY = this.player.y + this.player.height / 2 - height * 0.52;
    const smoothing = 1 - Math.pow(0.0008, dt);
    this.camera.x += (targetX - this.camera.x) * smoothing;
    this.camera.y += (targetY - this.camera.y) * smoothing;
    this.input.mouseWorld.x = this.input.mouse.x + this.camera.x;
    this.input.mouseWorld.y = this.input.mouse.y + this.camera.y;
  }

  private render(): void {
    const ctx = this.ctx;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const shakeX = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackground(width, height);
    ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);
    this.drawWorld(width, height);
    this.drawEntities();
    this.drawPlayer(this.player, false);
    this.drawParticles();
    this.drawTarget();
    ctx.restore();
    this.drawAtmosphere(width, height);
  }

  private drawBackground(width: number, height: number): void {
    const ctx = this.ctx;
    const daylight = this.daylight();
    const sky = this.mixColor(CONFIG.colors.skyNight, CONFIG.colors.skyDay, daylight);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const sunAngle = this.save.time * Math.PI * 2 - Math.PI;
    const celestialX = width * 0.5 + Math.cos(sunAngle) * width * 0.42;
    const celestialY = height * 0.82 + Math.sin(sunAngle) * height * 0.64;
    ctx.fillStyle = daylight > 0.3 ? '#f0d58b' : '#dce2d4';
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, daylight > 0.3 ? 25 : 18, 0, Math.PI * 2);
    ctx.fill();
    if (daylight < 0.38) {
      ctx.fillStyle = `rgba(231, 235, 218, ${0.8 - daylight})`;
      for (let i = 0; i < 65; i += 1) {
        const x = hash2(i, 2, this.save.seed) * width;
        const y = hash2(i, 3, this.save.seed) * height * 0.68;
        const size = 1 + hash2(i, 4, this.save.seed) * 1.4;
        ctx.fillRect(x, y, size, size);
      }
    }
    const base = height * 0.72 - this.camera.y * 0.04;
    this.drawMountainLayer(base, width, '#3f6564', 0.08, 170);
    this.drawMountainLayer(base + 55, width, '#314e4d', 0.15, 125);
    this.drawMountainLayer(base + 105, width, '#263c3b', 0.23, 95);
  }

  private drawMountainLayer(base: number, width: number, color: string, parallax: number, step: number): void {
    const ctx = this.ctx;
    const offset = ((-this.camera.x * parallax) % step + step) % step;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, this.canvas.clientHeight);
    ctx.lineTo(0, base);
    for (let x = -step + offset; x <= width + step; x += step) {
      const worldIndex = Math.floor((x + this.camera.x * parallax) / step);
      const peak = 35 + hash2(worldIndex, Math.round(parallax * 100), this.save.seed) * 95;
      ctx.lineTo(x + step * 0.52, base - peak);
      ctx.lineTo(x + step, base + 8);
    }
    ctx.lineTo(width, this.canvas.clientHeight);
    ctx.closePath();
    ctx.fill();
  }

  private drawWorld(width: number, height: number): void {
    const size = CONFIG.tileSize;
    const startX = Math.floor(this.camera.x / size) - 2;
    const endX = Math.ceil((this.camera.x + width) / size) + 2;
    const startY = Math.max(-12, Math.floor(this.camera.y / size) - 2);
    const endY = Math.min(CONFIG.worldBottom, Math.ceil((this.camera.y + height) / size) + 2);
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const block = this.world.get(x, y);
        if (!block) continue;
        const texture = this.getTexture(block, Math.floor(hash2(x, y, this.save.seed) * 3));
        this.ctx.drawImage(texture, x * size, y * size, size, size);
        if (block !== 'torch') this.drawTileEdges(x, y);
      }
    }
    this.drawTorches(startX, endX, startY, endY);
    if (this.breakState) this.drawCracks(this.breakState);
  }

  private getTexture(block: BlockType, variant: number): HTMLCanvasElement {
    const key = `${block}-${variant}`;
    const cached = this.textures.get(key);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const color = BLOCKS[block].color;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 32, 32);
    const seed = variant * 271 + block.length * 41;
    if (block === 'grass') {
      ctx.fillStyle = '#3e603f';
      ctx.fillRect(0, 0, 32, 7);
      ctx.fillStyle = '#6f9958';
      for (let x = 1; x < 32; x += 4) ctx.fillRect(x, 0, 2, 4 + Math.floor(hash2(x, variant, seed) * 5));
      ctx.fillStyle = '#674530';
      ctx.fillRect(0, 9, 32, 23);
    } else if (block === 'stone' || block === 'bedrock') {
      ctx.strokeStyle = block === 'bedrock' ? '#17191a' : '#454b4f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 10 + variant * 2); ctx.lineTo(11, 8); ctx.lineTo(17, 18); ctx.lineTo(32, 14);
      ctx.moveTo(7, 32); ctx.lineTo(10, 22); ctx.lineTo(20, 20); ctx.lineTo(26, 32);
      ctx.stroke();
    } else if (block === 'wood') {
      ctx.fillStyle = '#5b3e2e';
      ctx.fillRect(5, 0, 3, 32); ctx.fillRect(22, 0, 2, 32);
      ctx.strokeStyle = '#9a6b48'; ctx.strokeRect(1, 1, 30, 30);
    } else if (block === 'plank') {
      ctx.strokeStyle = '#6b472f'; ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 32, 16); ctx.strokeRect(-8, 16, 32, 16); ctx.strokeRect(24, 16, 16, 16);
      ctx.fillStyle = '#d1a268'; ctx.fillRect(5 + variant * 4, 5, 3, 2); ctx.fillRect(20, 23, 3, 2);
    } else if (block === 'leaves') {
      ctx.clearRect(0, 0, 32, 32);
      ctx.fillStyle = '#2f5139'; ctx.fillRect(3, 5, 25, 23);
      ctx.fillStyle = '#527b4b'; ctx.fillRect(0, 10, 12, 12); ctx.fillRect(14, 1, 12, 14); ctx.fillRect(19, 19, 13, 11);
      ctx.fillStyle = '#6d9155'; ctx.fillRect(7, 6, 5, 4); ctx.fillRect(21, 14, 4, 5);
    } else if (block === 'torch') {
      ctx.clearRect(0, 0, 32, 32);
      ctx.fillStyle = '#6c452b'; ctx.fillRect(14, 13, 4, 17);
      ctx.fillStyle = '#f3c45f'; ctx.fillRect(11, 5, 10, 11);
      ctx.fillStyle = '#fff0a2'; ctx.fillRect(14, 7, 4, 6);
    } else if (block === 'copper' || block === 'coal' || block === 'crystal') {
      ctx.fillStyle = '#51585b'; ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = color;
      for (let i = 0; i < 5; i += 1) {
        const x = 3 + Math.floor(hash2(i, variant, seed) * 23);
        const y = 3 + Math.floor(hash2(i, variant + 9, seed) * 23);
        ctx.fillRect(x, y, block === 'crystal' ? 5 : 7, block === 'crystal' ? 9 : 5);
      }
      if (block === 'crystal') { ctx.fillStyle = '#9bd2c4'; ctx.fillRect(12, 5, 2, 6); }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      for (let i = 0; i < 9; i += 1) ctx.fillRect(hash2(i, variant, seed) * 30, hash2(i, variant + 1, seed) * 30, 2, 2);
    }
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(0, 0, 32, 2);
    ctx.fillStyle = 'rgba(0,0,0,.13)'; ctx.fillRect(0, 30, 32, 2); ctx.fillRect(30, 0, 2, 32);
    this.textures.set(key, canvas);
    return canvas;
  }

  private drawTileEdges(x: number, y: number): void {
    const ctx = this.ctx;
    const px = x * 32;
    const py = y * 32;
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    if (!this.world.get(x + 1, y)) ctx.fillRect(px + 28, py, 4, 32);
    if (!this.world.get(x, y + 1)) ctx.fillRect(px, py + 28, 32, 4);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    if (!this.world.get(x, y - 1)) ctx.fillRect(px, py, 32, 3);
  }

  private drawTorches(startX: number, endX: number, startY: number, endY: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        if (this.world.get(x, y) !== 'torch') continue;
        const cx = x * 32 + 16;
        const cy = y * 32 + 13;
        for (let radius = 128; radius >= 24; radius -= 22) {
          ctx.fillStyle = `rgba(225, 166, 77, ${0.012 + (128 - radius) * 0.00009})`;
          ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  private drawCracks(state: BreakState): void {
    const ctx = this.ctx;
    const x = state.x * 32;
    const y = state.y * 32;
    const stage = Math.max(1, Math.floor(state.progress * 7));
    ctx.strokeStyle = `rgba(20,15,12,${0.45 + state.progress * 0.5})`;
    ctx.lineWidth = 1.5 + state.progress * 1.8;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 15);
    for (let arm = 0; arm < stage; arm += 1) {
      const angle = (arm / stage) * Math.PI * 2 + 0.4;
      ctx.moveTo(x + 16, y + 15);
      ctx.lineTo(x + 16 + Math.cos(angle) * (8 + stage * 1.5), y + 15 + Math.sin(angle) * (8 + stage * 1.5));
      if (stage > 3) ctx.lineTo(x + 16 + Math.cos(angle + 0.2) * 15, y + 15 + Math.sin(angle + 0.2) * 15);
    }
    ctx.stroke();
  }

  private drawEntities(): void {
    for (const entity of this.entities) {
      if (entity.type === 'guide' || entity.type === 'smith' || entity.type === 'rival') {
        this.drawHumanoid(entity);
      } else if (entity.type === 'slime') {
        const squash = entity.grounded ? 1 + Math.sin(performance.now() * 0.008 + entity.id) * 0.07 : 0.88;
        this.ctx.fillStyle = entity.hurt ? '#d7c278' : '#63844e';
        this.ctx.fillRect(entity.x, entity.y + entity.height * (1 - squash), entity.width, entity.height * squash);
        this.ctx.fillStyle = '#23302a'; this.ctx.fillRect(entity.x + 8, entity.y + 8, 4, 5); this.ctx.fillRect(entity.x + 23, entity.y + 8, 4, 5);
      } else if (entity.type === 'crawler') {
        this.ctx.strokeStyle = '#2a2927'; this.ctx.lineWidth = 4;
        for (let i = 0; i < 4; i += 1) { this.ctx.beginPath(); this.ctx.moveTo(entity.x + 8 + i * 8, entity.y + 15); this.ctx.lineTo(entity.x + i * 11, entity.y + 29); this.ctx.stroke(); }
        this.ctx.fillStyle = entity.hurt ? '#e0b275' : '#704b3e'; this.ctx.fillRect(entity.x + 5, entity.y + 5, 32, 18);
        this.ctx.fillStyle = '#d1a85b'; this.ctx.fillRect(entity.x + (entity.facing > 0 ? 30 : 9), entity.y + 9, 4, 4);
      } else if (entity.type === 'shade') {
        this.ctx.fillStyle = entity.hurt ? '#d5c383' : '#273f43';
        this.ctx.beginPath(); this.ctx.moveTo(entity.x + 15, entity.y); this.ctx.lineTo(entity.x + 30, entity.y + 35); this.ctx.lineTo(entity.x + 21, entity.y + 30); this.ctx.lineTo(entity.x + 15, entity.y + 42); this.ctx.lineTo(entity.x + 7, entity.y + 30); this.ctx.lineTo(entity.x, entity.y + 35); this.ctx.closePath(); this.ctx.fill();
        this.ctx.fillStyle = '#d1a85b'; this.ctx.fillRect(entity.x + 8, entity.y + 13, 5, 3); this.ctx.fillRect(entity.x + 18, entity.y + 13, 5, 3);
      } else if (entity.type === 'warden') {
        this.drawWarden(entity);
      } else if (entity.type === 'projectile') {
        this.ctx.fillStyle = '#87c5b7'; this.ctx.fillRect(entity.x, entity.y, entity.width, entity.height);
        this.ctx.fillStyle = '#d8efe3'; this.ctx.fillRect(entity.x + 4, entity.y + 4, 6, 6);
      }
      if (entity.label) {
        this.ctx.font = '600 12px Georgia'; this.ctx.textAlign = 'center'; this.ctx.fillStyle = '#f4ecd8';
        this.ctx.fillText(entity.label, entity.x + entity.width / 2, entity.y - 10);
      }
      if (entity.hurt > 0 && !['guide', 'smith'].includes(entity.type)) {
        this.ctx.fillStyle = 'rgba(255,255,255,.28)'; this.ctx.fillRect(entity.x, entity.y, entity.width, entity.height);
      }
    }
  }

  private drawHumanoid(entity: Entity): void {
    const fakePlayer: PlayerState = {
      x: entity.x, y: entity.y, vx: entity.vx, vy: entity.vy, width: entity.width, height: entity.height,
      facing: entity.facing, grounded: entity.grounded, health: entity.health, maxHealth: entity.maxHealth,
      invulnerable: entity.hurt, swing: entity.type === 'rival' ? entity.phase : 0, walk: performance.now() * 0.006,
    };
    const palette = entity.type === 'guide'
      ? { shirt: '#b4a05f', pants: '#475b57', hair: '#453227', skin: '#d4aa7f' }
      : entity.type === 'smith'
        ? { shirt: '#76503f', pants: '#333b3b', hair: '#a6a09a', skin: '#bd8d69' }
        : { shirt: '#92594f', pants: '#374b59', hair: '#c49757', skin: '#d4aa7f' };
    this.drawPlayer(fakePlayer, entity.type === 'rival', palette);
  }

  private drawPlayer(player: PlayerState, rival = false, palette = { shirt: '#587b72', pants: '#384d55', hair: '#5b3927', skin: '#d3a477' }): void {
    const ctx = this.ctx;
    const x = player.x + player.width / 2;
    const y = player.y;
    const walk = Math.sin(player.walk) * (player.grounded ? 6 : 2);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(player.facing, 1);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-13, player.height - 2, 28, 5);
    ctx.strokeStyle = palette.pants; ctx.lineWidth = 7; ctx.lineCap = 'square';
    ctx.beginPath(); ctx.moveTo(-4, 34); ctx.lineTo(-6 + walk, 49); ctx.moveTo(4, 34); ctx.lineTo(7 - walk, 49); ctx.stroke();
    ctx.fillStyle = palette.shirt; ctx.fillRect(-9, 19, 18, 20);
    ctx.fillStyle = palette.skin; ctx.fillRect(-8, 3, 16, 17);
    ctx.fillStyle = palette.hair; ctx.fillRect(-9, 1, 18, 7); ctx.fillRect(-9, 5, 4, 10);
    ctx.fillStyle = '#222b2c'; ctx.fillRect(3, 10, 3, 3);
    const armAngle = player.swing > 0 ? -1.9 + (1 - player.swing) * 2.5 : walk * 0.035;
    ctx.save(); ctx.translate(6, 23); ctx.rotate(armAngle);
    ctx.fillStyle = palette.skin; ctx.fillRect(-3, 0, 6, 17);
    if (player.swing > 0 || rival) {
      ctx.fillStyle = rival ? '#b7bec0' : '#8c6b42'; ctx.fillRect(-2, 13, 4, 22);
      ctx.fillStyle = rival ? '#d4d7d5' : '#aeb9b5'; ctx.fillRect(-8, 31, 16, 5);
    }
    ctx.restore();
    ctx.fillStyle = palette.skin; ctx.fillRect(-11, 22, 5, 16);
    if (player.invulnerable > 0 && Math.floor(performance.now() / 80) % 2) { ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(-11, 1, 22, 49); }
    ctx.restore();
  }

  private drawWarden(entity: Entity): void {
    const ctx = this.ctx;
    const pulse = Math.sin(entity.phase * 5) * 4;
    ctx.save(); ctx.translate(entity.x + entity.width / 2, entity.y + entity.height / 2);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-55, 35, 110, 8);
    ctx.fillStyle = entity.hurt ? '#d9c88d' : '#294c4b';
    ctx.beginPath(); ctx.moveTo(-48, 15); ctx.lineTo(-38, -28); ctx.lineTo(-10, -20); ctx.lineTo(0, -38 - pulse); ctx.lineTo(10, -20); ctx.lineTo(39, -28); ctx.lineTo(48, 15); ctx.lineTo(24, 35); ctx.lineTo(-24, 35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#172c2d'; ctx.fillRect(-29, -8, 58, 37);
    ctx.fillStyle = '#90c9ba'; ctx.fillRect(-17, 2, 10, 8); ctx.fillRect(7, 2, 10, 8);
    ctx.fillStyle = '#d9eadf'; ctx.fillRect(-14, 4, 4, 4); ctx.fillRect(10, 4, 4, 4);
    ctx.strokeStyle = '#658c82'; ctx.lineWidth = 5; ctx.strokeRect(-35, -16, 70, 49);
    ctx.restore();
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.font = '700 16px Georgia';
    for (const text of this.texts) {
      ctx.globalAlpha = Math.min(1, text.life * 2); ctx.fillStyle = text.color; ctx.fillText(text.text, text.x, text.y);
    }
    ctx.globalAlpha = 1;
  }

  private drawTarget(): void {
    const tx = Math.floor(this.input.mouseWorld.x / 32);
    const ty = Math.floor(this.input.mouseWorld.y / 32);
    if (!this.inReach(tx, ty)) return;
    this.ctx.strokeStyle = 'rgba(244,236,216,.7)'; this.ctx.lineWidth = 1;
    this.ctx.strokeRect(tx * 32 + 2, ty * 32 + 2, 28, 28);
  }

  private drawAtmosphere(width: number, height: number): void {
    const ctx = this.ctx;
    const daylight = this.daylight();
    const depth = Math.max(0, this.player.y / 32 - this.world.surfaceAt(Math.floor(this.player.x / 32)));
    const alpha = Math.min(0.73, (1 - daylight) * 0.5 + depth * 0.011);
    if (alpha <= 0.02) return;
    ctx.save();
    ctx.fillStyle = `rgba(6,12,15,${alpha})`; ctx.fillRect(0, 0, width, height);
    const lights: Array<[number, number, number]> = [];
    if ((this.save.inventory.torch ?? 0) > 0 || this.save.mode === 'creative') lights.push([this.player.x + 11 - this.camera.x, this.player.y + 24 - this.camera.y, 135]);
    const startX = Math.floor(this.camera.x / 32) - 1;
    const endX = Math.ceil((this.camera.x + width) / 32) + 1;
    const startY = Math.floor(this.camera.y / 32) - 1;
    const endY = Math.ceil((this.camera.y + height) / 32) + 1;
    for (let y = startY; y <= endY; y += 1) for (let x = startX; x <= endX; x += 1) if (this.world.get(x, y) === 'torch') lights.push([x * 32 + 16 - this.camera.x, y * 32 + 15 - this.camera.y, 155]);
    ctx.globalCompositeOperation = 'destination-out';
    for (const [x, y, maxRadius] of lights) {
      for (let radius = maxRadius; radius > 15; radius -= 16) {
        ctx.fillStyle = `rgba(0,0,0,${0.035 + (maxRadius - radius) * 0.0007})`;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  private daylight(): number {
    const wave = Math.sin((this.save.time - 0.25) * Math.PI * 2);
    return Math.max(0.08, Math.min(1, wave * 0.75 + 0.45));
  }

  private emitHud(): void {
    const boss = this.entities.find((entity) => entity.type === 'warden');
    const depth = Math.max(0, Math.floor(this.player.y / 32) - this.world.surfaceAt(Math.floor(this.player.x / 32)));
    const hour = Math.floor((this.save.time * 24 + 6) % 24);
    const minute = Math.floor(((this.save.time * 24 + 6) % 1) * 60);
    this.callbacks.onHud({
      health: Math.max(0, this.player.health), maxHealth: this.player.maxHealth, mode: this.save.mode,
      inventory: this.save.inventory, selected: this.save.selectedSlot, depth,
      timeLabel: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      quest: this.questText(),
      boss: boss ? { name: 'Tiefenwächter', health: Math.max(0, boss.health), maxHealth: boss.maxHealth } : undefined,
      pvp: this.pvpEnabled, tier: this.save.progress.tier,
    });
  }

  private questText(): string {
    if (this.save.progress.bossDefeated) return 'Die Tiefe ist bezwungen. Erkunde die endlose Welt.';
    if (this.save.progress.tier >= 2 && this.save.progress.crystalsMined >= 3) return 'Rufe den Tiefenwächter mit B oder bei Bram.';
    if (this.save.progress.tier >= 2) return `Finde 3 Tiefenkristalle (${Math.min(3, this.save.progress.crystalsMined)}/3).`;
    if (this.save.progress.copperMined >= 8) return 'Kehre zu Bram zurück und schmiede Werkzeugstufe II.';
    if (this.save.progress.woodMined >= 4) return `Baue Kupfer ab (${Math.min(8, this.save.progress.copperMined)}/8).`;
    return `Sammle Holz (${Math.min(4, this.save.progress.woodMined)}/4) und sprich mit Mira.`;
  }

  private persist(): void {
    this.save.player = { x: this.player.x, y: this.player.y, health: this.player.health, maxHealth: this.player.maxHealth };
    this.save.changes = this.world.serialize();
    this.save.updatedAt = Date.now();
    this.callbacks.onSave(this.save);
  }

  private findEntityAt(x: number, y: number): Entity | undefined {
    return this.entities.find((entity) => !['guide', 'smith', 'projectile'].includes(entity.type) && x >= entity.x - 8 && x <= entity.x + entity.width + 8 && y >= entity.y - 8 && y <= entity.y + entity.height + 8 && this.inReach(Math.floor(entity.x / 32), Math.floor(entity.y / 32)));
  }

  private overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private spawnBlockParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 9; i += 1) this.spawnParticle(x * 32 + 16, y * 32 + 16, color);
  }

  private spawnParticle(x: number, y: number, color: string): void {
    const life = 0.35 + Math.random() * 0.35;
    this.particles.push({ x, y, vx: (Math.random() - 0.5) * 190, vy: -60 - Math.random() * 170, life, maxLife: life, size: 3 + Math.random() * 5, color });
  }

  private addText(x: number, y: number, text: string, color: string): void {
    this.texts.push({ x, y, text, color, life: 0.8 });
  }

  private mixColor(a: string, b: string, amount: number): string {
    const parse = (value: string) => [Number.parseInt(value.slice(1, 3), 16), Number.parseInt(value.slice(3, 5), 16), Number.parseInt(value.slice(5, 7), 16)];
    const aa = parse(a); const bb = parse(b);
    const channels = aa.map((value, index) => Math.round(value + (bb[index] - value) * amount));
    return `rgb(${channels.join(',')})`;
  }

  private bindInput(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private unbindInput(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.input.keys.has(event.code)) this.input.pressed.add(event.code);
    this.input.keys.add(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  };

  private onKeyUp = (event: KeyboardEvent): void => { this.input.keys.delete(event.code); };

  private onPointerMove = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.input.mouse.x = event.clientX - rect.left;
    this.input.mouse.y = event.clientY - rect.top;
    this.input.mouseWorld.x = this.input.mouse.x + this.camera.x;
    this.input.mouseWorld.y = this.input.mouse.y + this.camera.y;
  };

  private onPointerDown = (event: PointerEvent): void => {
    this.onPointerMove(event);
    if (event.button === 0) this.input.left = true;
    if (event.button === 2) this.input.right = true;
    this.canvas.setPointerCapture?.(event.pointerId);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.button === 0) this.input.left = false;
    if (event.button === 2) this.input.right = false;
  };

  private onContextMenu = (event: Event): void => event.preventDefault();

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    this.selectSlot((this.save.selectedSlot + direction + HOTBAR_ITEMS.length) % HOTBAR_ITEMS.length);
  };
}
