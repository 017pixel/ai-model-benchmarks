// Lighting: computes a per-tile brightness within the visible viewport and
// renders it as a dark overlay. Surface tiles get sky light; torches/lava add
// point light. This is intentionally simple (no propagation) for performance.

import { BlockId, TILE, WORLD_HEIGHT, getBlock } from '../block/Blocks';
import { World } from '../game/World';
import { Camera } from '../game/Camera';

export class Lighting {
  /** light buffer matching the visible viewport in tiles */
  private buf: Float32Array = new Float32Array(0);
  private bufW = 0;
  private bufH = 0;
  /** offscreen canvas for the overlay */
  private overlay: HTMLCanvasElement;
  private octx: CanvasRenderingContext2D;

  constructor() {
    this.overlay = document.createElement('canvas');
    this.overlay.width = 256;
    this.overlay.height = 256;
    this.octx = this.overlay.getContext('2d')!;
  }

  /** compute sky darkness based on time of day (0=midnight bright sky? we use 0..1 day cycle) */
  static skyBrightness(dayTime: number): number {
    // 0.25 sunrise, 0.5 noon, 0.75 sunset
    const sun = Math.sin((dayTime - 0.0) * Math.PI * 2 - Math.PI / 2); // -1 midnight, 1 noon-ish
    return Math.max(0.1, Math.min(1, (sun + 1) / 2 * 1.0));
  }

  render(
    ctx: CanvasRenderingContext2D,
    world: World,
    cam: Camera,
    vw: number,
    vh: number,
    dayTime: number,
    extraLights: { x: number; y: number; radius: number; intensity: number }[] = []
  ) {
    const b = cam.viewBounds();
    const minTx = Math.floor(b.minX / TILE);
    const maxTx = Math.ceil(b.maxX / TILE);
    const minTy = Math.floor(b.minY / TILE);
    const maxTy = Math.ceil(b.maxY / TILE);
    const w = maxTx - minTx + 1;
    const h = maxTy - minTy + 1;
    if (w <= 0 || h <= 0) return;
    if (this.bufW !== w || this.bufH !== h) {
      this.buf = new Float32Array(w * h);
      this.bufW = w;
      this.bufH = h;
    }

    const sky = Lighting.skyBrightness(dayTime);

    // pass 1: sky light from above — propagate a column down until a solid block
    for (let lx = 0; lx < w; lx++) {
      const tx = minTx + lx;
      let lit = sky;
      for (let ly = 0; ly < h; ly++) {
        const ty = minTy + ly;
        if (ty < 0 || ty >= WORLD_HEIGHT) { this.buf[ly * w + lx] = lit; continue; }
        const id = world.getBlock(tx, ty);
        const def = getBlock(id);
        if (def.solid && !def.transparent) {
          lit = Math.max(0.03, lit * 0.5);
        } else if (def.transparent && id !== BlockId.Air) {
          lit = Math.max(0.05, lit * 0.8);
        }
        this.buf[ly * w + lx] = lit;
      }
    }

    // pass 2: torch / lava point lights add brightness
    for (let ly = 0; ly < h; ly++) {
      for (let lx = 0; lx < w; lx++) {
        const tx = minTx + lx;
        const ty = minTy + ly;
        const id = world.getBlock(tx, ty);
        const def = getBlock(id);
        if (def.light > 0) {
          this.addGlow(this.buf, w, h, lx, ly, def.light / 15, def.light);
        }
      }
    }
    for (const L of extraLights) {
      const lx = Math.floor(L.x) - minTx;
      const ly = Math.floor(L.y) - minTy;
      this.addGlow(this.buf, w, h, lx, ly, L.radius, L.intensity);
    }

    // render overlay scaled to viewport. Use a low-res canvas then scale up.
    const cellW = Math.ceil(vw / w);
    const cellH = Math.ceil(vh / h);
    const ow = w;
    const oh = h;
    if (this.overlay.width !== ow || this.overlay.height !== oh) {
      this.overlay.width = ow;
      this.overlay.height = oh;
    }
    const octx = this.octx;
    octx.clearRect(0, 0, ow, oh);
    const img = octx.createImageData(ow, oh);
    for (let ly = 0; ly < oh; ly++) {
      for (let lx = 0; lx < ow; lx++) {
        const lit = this.buf[ly * ow + lx];
        const dark = 1 - lit; // 0 bright, 1 black
        const idx = (ly * ow + lx) * 4;
        img.data[idx] = 5;
        img.data[idx + 1] = 5;
        img.data[idx + 2] = 15;
        img.data[idx + 3] = Math.floor(dark * 255);
      }
    }
    octx.putImageData(img, 0, 0);

    // draw scaled over the viewport. We map the overlay's tile grid to the
    // camera-projected world bounds.
    const screenMin = cam.worldToScreen(minTx * TILE, minTy * TILE);
    const screenMax = cam.worldToScreen((maxTx + 1) * TILE, (maxTy + 1) * TILE);
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.overlay, screenMin[0], screenMin[1], screenMax[0] - screenMin[0], screenMax[1] - screenMin[1]);
    ctx.globalCompositeOperation = 'source-over';
  }

  private addGlow(buf: Float32Array, w: number, h: number, lx: number, ly: number, radius: number, intensity: number) {
    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = lx + dx;
        const ny = ly + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const d = Math.hypot(dx, dy);
        if (d > radius) continue;
        const falloff = 1 - d / radius;
        const add = intensity * falloff * 0.8;
        const idx = ny * w + nx;
        buf[idx] = Math.min(1, buf[idx] + add);
      }
    }
  }
}
