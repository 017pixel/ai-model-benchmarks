// Monsters: Slime (hops), Zombie (walks toward player at night),
// and the Eye of Cthulhu boss (3 phases). Plus a Bandit "PvP" enemy that
// hunts the player with a sword.

import { BlockId, TILE } from '../block/Blocks';
import { World } from '../game/World';
import { Entity } from './Entity';
import { shade } from '../textures/TextureAtlas';

export type MonsterKind = 'slime' | 'zombie' | 'boss' | 'bandit';

interface SpawnOpts {
  x: number; y: number;
  kind: MonsterKind;
}

export class Monster extends Entity {
  kind: MonsterKind;
  /** AI state timer */
  aiTimer = 0;
  hopTimer = 0;
  attackCD = 0;
  /** for boss phases */
  phase = 0;
  spawnTimer = 0;
  /** custom tint */
  color: string;

  constructor(opts: SpawnOpts) {
    super();
    this.kind = opts.kind;
    this.x = opts.x;
    this.y = opts.y;
    switch (opts.kind) {
      case 'slime':
        this.width = 0.9; this.height = 0.8;
        this.maxHealth = 8; this.health = 8;
        this.contactDamage = 2; this.color = '#5ac0e0';
        break;
      case 'zombie':
        this.width = 0.7; this.height = 1.7;
        this.maxHealth = 14; this.health = 14;
        this.contactDamage = 4; this.color = '#4a7a4a';
        break;
      case 'boss':
        this.width = 3.5; this.height = 3.5;
        this.maxHealth = 400; this.health = 400;
        this.contactDamage = 8; this.color = '#c02030';
        this._flying = true;
        break;
      case 'bandit':
        this.width = 0.6; this.height = 1.8;
        this.maxHealth = 30; this.health = 30;
        this.contactDamage = 5; this.color = '#8a5a30';
        break;
    }
  }

  _flying = false;
  override get flying(): boolean { return this._flying; }

  protected tick(dt: number, world: World) {
    if (this.attackCD > 0) this.attackCD -= dt;
    this.aiTimer += dt;

    // find the player via a callback injected by Game
    const target = this.targetPlayer;
    switch (this.kind) {
      case 'slime': this.aiSlime(dt, target, world); break;
      case 'zombie': this.aiZombie(dt, target, world); break;
      case 'boss': this.aiBoss(dt, target, world); break;
      case 'bandit': this.aiBandit(dt, target, world); break;
    }

    // physics
    if (!this._flying) this.applyGravity(dt);
    this.moveAndCollide(world, dt);

    // out of world -> despawn
    if (this.y > 300 || this.x < -1000 || this.x > 100000) this.removed = true;
  }

  /** injected by Game each frame */
  targetPlayer: { x: number; y: number; health: number; mode: string } | null = null;
  /** injected callback to deal damage to player */
  hurtPlayer?: (dmg: number, kx: number, ky: number) => void;
  /** injected: request to spawn a slime (boss ability) */
  spawnSlime?: (x: number, y: number) => void;

  private aiSlime(dt: number, t: typeof this.targetPlayer, world: World) {
    this.hopTimer -= dt;
    if (this.onGround && this.hopTimer <= 0) {
      const dir = t && this.x < t.x ? 1 : -1;
      this.vx = dir * 4;
      this.vy = -9;
      this.hopTimer = 0.8 + Math.random() * 0.6;
      this.facing = dir as 1 | -1;
    }
    if (!this.onGround) this.vx *= 0.98;
    this.contactCheck(t);
  }

  private aiZombie(dt: number, t: typeof this.targetPlayer, world: World) {
    if (!t) { this.vx *= 0.8; return; }
    const dir = this.x < t.x ? 1 : -1;
    this.facing = dir as 1 | -1;
    // only chase if within range and (night OR close)
    const dist = Math.abs(this.x - t.x);
    if (dist < 24) {
      this.vx = dir * 2.4;
      // jump over obstacles
      if (this.onGround) {
        const ahead = world.getBlock(Math.floor(this.x + dir * 0.6), Math.floor(this.y - 1));
        if (ahead !== BlockId.Air) this.vy = -8;
      }
    } else {
      this.vx *= 0.8;
    }
    this.contactCheck(t);
  }

