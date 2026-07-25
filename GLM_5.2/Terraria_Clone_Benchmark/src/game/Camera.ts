// Camera: follows the player with smooth lerp, supports zoom, and converts
// between world (tile) space and screen (pixel) space.

import { TILE } from '../block/Blocks';

export class Camera {
  x = 0; // world pixel position (center of view)
  y = 0;
  zoom = 2.5; // logical scale factor
  targetX = 0;
  targetY = 0;

  constructor(public viewportW: number, public viewportH: number) {}

  resize(w: number, h: number) {
    this.viewportW = w;
    this.viewportH = h;
  }

  setZoom(z: number) {
    this.zoom = Math.max(1, Math.min(6, z));
  }

  follow(worldTileX: number, worldTileY: number, dt: number) {
    // convert tile-center to pixel
    this.targetX = worldTileX * TILE;
    this.targetY = worldTileY * TILE;
    const lerp = 1 - Math.pow(0.001, dt); // frame-rate independent smoothing
    this.x += (this.targetX - this.x) * lerp;
    this.y += (this.targetY - this.y) * lerp;
  }

  /** world pixel -> screen pixel */
  worldToScreen(wx: number, wy: number): [number, number] {
    const scale = this.zoom;
    return [
      (wx - this.x) * scale + this.viewportW / 2,
      (wy - this.y) * scale + this.viewportH / 2,
    ];
  }

  /** screen pixel -> world pixel */
  screenToWorld(sx: number, sy: number): [number, number] {
    const scale = this.zoom;
    return [
      (sx - this.viewportW / 2) / scale + this.x,
      (sy - this.viewportH / 2) / scale + this.y,
    ];
  }

  /** screen pixel -> world tile */
  screenToTile(sx: number, sy: number): [number, number] {
    const [wx, wy] = this.screenToWorld(sx, sy);
    return [Math.floor(wx / TILE), Math.floor(wy / TILE)];
  }

  /** visible world pixel bounds (for culling) */
  viewBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const halfW = this.viewportW / 2 / this.zoom;
    const halfH = this.viewportH / 2 / this.zoom;
    return {
      minX: this.x - halfW,
      maxX: this.x + halfW,
      minY: this.y - halfH,
      maxY: this.y + halfH,
    };
  }

  get scale() {
    return this.zoom;
  }
}
