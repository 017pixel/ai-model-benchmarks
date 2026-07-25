// ===========================================================================
// Entities: Monster, Boss, NPCs, PvP-Gegner
// ===========================================================================
import { CONFIG, BLOCK } from '../config.js';

const T = CONFIG.WORLD.TILE;

function collideAxis(ent, world, axisX) {
  const left = Math.floor(ent.x / T);
  const right = Math.floor((ent.x + ent.w - 0.01) / T);
  const top = Math.floor(ent.y / T);
  const bottom = Math.floor((ent.y + ent.h - 0.01) / T);
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (!world.isSolid(tx, ty)) continue;
      if (axisX) {
        if (ent.vx > 0) ent.x = tx * T - ent.w;
        else if (ent.vx < 0) ent.x = (tx + 1) * T;
        ent.vx = 0;
      } else {
        if (ent.vy > 0) { ent.y = ty * T - ent.h; ent.onGround = true; }
        else if (ent.vy < 0) ent.y = (ty + 1) * T;
        ent.vy = 0;
      }
    }
  }
}

class Mob {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.health = 20; this.maxHealth = 20;
    this.dead = false;
    this.facing = 1;
    this.hurt = 0;
    this.anim = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  physics(world, dt) {
    this.vy += CONFIG.WORLD.GRAVITY * dt;
    if (this.vy > CONFIG.WORLD.MAX_FALL) this.vy = CONFIG.WORLD.MAX_FALL;
    this.x += this.vx * dt; this.vx *= 0.92;
    collideAxis(this, world, true);
    this.y += this.vy * dt; this.onGround = false;
    collideAxis(this, world, false);
    if (this.y > CONFIG.WORLD.WORLD_H * T + 100) this.dead = true;
    if (this.hurt > 0) this.hurt--;
    this.anim += dt * 0.15;
  }

  takeDamage(d) {
    this.health -= d;
    this.hurt = 8;
    if (this.health <= 0) this.dead = true;
  }

