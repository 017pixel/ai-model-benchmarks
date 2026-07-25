// ===========================================================================
// Spieler: Physik, Bewegung, Modi, Inventar, Animationen
// ===========================================================================
import { CONFIG, BLOCK, ITEM, BLOCK_PROPS, ITEM_PROPS, PLACEABLE } from '../config.js';

const P = CONFIG.PLAYER;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.w = P.WIDTH;
    this.h = P.HEIGHT;
    this.onGround = false;
    this.facing = 1; // 1 rechts, -1 links
    this.mode = 'survival'; // 'survival' | 'creative'
    this.health = P.MAX_HEALTH;
    this.maxHealth = P.MAX_HEALTH;
    this.invuln = 0;
    this.walkPhase = 0;
    this.swing = 0; // 0..1 Tool-Swing-Fortschritt
    this.swingType = 'mine';
    this.dead = false;
    this.respawnTimer = 0;
    this.color = '#d9b38c';
    this.skin = '#e7c39b';

    // Hotbar: Blöcke + Werkzeuge
    this.hotbar = [
      { id: ITEM.PICKAXE, count: 1 },
      { id: ITEM.SWORD, count: 1 },
      { id: ITEM.AXE, count: 1 },
      { id: BLOCK.DIRT, count: 99 },
      { id: BLOCK.STONE, count: 99 },
      { id: BLOCK.PLANK, count: 99 },
      { id: BLOCK.LOG, count: 99 },
      { id: BLOCK.LEAVES, count: 99 },
      { id: BLOCK.TORCH, count: 99 },
      { id: ITEM.BOSS_SUMMON, count: 1 },
    ];
    this.slot = 0;
  }

  get selected() { return this.hotbar[this.slot]; }

  addItem(id, count = 1) {
    for (const it of this.hotbar) {
      if (it.id === id && it.count < 999) { it.count = Math.min(999, it.count + count); return true; }
    }
    for (const it of this.hotbar) {
      if (it.id === 0) { it.id = id; it.count = count; return true; }
    }
    return false;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'creative') { this.health = this.maxHealth; this.invuln = 0; }
  }

  damage(amount) {
    if (this.mode === 'creative') return;
    if (this.invuln > 0 || this.dead) return;
    this.health -= amount;
    this.invuln = P.INVULN;
    if (this.health <= 0) { this.health = 0; this.dead = true; this.respawnTimer = 120; }
  }

  heal(a) {
    this.health = Math.min(this.maxHealth, this.health + a);
  }

  startSwing(type) { this.swing = 0.0001; this.swingType = type; }

  update(world, input, camera, dt, env) {
    if (this.dead) {
      this.respawnTimer--;
      if (this.respawnTimer <= 0) {
        this.dead = false;
        this.health = this.maxHealth;
        this.respawn();
      }
      return;
    }
    if (this.invuln > 0) this.invuln--;

    const left = input.isDown('a') || input.isDown('arrowleft') || input.touch.left;
    const right = input.isDown('d') || input.isDown('arrowright') || input.touch.right;
    const up = input.isDown('w') || input.isDown('arrowup') || input.touch.up;
    const down = input.isDown('s') || input.isDown('arrowdown') || input.touch.down;
    const jump = input.wasPressed(' ') || input.wasPressed('arrowup') || input.touch.jump;

    const creative = this.mode === 'creative';

    if (creative) {
      const sp = P.FLY_SPEED;
      this.vx = (right ? sp : 0) - (left ? sp : 0);
      this.vy = (down ? sp : 0) - (up ? sp : 0);
      if (!left && !right) this.vx *= 0.8;
      if (!up && !down) this.vy *= 0.8;
    } else {
      const sp = P.SPEED;
      if (left) { this.vx = -sp; this.facing = -1; }
      else if (right) { this.vx = sp; this.facing = 1; }
      else this.vx *= 0.7;

      this.vy += CONFIG.WORLD.GRAVITY * dt;
      if (this.vy > CONFIG.WORLD.MAX_FALL) this.vy = CONFIG.WORLD.MAX_FALL;
      if (jump && this.onGround) { this.vy = -P.JUMP; this.onGround = false; }
    }

    this.moveAndCollide(world, dt);

    if (Math.abs(this.vx) > 0.3 && this.onGround) this.walkPhase += dt * 0.3;
    else this.walkPhase *= 0.8;

    if (this.swing > 0) {
      this.swing += dt * 0.12;
      if (this.swing >= 1) this.swing = 0;
    }

    // Respawn bei tiefem Fall
    if (this.y > CONFIG.WORLD.WORLD_H * CONFIG.WORLD.TILE + 200) {
      this.damage(9999);
    }
  }

  respawn() {
    this.x = 0;
    this.y = (CONFIG.WORLD.SURFACE - 6) * CONFIG.WORLD.TILE;
    this.vx = this.vy = 0;
  }

  moveAndCollide(world, dt) {
    const T = CONFIG.WORLD.TILE;
    // X
    this.x += this.vx * dt;
    this._collideAxis(world, true, T);
    // Y
    this.y += this.vy * dt;
    this.onGround = false;
    this._collideAxis(world, false, T);
  }

  _collideAxis(world, axisX, T) {
    const left = Math.floor(this.x / T);
    const right = Math.floor((this.x + this.w - 0.01) / T);
    const top = Math.floor(this.y / T);
    const bottom = Math.floor((this.y + this.h - 0.01) / T);
    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (!world.isSolid(tx, ty)) continue;
        if (axisX) {
          if (this.vx > 0) this.x = tx * T - this.w;
          else if (this.vx < 0) this.x = (tx + 1) * T;
          this.vx = 0;
        } else {
          if (this.vy > 0) { this.y = ty * T - this.h; this.onGround = true; }
          else if (this.vy < 0) this.y = (ty + 1) * T;
          this.vy = 0;
        }
      }
    }
  }

  // Pixel-Mittelpunkt
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  draw(ctx, camera) {
    const T = CONFIG.WORLD.TILE;
    const s = camera.worldToScreen(this.x, this.y);
    const bob = Math.sin(this.walkPhase) * (this.onGround ? 1.5 : 0);
    const blink = this.invuln > 0 && Math.floor(this.invuln / 4) % 2 === 0;

    if (CONFIG.RENDER.SHOW_SHADOWS && this.onGround) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(s.x + this.w / 2, s.y + this.h - 2, this.w * 0.55, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (blink) ctx.globalAlpha = 0.4;

    const px = s.x;
    const py = s.y + bob;
    const f = this.facing;
    const u = this.w / 10;

    // Beine (Lauf-Animation)
    const legSwing = Math.sin(this.walkPhase) * 4;
    ctx.fillStyle = '#3a4a6b';
    ctx.fillRect(px + 2, py + this.h - 14, 6, 14 + (this.onGround ? legSwing : 0) * 0);
    ctx.fillRect(px + this.w - 8, py + this.h - 14, 6, 14);
    if (this.onGround) {
      ctx.fillRect(px + 2, py + this.h - 14 + legSwing, 6, 14);
      ctx.fillRect(px + this.w - 8, py + this.h - 14 - legSwing, 6, 14);
    }

    // Körper (Umhang je Modus)
    ctx.fillStyle = this.mode === 'creative' ? '#7a5bd0' : '#4f7a3a';
    ctx.fillRect(px + 1, py + 16, this.w - 2, 18);
    ctx.fillStyle = this.mode === 'creative' ? '#9a7bf0' : '#6f9a4a';
    ctx.fillRect(px + 1, py + 16, this.w - 2, 4);

    // Kopf
    ctx.fillStyle = this.skin;
    ctx.fillRect(px + 2, py, this.w - 4, 16);
    // Haar
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(px + 2, py, this.w - 4, 5);
    ctx.fillRect(px + 2, py, 4, 8);
    // Auge (Blickrichtung)
    ctx.fillStyle = '#222';
    const ex = f > 0 ? px + this.w - 8 : px + 4;
    ctx.fillRect(ex, py + 7, 3, 3);

    // Arm + Werkzeug-Swing
    this._drawArmAndTool(ctx, px, py, f);

    ctx.globalAlpha = 1;
  }

  _drawArmAndTool(ctx, px, py, f) {
    const u = this.w / 10;
    let armAngle = -0.2;
    if (this.swing > 0) {
      armAngle = -1.1 + this.swing * 2.2;
    }
    const shoulderX = px + (f > 0 ? this.w - 4 : 4);
    const shoulderY = py + 18;
    const len = 16;
    const ax = shoulderX + Math.sin(armAngle) * len * f * -1;
    const ay = shoulderY + Math.cos(armAngle) * len;

    ctx.strokeStyle = this.skin;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(ax, ay);
    ctx.stroke();

    // Werkzeug in der Hand
    const item = this.selected;
    if (item && item.id >= 100) {
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate((f > 0 ? -armAngle : Math.PI + armAngle) * 1);
      ctx.scale(f, 1);
      this._drawTool(ctx, item.id);
      ctx.restore();
    }
  }

  _drawTool(ctx, id) {
    ctx.lineCap = 'butt';
    ctx.lineWidth = 1;
    if (id === ITEM.PICKAXE) {
      ctx.fillStyle = '#b8bccb'; ctx.fillRect(-2, -14, 12, 4);
      ctx.fillStyle = '#6b4226'; ctx.fillRect(2, -10, 4, 14);
    } else if (id === ITEM.SWORD) {
      ctx.fillStyle = '#d9dde8'; ctx.fillRect(0, -18, 4, 18);
      ctx.fillStyle = '#6b4226'; ctx.fillRect(-2, 0, 8, 4);
    } else if (id === ITEM.AXE) {
      ctx.fillStyle = '#b8bccb'; ctx.fillRect(0, -16, 12, 8);
      ctx.fillStyle = '#6b4226'; ctx.fillRect(4, -8, 4, 16);
    }
  }
}