  private aiBoss(dt: number, t: typeof this.targetPlayer, world: World) {
    if (!t) {
      // hover
      this.vy = Math.sin(this.aiTimer * 2) * 1;
      return;
    }
    // phase transition on HP
    const frac = this.health / this.maxHealth;
    const newPhase = frac > 0.66 ? 0 : frac > 0.33 ? 1 : 2;
    if (newPhase !== this.phase) {
      this.phase = newPhase;
      this.aiTimer = 0;
    }
    const dx = t.x - this.x;
    const dy = (t.y - 1) - (this.y - 1.75);
    const dist = Math.hypot(dx, dy);
    const dir = dx < 0 ? -1 : 1;
    this.facing = dir as 1 | -1;

    if (this.phase === 0) {
      // hover and track
      this.vx = (dx) * 0.8;
      this.vy = (dy) * 0.8 + Math.sin(this.aiTimer * 3) * 1.5;
    } else if (this.phase === 1) {
      // faster, occasional dash
      this.vx = dx * 1.4;
      this.vy = dy * 1.2;
      if (this.aiTimer > 2 && dist < 14) {
        // dash
        this.vx = dir * 16;
        this.vy = (t.y - this.y) * 0.6;
        this.aiTimer = 0;
      }
    } else {
      // phase 3: spawns slimes and erratic
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.spawnSlime) {
        this.spawnSlime(this.x + (Math.random() - 0.5) * 2, this.y - 1);
        this.spawnTimer = 3;
      }
      this.vx = Math.sin(this.aiTimer * 2) * 8 + dx * 0.5;
      this.vy = Math.cos(this.aiTimer * 3) * 3 + dy * 0.5;
    }
    // keep within reasonable altitude
    if (this.y > 120) this.vy = -4;
    this.contactCheck(t);
  }

  private aiBandit(dt: number, t: typeof this.targetPlayer, world: World) {
    if (!t) { this.vx *= 0.8; return; }
    const dist = Math.abs(this.x - t.x);
    const dir = this.x < t.x ? 1 : -1;
    this.facing = dir as 1 | -1;
    if (dist > 1.5) {
      this.vx = dir * 3.5;
      if (this.onGround) {
        const ahead = world.getBlock(Math.floor(this.x + dir * 0.6), Math.floor(this.y - 1));
        if (ahead !== BlockId.Air) this.vy = -9;
      }
    } else {
      this.vx *= 0.5;
      // attack
      if (this.attackCD <= 0) {
        this.hurtPlayer?.(5, dir * 6, -3);
        this.attackCD = 1.2;
      }
    }
    // occasionally jump to dodge
    if (this.onGround && Math.random() < 0.005) this.vy = -10;
    this.contactCheck(t);
  }

  private contactCheck(t: typeof this.targetPlayer) {
    if (!t || this.contactDamage <= 0) return;
    const tEntity = { x: t.x, y: t.y, width: 0.6, height: 1.8 } as const;
    const overlap =
      Math.abs(this.x - t.x) < (this.width + 0.6) / 2 &&
      Math.abs((this.y - this.height / 2) - (t.y - 0.9)) < (this.height + 1.8) / 2;
    if (overlap && this.attackCD <= 0) {
      const dir = this.x < t.x ? 1 : -1;
      this.hurtPlayer?.(this.contactDamage, dir * 5, -4);
      this.attackCD = 0.8;
    }
  }

  render(ctx: CanvasRenderingContext2D, cam: { x: number; y: number; scale: number }, vw: number, vh: number) {
    const rect = this.screenRect(cam, vw, vh);
    drawShadow(ctx, rect.x + rect.w / 2, rect.y + rect.h, rect.w * 0.85);

    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h);
    if (this.facing === -1) ctx.scale(-1, 1);
    const flash = this.flash > 0;
    const px = rect.w / (this.kind === 'boss' ? 16 : 8);

    if (this.kind === 'slime') {
      const squish = this.onGround ? 0 : Math.sin(this.aiTimer * 10) * 0.2;
      ctx.fillStyle = flash ? '#fff' : this.color;
      ctx.beginPath();
      ctx.ellipse(0, -rect.h / 2, rect.w / 2, rect.h / 2 * (1 - squish), 0, 0, Math.PI * 2);
      ctx.fill();
      // shine
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(-rect.w * 0.2, -rect.h * 0.6, rect.w * 0.12, rect.h * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(-rect.w * 0.18, -rect.h * 0.55, rect.w * 0.08, rect.w * 0.08);
      ctx.fillRect(rect.w * 0.1, -rect.h * 0.55, rect.w * 0.08, rect.w * 0.08);
    } else if (this.kind === 'zombie' || this.kind === 'bandit') {
      const swing = Math.sin(this.aiTimer * 6) * (Math.abs(this.vx) > 0.5 ? 1 : 0);
      // legs
      ctx.fillStyle = flash ? '#fff' : shade(this.color, 0.6);
      ctx.fillRect(-3 * px, -4 * px, 2 * px, 4 * px + swing * 2 * px);
      ctx.fillRect(1 * px, -4 * px, 2 * px, 4 * px - swing * 2 * px);
      // body
      ctx.fillStyle = flash ? '#fff' : this.color;
      ctx.fillRect(-3 * px, -7 * px, 6 * px, 3 * px);
      // arms outstretched (zombie) or with sword (bandit)
      ctx.fillStyle = shade(this.color, 0.8);
      ctx.fillRect(2.5 * px, -7 * px, 3 * px, 1.2 * px);
      if (this.kind === 'bandit') {
        ctx.fillStyle = '#c0c0c8'; // sword
        ctx.fillRect(5.5 * px, -7 * px, 4 * px, 0.6 * px);
      }
      // head
      ctx.fillStyle = flash ? '#fff' : (this.kind === 'zombie' ? '#6a9a6a' : '#e8b48a');
      ctx.fillRect(-2.5 * px, -10.5 * px, 5 * px, 4 * px);
      // eyes (glowing for zombie)
      ctx.fillStyle = this.kind === 'zombie' ? '#ff3030' : '#000';
      ctx.fillRect(1 * px, -9 * px, 0.8 * px, 0.8 * px);
      ctx.fillRect(-1.8 * px, -9 * px, 0.8 * px, 0.8 * px);
    } else if (this.kind === 'boss') {
      // Eye of Cthulhu
      const eyeball = flash ? '#fff' : '#f0e8e8';
      const sclera = '#fff';
      const pupil = this.phase === 2 ? '#ff1010' : '#c01010';
      // outer eye (circle)
      ctx.fillStyle = eyeball;
      ctx.beginPath();
      ctx.arc(0, -rect.h / 2, rect.w / 2, 0, Math.PI * 2);
      ctx.fill();
      // iris
      const irisX = this.facing * rect.w * 0.12;
      const irisY = -rect.h / 2 + Math.sin(this.aiTimer * 2) * rect.h * 0.06;
      ctx.fillStyle = pupil;
      ctx.beginPath();
      ctx.arc(irisX, irisY, rect.w * 0.22, 0, Math.PI * 2);
      ctx.fill();
      // pupil slit
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(irisX, irisY, rect.w * 0.06, rect.w * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // veins / angry brow
      ctx.strokeStyle = '#600';
      ctx.lineWidth = Math.max(1, px);
      ctx.beginPath();
      ctx.moveTo(-rect.w * 0.3, -rect.h * 0.9);
      ctx.lineTo(-rect.w * 0.1, -rect.h * 0.7);
      ctx.moveTo(rect.w * 0.3, -rect.h * 0.9);
      ctx.lineTo(rect.w * 0.1, -rect.h * 0.7);
      ctx.stroke();
      // tentacles/teeth at bottom
      ctx.fillStyle = sclera;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * px, rect.h * 0.05);
        ctx.lineTo(i * px + px, rect.h * 0.05);
        ctx.lineTo(i * px + px / 2, rect.h * 0.18);
        ctx.fill();
      }
    }
    ctx.restore();

    // health bar above (not for boss — boss uses HUD bar)
    if (this.kind !== 'boss' && this.health < this.maxHealth) {
      const bw = rect.w;
      const bx = rect.x;
      const by = rect.y - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = '#40c040';
      ctx.fillRect(bx, by, bw * (this.health / this.maxHealth), 3);
    }
  }
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, w / 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
