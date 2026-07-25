// ===========================================================================
// Kamera mit weichem Folgen
// ===========================================================================
import { CONFIG } from '../config.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
  }

  resize(w, h) { this.w = w; this.h = h; }

  follow(tx, ty) {
    const targetX = tx - this.w / 2;
    const targetY = ty - this.h / 2;
    this.x += (targetX - this.x) * CONFIG.CAMERA.LERP;
    this.y += (targetY - this.y) * CONFIG.CAMERA.LERP;
    if (this.x < -CONFIG.WORLD.TILE * 4) this.x = -CONFIG.WORLD.TILE * 4;
  }

  worldToScreen(wx, wy) {
    return { x: wx - this.x, y: wy - this.y };
  }
  screenToWorld(sx, sy) {
    return { x: sx + this.x, y: sy + this.y };
  }
}
