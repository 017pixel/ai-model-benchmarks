// ===========================================================================
// BlockForge - Hauptspiel: Loop, Update, Render, Welt-Logik
// ===========================================================================
import { CONFIG, BLOCK, BLOCK_PROPS, ITEM, ITEM_PROPS, PLACEABLE } from '../config.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Camera } from './camera.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { getTextures, getCrack } from './textures.js';
import { saveWorld, loadWorld, hasSave } from './save.js';
import { Slime, Eye, Boss, NPC, Rival, Projectile } from './entities.js';
import { mulberry32 } from './rng.js';

const T = CONFIG.WORLD.TILE;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = new Camera();
    this.input = new Input(canvas);
    this.state = 'menu';
    this.dayTime = 0.2;
    this.frame = 0;
    this.monsters = [];
    this.projectiles = [];
    this.npcs = [];
    this.boss = null;
    this.rival = null;
    this.nearNpc = null;
    this.breakProgress = 0;
    this.breakTile = null;
    this.attackTimer = 0;
    this.toast = '';
    this.toastTimer = 0;
    this.spawnTimer = 0;
    this.stars = [];
    this.clouds = [];
    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.ui = new UI(this.input, {
      onNew: () => this.newGame(),
      onContinue: () => this.continueGame(),
      onResume: () => this.resume(),
      onSave: () => this.save(),
      onToggleMode: () => this.toggleMode(),
      onQuit: () => this.quit(),
    });

    if (this.input._isTouch) this.ui.touchEls && document.querySelector('.bf-touch')?.classList.add('active');

    this._genBackground();
    this.ui.showStart(hasSave());
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.camera.resize(this.W, this.H);
  }

  _genBackground() {
    const r = mulberry32(4242);
    for (let i = 0; i < 120; i++)
      this.stars.push({ x: r(), y: r() * 0.6, s: r() * 1.6 + 0.4, t: r() * 6 });
    for (let i = 0; i < 8; i++)
      this.clouds.push({ x: r(), y: r() * 0.3 + 0.05, s: r() * 0.6 + 0.5, sp: r() * 0.0006 + 0.0002 });
  }

  // ---------- Welt aufbauen ----------
  newGame() {
    const seed = (Math.random() * 1e9) | 0;
    this.world = new World(seed);
    this._spawnPlayer();
    this._buildVillage();
    this.state = 'play';
    this.ui.hide();
  }

  continueGame() {
    const data = loadWorld();
    if (!data) { this.newGame(); return; }
    this.world = new World(data.seed >>> 0);
    this.world.loadMods(data.mods || {});
    this._spawnPlayer(data.player);
    this._buildVillage(true);
    this.state = 'play';
    this.ui.hide();
    this.toast('Welt geladen');
  }

  _spawnPlayer(pd) {
    const groundY = this.world.surfaceAt(0);
    this.player = new Player(0 * T + T / 2 - CONFIG.PLAYER.WIDTH / 2, (groundY - 6) * T);
    if (pd) {
      this.player.x = pd.x; this.player.y = pd.y;
      this.player.health = pd.health;
      this.player.mode = pd.mode;
      this.player.slot = pd.slot || 0;
      if (pd.hotbar) this.player.hotbar = pd.hotbar;
    }
  }

  _buildVillage(skipStructure) {
    this.npcs = [];
    const defs = [
      { x: -18, name: 'Bürgermeister', color: '#4a6fb0', lines: [
        'Willkommen in BlockForge, Reisender! Dies ist unser bescheidenes Dorf.',
        'Bewege dich mit WASD, springe mit der Leertaste. Die Maus gräbt und baut.',
        'Drücke F um zwischen Survival und Creative zu wechseln. In Creative fliegst du!',
        'Komm bald wieder - die Welt wartet auf dich.',
      ] },
      { x: -8, name: 'Händlerin Mira', color: '#b06f9a', lines: [
        'Ich tausche Waren. Im Creative-Modus hast du ohnehin alles im Hotbar.',
        'In Survival musst du Erze abbauen: Kohle, Eisen und Gold tief unten.',
        'Platziere Blöcke mit der rechten Maustaste. Fackeln erhellen die Nacht.',
      ] },
      { x: 6, name: 'Wächterin Solveig', color: '#6f9ab0', lines: [
        'Nachts kommen Monster: Schleime und die schwebenden Augen.',
        'Das rote Auge schießt Projektile - weiche aus!',
        'Der Waldgeist ist unser Boss. Nutze den Boss-Ruf im Hotbar, um ihn zu wecken.',
        'Im PvP (Taste T) beschwörst du einen rivalisierenden Abenteurer.',
      ] },
      { x: 16, name: 'Baumeister Torben', color: '#9ab06f', lines: [
        'Bauen ist die halbe Kunst. Steine, Holz, Glas - alles platziert sich leicht.',
        'Im Creative-Modus bricht jeder Block sofort. In Survival brauchst du Zeit.',
        'Grab dir Höhlen, errichte Türme - die Welt ist unendlich.',
      ] },
    ];
    for (const d of defs) {
      const gy = this.world.surfaceAt(d.x);
      if (!skipStructure) this._buildHouse(d.x - 3, gy);
      const npc = new NPC(d.x * T + T / 2 - 11, gy * T - 46, d.name, d.lines, d.color);
      this.npcs.push(npc);
    }
  }

  _buildHouse(baseTileX, groundTileY) {
    const w = 7, h = 5;
    for (let x = baseTileX; x < baseTileX + w; x++) {
      for (let y = groundTileY; y < groundTileY + h; y++) {
        let type = BLOCK.AIR;
        if (y === groundTileY) type = BLOCK.PLANK;
        else if (x === baseTileX || x === baseTileX + w - 1 || y === groundTileY + h - 1) type = BLOCK.PLANK;
        // Tür
        if (x === baseTileX + 3 && y >= groundTileY && y < groundTileY + 2) type = BLOCK.AIR;
        this.world.setTile(x, y, type);
      }
    }
    this.world.setTile(baseTileX + 1, groundTileY + 1, BLOCK.TORCH);
  }

  // ---------- Steuerung / Zustände ----------
  resume() {
    if (this.player && this.player.dead) { this.player.dead = false; this.player.health = this.player.maxHealth; this.player.respawn(); }
    this.state = 'play'; this.ui.hide();
  }
  quit() { this.state = 'menu'; this.ui.showStart(hasSave()); }
  toggleMode() {
    this.player.setMode(this.player.mode === 'survival' ? 'creative' : 'survival');
    this.toast(this.player.mode === 'creative' ? 'Creative-Modus' : 'Survival-Modus');
  }
  save() {
    const data = {
      seed: this.world.seed,
      mods: this.world.serializeMods(),
      player: {
        x: this.player.x, y: this.player.y, health: this.player.health,
        mode: this.player.mode, slot: this.player.slot, hotbar: this.player.hotbar,
      },
      version: CONFIG.SAVE.VERSION,
    };
    if (saveWorld(data)) this.toast('Welt gespeichert');
  }

  toast(msg) { this.toast = msg; this.toastTimer = 150; }

  // ---------- Hauptschleife ----------
  _loop(ts) {
    const dt = Math.min(2, Math.max(0.4, (ts - (this._last || ts)) / 16.67));
    this._last = ts;
    if (this.state === 'play') this.update(dt);
    this.render();
    this.input.endFrame();
    requestAnimationFrame(this._loop);
  }

  update(dt) {
    this.frame += dt;
    this.dayTime = (this.dayTime + dt / CONFIG.GAMEPLAY.DAY_LENGTH) % 1;
    this.isNight = this.dayTime > 0.78 || this.dayTime < 0.05;

    // Hotbar
    for (let i = 1; i <= 9; i++) if (this.input.wasPressed(String(i))) this.player.slot = i - 1;
    if (this.input.wasPressed('0')) this.player.slot = 9;
    if (this.input.mouse.wheel) {
      this.player.slot = (this.player.slot + this.input.mouse.wheel + 10) % 10;
    }

    // Modus / Pause / PvP
    if (this.input.wasPressed('f')) this.toggleMode();
    if (this.input.wasPressed('p') || this.input.wasPressed('escape')) { this.state = 'pause'; this.ui.showPause(); return; }
    if (this.input.wasPressed('t')) this.toggleRival();

    // NPC-Dialog
    this.nearNpc = null;
    let nearest = 1e9;
    for (const n of this.npcs) {
      const d = Math.hypot(n.cx - this.player.cx, n.cy - this.player.cy);
      if (d < nearest) { nearest = d; this.nearNpc = n; }
    }
    if (this.nearNpc && nearest < 46 && this.input.wasPressed('e')) {
      this.state = 'dialog'; this.ui.showDialog(this.nearNpc); return;
    }

    if (this.toastTimer > 0) this.toastTimer -= dt;

    // Spieler
    this.player.update(this.world, this.input, this.camera, dt, {});

    // Interaktion (Maus)
    this._interact(dt);

    // Entities
    for (const m of this.monsters) m.update(this.world, dt, this.player, (x, y, vx, vy, d) => this.projectiles.push(new Projectile(x, y, vx, vy, d, '#c0556a')));
    for (const n of this.npcs) n.update(this.world, dt);
    if (this.rival) this.rival.update(this.world, dt, this.player, (d) => this.player.damage(d));
    if (this.boss) this.boss.update(this.world, dt, this.player,
      (x, y, vx, vy, d) => this.projectiles.push(new Projectile(x, y, vx, vy, d, '#7d3f33')),
      (x, y) => this.monsters.push(new Slime(x, y)));

    // Projektile
    for (const pr of this.projectiles) {
      pr.update(this.world, dt);
      if (Math.hypot(pr.x - this.player.cx, pr.y - this.player.cy) < 18) { this.player.damage(pr.dmg); pr.dead = true; }
      if (this.boss && !pr.dead && Math.hypot(pr.x - this.boss.cx, pr.y - this.boss.cy) < 50) { this.boss.takeDamage(pr.dmg * 0.4); pr.dead = true; }
    }

    // Monster-Spawn
    this._spawnLogic(dt);

    // Aufräumen
    this.monsters = this.monsters.filter((m) => !m.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    if (this.rival && this.rival.dead) { this.toast('Rivale besiegt!'); this.rival = null; }
    if (this.boss && this.boss.dead) { this.toast('Waldgeist besiegt!'); this.boss = null; }

    if (this.player.dead) { this.state = 'dead'; this.ui.showDeath(); return; }

    // Kamera
    this.camera.follow(this.player.cx, this.player.cy);
  }

  _interact(dt) {
    const p = this.player;
    const m = this.input.mouse;
    if (!m.down && !m.right) { this.breakProgress = 0; this.breakTile = null; return; }

    const w = this.camera.screenToWorld(m.x, m.y);
    const tx = Math.floor(w.x / T), ty = Math.floor(w.y / T);
    const dist = Math.hypot(w.x - p.cx, w.y - p.cy);
    if (dist > CONFIG.PLAYER.REACH * T) return;

    const sel = p.selected;

    // Boss-Ruf
    if (m.rightPressed && sel && sel.id === ITEM.BOSS_SUMMON && !this.boss) {
      this.boss = new Boss(p.cx, p.cy - 220);
      this.boss.active = true;
      this.toast('Der Waldgeist erwacht!');
      return;
    }

    if (m.down) {
      // Angriff auf Monster, wenn kein solider Block anvisiert
      const solid = this.world.isSolid(tx, ty);
      if (!solid) { this._attack(); return; }
      // Abbauen
      this.breakTile = { x: tx, y: ty };
      p.startSwing('mine');
      if (p.mode === 'creative') {
        this._breakBlock(tx, ty);
        this.breakProgress = 0;
      } else {
        const props = BLOCK_PROPS[this.world.getTile(tx, ty)];
        let power = 1;
        if (sel && ITEM_PROPS[sel.id] && ITEM_PROPS[sel.id].type === 'tool') power = ITEM_PROPS[sel.id].power;
        const time = (props.break * 60) / power;
        this.breakProgress += dt / time;
        if (this.breakProgress >= 1) { this._breakBlock(tx, ty); this.breakProgress = 0; }
      }
    } else if (m.rightPressed) {
      // Platzieren
      if (sel && sel.id < 100 && BLOCK_PROPS[sel.id].solid !== undefined) {
        const t = this.world.getTile(tx, ty);
        if (t === BLOCK.AIR || t === BLOCK.WATER) {
          // Platzierung nicht in Spieler
          if (!(tx === Math.floor(p.cx / T) && ty >= Math.floor(p.y / T) && ty <= Math.floor((p.y + p.h) / T))) {
            this.world.setTile(tx, ty, sel.id);
            if (sel.count < 999) sel.count--;
            if (sel.count <= 0) sel.id = 0;
            p.startSwing('mine');
          }
        }
      }
    }
  }

  _breakBlock(tx, ty) {
    const t = this.world.getTile(tx, ty);
    if (t === BLOCK.AIR || t === BLOCK.BEDROCK) return;
    this.world.setTile(tx, ty, BLOCK.AIR);
    const props = BLOCK_PROPS[t];
    const drop = props.drop || t;
    if (drop < 100) this.player.addItem(drop, 1);
  }

  _attack() {
    if (this.attackTimer > 0) return;
    this.attackTimer = this.player.mode === 'creative' ? 10 : 20;
    this.player.startSwing('attack');
    const sel = this.player.selected;
    let dmg = 10;
    if (sel && ITEM_PROPS[sel.id] && ITEM_PROPS[sel.id].type === 'weapon') dmg = ITEM_PROPS[sel.id].dmg;
    const w = this.camera.screenToWorld(this.input.mouse.x, this.input.mouse.y);
    const hit = (ent) => {
      const d = Math.hypot(ent.cx - w.x, ent.cy - w.y);
      if (d < T * 1.8) ent.takeDamage(dmg);
    };
    for (const m of this.monsters) hit(m);
    if (this.boss) hit(this.boss);
    if (this.rival) hit(this.rival);
  }

  _spawnLogic(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = 120;
    if (this.monsters.length >= CONFIG.GAMEPLAY.MONSTER_CAP) return;
    const px = this.player.cx;
    const py = this.player.cy;
    const onSurface = py < this.world.surfaceAt(Math.floor(px / T)) * T + T * 6;
    if (this.isNight && onSurface && Math.random() < 0.6) {
      const side = Math.random() > 0.5 ? 1 : -1;
      this.monsters.push(new Slime(px + side * 360, py - 60));
    } else if (!onSurface && Math.random() < 0.5) {
      // Augen in Höhlen
      const ex = px + (Math.random() > 0.5 ? 200 : -200);
      const ey = this.world.surfaceAt(Math.floor(ex / T)) * T + 40 + Math.random() * 400;
      this.monsters.push(new Eye(ex, ey));
    }
  }

  toggleRival() {
    if (this.rival) { this.toast('Rivale verbannt'); this.rival = null; }
    else {
      this.rival = new Rival(this.player.cx + 200, this.player.cy - 60);
      this.toast('Rivale erscheint! (PvP)');
    }
  }

  // ---------- Render ----------
  render() {
    const ctx = this.ctx;
    this._drawSky(ctx);
    if (!this.world) return;

    const cam = this.camera;
    const x0 = Math.floor(cam.x / T) - 1;
    const x1 = Math.ceil((cam.x + this.W) / T) + 1;
    const y0 = Math.max(0, Math.floor(cam.y / T) - 1);
    const y1 = Math.min(CONFIG.WORLD.WORLD_H, Math.ceil((cam.y + this.H) / T) + 1);

    const tex = getTextures();

    // Hintergrund-Höhlen-Schatten vermeiden: zuerst Boden weit hinten? einfach direkt.
    for (let tx = x0; tx <= x1; tx++) {
      for (let ty = y0; ty <= y1; ty++) {
        const t = this.world.getTile(tx, ty);
        if (t === BLOCK.AIR) continue;
        const s = cam.worldToScreen(tx * T, ty * T);
        ctx.drawImage(tex[t], s.x, s.y, T, T);
        // Bruch-Overlay
        if (this.breakTile && this.breakTile.x === tx && this.breakTile.y === ty && this.breakProgress > 0) {
          ctx.drawImage(getCrack(this.breakProgress), s.x, s.y, T, T);
        }
        // Nacht-Beleuchtung
        if (this.isNight) {
          const b = this._brightness(tx, ty);
          if (b < 1) { ctx.fillStyle = `rgba(6,8,18,${(1 - b).toFixed(3)})`; ctx.fillRect(s.x, s.y, T, T); }
        }
      }
    }

    // Entities
    for (const n of this.npcs) n.draw(ctx, cam);
    for (const m of this.monsters) m.draw(ctx, cam);
    if (this.rival) this.rival.draw(ctx, cam);
    if (this.boss) this.boss.draw(ctx, cam);
    for (const pr of this.projectiles) pr.draw(ctx, cam);
    if (!this.player.dead) this.player.draw(ctx, cam);

    // Ziel-Markierung
    if (this.state === 'play') this._drawTarget(ctx);

    // HUD
    if (this.state === 'play' || this.state === 'pause' || this.state === 'dialog' || this.state === 'dead') {
      this.ui.drawHUD(ctx, this);
    }
  }

  _brightness(tx, ty) {
    const surf = this.world.surfaceAt(tx);
    const depth = ty - surf;
    let base = depth < 0 ? 0.55 : 0.28;
    const torch = this.world.lightAt(tx, ty) / 6;
    return Math.max(0.12, Math.min(1, base + torch * 0.7));
  }

  _drawSky(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    if (this.isNight) {
      g.addColorStop(0, CONFIG.RENDER.NIGHT_TOP);
      g.addColorStop(1, CONFIG.RENDER.NIGHT_BOTTOM);
    } else {
      g.addColorStop(0, CONFIG.RENDER.SKY_TOP);
      g.addColorStop(1, CONFIG.RENDER.SKY_BOTTOM);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);

    if (this.isNight) {
      for (const st of this.stars) {
        const a = 0.4 + 0.6 * Math.abs(Math.sin(this.frame * 0.01 + st.t));
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(st.x * this.W, st.y * this.H, st.s, st.s);
      }
    } else {
      // Sonne position
      const sx = this.dayTime * this.W;
      const sy = this.H * 0.5 - Math.sin(this.dayTime * Math.PI) * this.H * 0.4;
      const sg = ctx.createRadialGradient(sx, sy, 4, sx, sy, 60);
      sg.addColorStop(0, 'rgba(255,236,170,0.9)');
      sg.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(sx, sy, 60, 0, Math.PI * 2); ctx.fill();
    }
    // Wolken
    for (const c of this.clouds) {
      const cx = ((c.x + this.frame * c.sp) % 1.2 - 0.1) * this.W;
      const cy = c.y * this.H;
      ctx.fillStyle = this.isNight ? 'rgba(120,130,160,0.12)' : 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 50 * c.s, 18 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 30 * c.s, cy + 4, 34 * c.s, 14 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawTarget(ctx) {
    const m = this.input.mouse;
    const w = this.camera.screenToWorld(m.x, m.y);
    const tx = Math.floor(w.x / T), ty = Math.floor(w.y / T);
    const s = this.camera.worldToScreen(tx * T, ty * T);
    const dist = Math.hypot(w.x - this.player.cx, w.y - this.player.cy);
    ctx.strokeStyle = dist <= CONFIG.PLAYER.REACH * T ? 'rgba(255,255,255,0.8)' : 'rgba(255,80,80,0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(s.x + 0.5, s.y + 0.5, T - 1, T - 1);
  }
}
