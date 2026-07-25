// Particle system: lightweight pooled particles for mining debris, blood/hit
// sparks, boss aura, and ambient floating motes. Renders as colored rects.

import { TILE } from '../block/Blocks';

export interface Particle {
  x: number; y: number; // tile space
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; color: string;
  gravity: number;
}

export class ParticleSystem {
  particles: Particle[] = [];

  emit(opts: Partial<Particle> & { x: number; y: number }) {
    this.particles.push({
      x: opts.x, y: opts.y,
      vx: opts.vx ?? 0, vy: opts.vy ?? 0,
      life: opts.life ?? 0.6, maxLife: opts.life ?? 0.6,
      size: opts.size ?? 2, color: opts.color ?? '#fff',
      gravity: opts.gravity ?? 30,
    });
  }

  /** burst N particles in a circle (for block break, hit sparks) */
  burst(x: number, y: number, color: string, count: number, speed = 6) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.emit({
        x, y, color,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
        life: 0.4 + Math.random() * 0.4,
        size: 1 + Math.random() * 2,
        gravity: 25,
      });
    }
  }

  update(dt: number) {
    for (const p of this.particles) {
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  render(ctx: CanvasRenderingContext2D, cam: { x: number; y: number; scale: number }, vw: number, vh: number) {
    const scale = cam.scale;
    for (const p of this.particles) {
      const sx = (p.x * TILE - cam.x) * scale + vw / 2;
      const sy = (p.y * TILE - cam.y) * scale + vh / 2;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const sz = p.size * scale * 0.5;
      ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  clear() { this.particles.length = 0; }
}
