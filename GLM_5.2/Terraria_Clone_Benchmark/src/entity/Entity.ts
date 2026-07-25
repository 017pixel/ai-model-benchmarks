// Entity base: position, velocity, AABB collision against the tile world,
// health, facing, hurt/knockback. All mobile things (player, monsters, npcs)
// extend this.

import { TILE } from '../block/Blocks';
import { World } from '../game/World';

export type Facing = -1 | 1;

export abstract class Entity {
  x = 0; // tile coords (center-x of body)
  y = 0; // tile coords (feet / bottom of body)
  vx = 0;
  vy = 0;
  width = 0.6; // in tiles
  height = 1.8; // in tiles
  onGround = false;
  facing: Facing = 1;
  alive = true;
  invuln = 0; // seconds of invulnerability remaining
  flash = 0; // hurt flash timer (for render tint)
  removed = false;

  maxHealth = 20;
  health = 20;
  /** damage dealt on contact (0 = non-hostile) */
  contactDamage = 0;
  /** knockback resistance 0..1 */
  knockbackResist = 0;

  /** unique kind tag for save/ai targeting */
  abstract kind: string;

  get left() { return this.x - this.width / 2; }
  get right() { return this.x + this.width / 2; }
  get top() { return this.y - this.height; }
  get bottom() { return this.y; }

  /** Move + collide axis-by-axis against solid tiles. Returns whether it moved. */
  moveAndCollide(world: World, dt: number) {
    const dx = this.vx * dt;
    const dy = this.vy * dt;
    this.onGround = false;

    // X axis
    this.x += dx;
    this.resolveAxis(world, 'x', dx);
    // Y axis
    this.y += dy;
    this.resolveAxis(world, 'y', dy);
  }

  private resolveAxis(world: World, axis: 'x' | 'y', delta: number) {
    if (delta === 0) return;
    const minT = Math.floor(this.top);
    const maxT = Math.floor(this.bottom);
    const minL = Math.floor(this.left);
    const maxL = Math.floor(this.right);
    if (axis === 'x') {
      if (delta > 0) {
        for (let ty = minT; ty <= maxT; ty++) {
          if (world.isSolidAt(maxL, ty)) {
            this.x = maxL - this.width / 2 - 0.001;
            this.vx = 0;
            return;
          }
        }
      } else {
        for (let ty = minT; ty <= maxT; ty++) {
          if (world.isSolidAt(minL, ty)) {
            this.x = minL + 1 + this.width / 2 + 0.001;
            this.vx = 0;
            return;
          }
        }
      }
    } else {
      if (delta > 0) {
        // moving down (y increases downward)
        for (let tx = minL; tx <= maxL; tx++) {
          if (world.isSolidAt(tx, maxT)) {
            this.y = maxT - 0.001;
            this.vy = 0;
            this.onGround = true;
            return;
          }
        }
      } else {
        for (let tx = minL; tx <= maxL; tx++) {
          if (world.isSolidAt(tx, minT)) {
            this.y = minT + 1 + this.height;
            this.vy = 0;
            return;
          }
        }
      }
    }
  }

  applyGravity(dt: number, g = 32) {
    if (this.flying) return;
    this.vy += g * dt;
    if (this.vy > 50) this.vy = 50; // terminal velocity
  }

  get flying(): boolean { return false; }

  hurt(amount: number, knockX: number, knockY: number) {
    if (this.invuln > 0 || amount <= 0 || !this.alive) return false;
    this.health -= amount;
    this.invuln = 0.5;
    this.flash = 0.25;
    const resist = 1 - this.knockbackResist;
    this.vx += knockX * resist;
    this.vy += knockY * resist;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
    return true;
  }

  update(dt: number, world: World) {
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
    this.tick(dt, world);
  }

  /** subclass behavior */
  protected abstract tick(dt: number, world: World): void;

  /** distance to another entity in tiles */
  distTo(other: Entity): number {
    const dx = this.x - other.x;
    const dy = (this.y - other.height / 2) - (other.y - other.height / 2);
    return Math.hypot(dx, dy);
  }

  /** draw helper: convert to screen via camera */
  abstract render(ctx: CanvasRenderingContext2D, cam: { x: number; y: number; scale: number }, vw: number, vh: number): void;

  /** entity pixel rect on screen */
  screenRect(cam: { x: number; y: number; scale: number }, vw: number, vh: number) {
    const cx = this.x * TILE;
    const cy = this.y * TILE;
    const [sx, sy] = [
      (cx - cam.x) * cam.scale + vw / 2,
      (cy - cam.y) * cam.scale + vh / 2,
    ];
    const w = this.width * TILE * cam.scale;
    const h = this.height * TILE * cam.scale;
    return { x: sx - w / 2, y: sy - h, w, h };
  }
}