  shadow(ctx, s) {
    if (!CONFIG.RENDER.SHOW_SHADOWS) return;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(s.x + this.w / 2, s.y + this.h - 2, this.w * 0.55, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Slime extends Mob {
  constructor(x, y) {
    super(x, y, 28, 22);
    this.health = 30; this.maxHealth = 30;
    this.jumpCd = 0;
    this.color = '#5fd06a';
  }
  update(world, dt, target) {
    const dx = target.cx - this.cx;
    this.facing = dx > 0 ? 1 : -1;
    if (this.jumpCd <= 0 && this.onGround) {
      this.vx = Math.sign(dx) * (1.4 + Math.random());
      this.vy = -7.5;
      this.jumpCd = 40 + Math.random() * 40;
    }
    this.jumpCd -= dt;
    this.physics(world, dt);
    // Kontaktschaden
    if (Math.abs(dx) < 22 && Math.abs(target.cy - this.cy) < 24) {
      target.damage(8);
      this.vx = -Math.sign(dx) * 4;
    }
  }
  draw(ctx, camera) {
    const s = camera.worldToScreen(this.x, this.y);
    this.shadow(ctx, s);
    const squash = 1 + Math.sin(this.anim * 2) * 0.08;
    const w = this.w * (1 / squash);
    const h = this.h * squash;
    const ox = (this.w - w) / 2;
    ctx.fillStyle = this.hurt > 0 ? '#ffffff' : this.color;
    ctx.fillRect(s.x + ox, s.y + (this.h - h), w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(s.x + ox, s.y + (this.h - h), w, 4);
    ctx.fillStyle = '#16241a';
    const ex = this.facing > 0 ? s.x + ox + w * 0.55 : s.x + ox + w * 0.2;
    ctx.fillRect(ex, s.y + (this.h - h) + 6, 4, 4);
    ctx.fillRect(ex + 8, s.y + (this.h - h) + 6, 4, 4);
  }
}

export class Eye extends Mob {
  constructor(x, y) {
    super(x, y, 24, 24);
    this.health = 24; this.maxHealth = 24;
    this.cd = 0;
    this.color = '#c0556a';
  }
  update(world, dt, target, spawnProj) {
    const dx = target.cx - this.cx;
    const dy = target.cy - this.cy;
    const dist = Math.hypot(dx, dy) || 1;
    // schweben, Distanz halten
    this.vx = (dx / dist) * 1.2 - Math.sign(dx) * 0.6;
    this.vy = (dy / dist) * 1.0 - 0.5;
    this.physics(world, dt);
    this.facing = dx > 0 ? 1 : -1;
    this.cd -= dt;
    if (this.cd <= 0 && dist < 320 && spawnProj) {
      spawnProj(this.cx, this.cy, dx / dist * 4, dy / dist * 4, 10);
      this.cd = 80;
    }
  }
  draw(ctx, camera) {
    const s = camera.worldToScreen(this.x, this.y);
    this.shadow(ctx, s);
    ctx.fillStyle = this.hurt > 0 ? '#fff' : this.color;
    ctx.beginPath();
    ctx.arc(s.x + this.w / 2, s.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x + this.w / 2, s.y + this.h / 2, this.w * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#300';
    ctx.beginPath();
    ctx.arc(s.x + this.w / 2 + this.facing * 3, s.y + this.h / 2, this.w * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Boss extends Mob {
  constructor(x, y) {
    super(x, y, 88, 110);
    this.health = CONFIG.GAMEPLAY.BOSS_HEALTH;
    this.maxHealth = CONFIG.GAMEPLAY.BOSS_HEALTH;
    this.phase = 1;
    this.state = 'idle';
    this.timer = 60;
    this.color = '#3c6b4a';
    this.cd = 120;
    this.summonCd = 300;
    this.name = 'Waldgeist';
    this.active = false;
  }
  update(world, dt, target, spawnProj, spawnMob) {
    if (!this.active) { this.physics(world, dt); return; }
    const dx = target.cx - this.cx;
    const dy = target.cy - this.cy;
    const dist = Math.hypot(dx, dy) || 1;
    this.facing = dx > 0 ? 1 : -1;
    this.timer -= dt;

    // Bewegung: schweben & verfolgen
    this.vx = (dx / dist) * 1.6;
    this.vy = Math.sin(this.anim * 0.6) * 1.2 + (dy / dist) * 0.8;

    if (this.health < this.maxHealth * 0.5) this.phase = 2;

    if (this.timer <= 0) {
      if (this.state === 'idle') {
        this.state = Math.random() > 0.5 ? 'charge' : 'shoot';
        this.timer = this.phase === 2 ? 70 : 110;
        if (this.state === 'charge') { this.vx = Math.sign(dx) * 8; this.vy = Math.sign(dy) * 5; }
      } else {
        this.state = 'idle';
        this.timer = this.phase === 2 ? 50 : 90;
      }
    }
    this.physics(world, dt);

    this.cd -= dt;
    if (this.cd <= 0 && this.state === 'shoot' && spawnProj) {
      const n = this.phase === 2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + this.anim;
        spawnProj(this.cx, this.cy, Math.cos(a) * 3.5, Math.sin(a) * 3.5, 14);
      }
      this.cd = 70;
    }
    this.summonCd -= dt;
    if (this.summonCd <= 0 && this.phase === 2 && spawnMob) {
      spawnMob(this.cx + (Math.random() > 0.5 ? 80 : -80), this.cy);
      this.summonCd = 360;
    }

    if (Math.abs(dx) < 60 && Math.abs(dy) < 70) target.damage(this.phase === 2 ? 18 : 12);
  }
  draw(ctx, camera) {
    const s = camera.worldToScreen(this.x, this.y);
    if (CONFIG.RENDER.SHOW_SHADOWS) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(s.x + this.w / 2, s.y + this.h - 4, this.w * 0.5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const c = this.hurt > 0 ? '#fff' : this.color;
    // Körper
    ctx.fillStyle = c;
    ctx.fillRect(s.x + 14, s.y + 30, this.w - 28, this.h - 40);
    // Äste
    ctx.fillStyle = this.hurt > 0 ? '#fff' : '#2c4f39';
    ctx.fillRect(s.x + 4, s.y + 50, 18, 10);
    ctx.fillRect(s.x + this.w - 22, s.y + 50, 18, 10);
    // Kopf
    ctx.fillStyle = c;
    ctx.fillRect(s.x + 18, s.y, this.w - 36, 44);
    // Augen
    ctx.fillStyle = this.state === 'charge' ? '#ff5a4a' : '#ffd24a';
    ctx.fillRect(s.x + 28, s.y + 16, 12, 10);
    ctx.fillRect(s.x + this.w - 40, s.y + 16, 12, 10);
    // Mund
    ctx.fillStyle = '#10240f';
    ctx.fillRect(s.x + 30, s.y + 32, this.w - 60, 6);
  }
}

export class NPC extends Mob {
  constructor(x, y, name, lines, color) {
    super(x, y, 22, 46);
    this.name = name;
    this.lines = lines;
    this.color = color;
    this.lineIdx = 0;
    this.talkCd = 0;
    this.home = x;
  }
  update(world, dt) {
    // sanftes Stehen & gelegentliches Hüpfen
    this.physics(world, dt);
    if (Math.abs(this.x - this.home) > 40) this.vx = Math.sign(this.home - this.x) * 0.8;
    if (this.talkCd > 0) this.talkCd--;
  }
  draw(ctx, camera) {
    const s = camera.worldToScreen(this.x, this.y);
    this.shadow(ctx, s);
    const bob = Math.sin(this.anim * 2) * 1.5;
    const py = s.y + bob;
    // Körper
    ctx.fillStyle = this.color;
    ctx.fillRect(s.x + 2, py + 16, this.w - 4, this.h - 16);
    // Kopf
    ctx.fillStyle = '#e7c39b';
    ctx.fillRect(s.x + 4, py, this.w - 8, 16);
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(s.x + 4, py, this.w - 8, 5);
    // Name
    ctx.fillStyle = '#fff';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, s.x + this.w / 2, py - 6);
    ctx.textAlign = 'left';
  }
}

export class Rival extends Mob {
  // PvP-Gegner (KI-Spieler)
  constructor(x, y) {
    super(x, y, 20, 48);
    this.health = CONFIG.GAMEPLAY.PVP_HEALTH;
    this.maxHealth = CONFIG.GAMEPLAY.PVP_HEALTH;
    this.facing = 1;
    this.swing = 0;
    this.color = '#c0556a';
    this.atkCd = 0;
  }
  update(world, dt, target, onHit) {
    const dx = target.cx - this.cx;
    const dy = target.cy - this.cy;
    const dist = Math.hypot(dx, dy) || 1;
    this.facing = dx > 0 ? 1 : -1;
    if (dist > 30) { this.vx = (dx / dist) * 2.6; }
    else { this.vx *= 0.8; this.atkCd -= dt; if (this.atkCd <= 0) { this.swing = 0.0001; this.atkCd = 50; onHit(14); } }
    if (this.swing > 0) { this.swing += dt * 0.1; if (this.swing >= 1) this.swing = 0; }
    this.vy += CONFIG.WORLD.GRAVITY * dt;
    if (this.vy > CONFIG.WORLD.MAX_FALL) this.vy = CONFIG.WORLD.MAX_FALL;
    if (this.onGround && Math.random() < 0.02) this.vy = -CONFIG.PLAYER.JUMP * 0.8;
    this.x += this.vx * dt; this.vx *= 0.9;
    collideAxis(this, world, true);
    this.y += this.vy * dt; this.onGround = false;
    collideAxis(this, world, false);
  }
  draw(ctx, camera) {
    const s = camera.worldToScreen(this.x, this.y);
    this.shadow(ctx, s);
    const f = this.facing;
    const px = s.x, py = s.y;
    // Beine
    ctx.fillStyle = '#5a2030';
    ctx.fillRect(px + 2, py + this.h - 14, 6, 14);
    ctx.fillRect(px + this.w - 8, py + this.h - 14, 6, 14);
    // Körper
    ctx.fillStyle = this.color;
    ctx.fillRect(px + 1, py + 16, this.w - 2, 18);
    // Kopf
    ctx.fillStyle = '#e7c39b';
    ctx.fillRect(px + 2, py, this.w - 4, 16);
    ctx.fillStyle = '#222';
    const ex = f > 0 ? px + this.w - 8 : px + 4;
    ctx.fillRect(ex, py + 7, 3, 3);
    // Arm/Schwert
    let ang = -0.2;
    if (this.swing > 0) ang = -1.1 + this.swing * 2.2;
    const sx = px + (f > 0 ? this.w - 4 : 4), sy = py + 18;
    const ax = sx + Math.sin(ang) * 16 * f * -1, ay = sy + Math.cos(ang) * 16;
    ctx.strokeStyle = '#e7c39b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ax, ay); ctx.stroke();
    ctx.save(); ctx.translate(ax, ay); ctx.rotate((f > 0 ? -ang : Math.PI + ang)); ctx.scale(f, 1);
    ctx.fillStyle = '#d9dde8'; ctx.fillRect(0, -18, 4, 18);
    ctx.fillStyle = '#6b4226'; ctx.fillRect(-2, 0, 8, 4);
    ctx.restore();
  }
}

export class Projectile {
  constructor(x, y, vx, vy, dmg, color = '#ff7a4a') {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.dmg = dmg; this.color = color; this.dead = false; this.life = 200;
  }
  update(world, dt) {
    this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt;
    const tx = Math.floor(this.x / T), ty = Math.floor(this.y / T);
    if (world.isSolid(tx, ty)) this.dead = true;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx, camera) {
    const s = camera.worldToScreen(this.x - 5, this.y - 5);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(s.x + 5, s.y + 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(s.x + 3, s.y + 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
