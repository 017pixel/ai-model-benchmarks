// ===========================================================================
// Welt: unendliche, chunk-basierte Generierung mit Höhlen, Erzen & Dorf
// ===========================================================================
import { CONFIG, BLOCK, BLOCK_PROPS } from '../config.js';
import { valueNoise1D, valueNoise2D, mulberry32 } from './rng.js';

const W = CONFIG.WORLD;
const CHUNK_W = W.CHUNK_W;
const WORLD_H = W.WORLD_H;

export class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.chunks = new Map(); // chunkX -> Uint8Array
    this.mods = new Map(); // "x,y" -> blockType (Spieleränderungen, für Save)
    this.village = { minX: -24, maxX: 64 }; // Bereich des Startdorfs (Flachland)
  }

  key(x) { return x; }

  // Oberflächenhöhe einer Welt-Spalte
  surfaceAt(x) {
    const n = valueNoise1D(x * 0.012, this.seed, 4);
    const n2 = valueNoise1D(x * 0.06, this.seed + 99, 3);
    let h = W.SURFACE + (n - 0.5) * 46 + (n2 - 0.5) * 10;
    // Dorf: flaches Land
    if (x >= this.village.minX && x <= this.village.maxX) {
      const flat = W.SURFACE + 8;
      h = flat;
    }
    return Math.floor(h);
  }

  generateChunk(cx) {
    const arr = new Uint8Array(CHUNK_W * WORLD_H);
    const rnd = mulberry32((cx + 1) * 2654435761 + this.seed);
    for (let i = 0; i < CHUNK_W; i++) {
      const x = cx * CHUNK_W + i;
      const surf = this.surfaceAt(x);
      for (let y = 0; y < WORLD_H; y++) {
        let type = BLOCK.AIR;
        if (y === W.WORLD_H - 1) {
          type = BLOCK.STONE;
        } else if (y < surf) {
          type = BLOCK.AIR;
        } else if (y === surf) {
          type = x >= this.village.minX && x <= this.village.maxX ? BLOCK.GRASS : BLOCK.GRASS;
        } else if (y < surf + 5) {
          type = BLOCK.DIRT;
        } else {
          type = BLOCK.STONE;
          // Erze
          const d = y - surf;
          const oreN = valueNoise2D(x * 0.08, y * 0.08, this.seed + 555, 2);
          if (d > 12 && oreN > 0.74 && rnd() > 0.4) {
            if (d > 40 && oreN > 0.82) type = BLOCK.GOLD;
            else if (d > 24 && oreN > 0.78) type = BLOCK.IRON;
            else type = BLOCK.COAL;
          }
        }
        // Höhlen (unter der Oberfläche)
        if (y > surf + 3) {
          const cave = valueNoise2D(x * 0.045, y * 0.05, this.seed + 7, 4);
          if (cave < W.CAVE_THRESHOLD) type = BLOCK.AIR;
        }
        // Sand an der Wasseroberfläche
        if (y >= W.SEA_LEVEL - 1 && y <= W.SEA_LEVEL + 1 && type === BLOCK.DIRT) {
          type = BLOCK.SAND;
        }
        // Flache Seen in niedrigen Gebieten
        if (y >= W.SEA_LEVEL && y <= W.SEA_LEVEL + 2 && type === BLOCK.AIR && this.surfaceAt(x) < W.SEA_LEVEL + 6) {
          type = BLOCK.WATER;
        }
        arr[i * WORLD_H + y] = type;
      }
    }
    // Bäume im Nicht-Dorf-Bereich auf Gras
    if (!(cx * CHUNK_W >= this.village.minX && cx * CHUNK_W <= this.village.maxX)) {
      for (let i = 0; i < CHUNK_W; i++) {
        const x = cx * CHUNK_W + i;
        const surf = this.surfaceAt(x);
        if (arr[i * WORLD_H + surf] === BLOCK.GRASS && rnd() > 0.86) {
          this.plantTree(arr, i, surf, rnd);
        }
      }
    }
    this.chunks.set(cx, arr);
    return arr;
  }

  plantTree(arr, i, surf, rnd) {
    const th = 4 + Math.floor(rnd() * 3);
    for (let t = 1; t <= th; t++) {
      const y = surf - t;
      if (y >= 0) arr[i * WORLD_H + y] = BLOCK.LOG;
    }
    const top = surf - th;
    for (let dy = -2; dy <= 0; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const yy = top + dy;
        const xx = i + dx;
        if (xx < 0 || xx >= CHUNK_W || yy < 0) continue;
        if (arr[xx * WORLD_H + yy] === BLOCK.AIR) arr[xx * WORLD_H + yy] = BLOCK.LEAVES;
      }
    }
    arr[i * WORLD_H + top] = BLOCK.LEAVES;
  }

  getChunk(cx) {
    let c = this.chunks.get(cx);
    if (!c) c = this.generateChunk(cx);
    return c;
  }

  getTile(x, y) {
    if (y < 0) return BLOCK.AIR;
    if (y >= WORLD_H) return BLOCK.STONE;
    const mk = `${x},${y}`;
    if (this.mods.has(mk)) return this.mods.get(mk);
    const cx = Math.floor(x / CHUNK_W);
    const i = ((x % CHUNK_W) + CHUNK_W) % CHUNK_W;
    return this.getChunk(cx)[i * WORLD_H + y];
  }

  setTile(x, y, type) {
    if (y < 0 || y >= WORLD_H) return;
    this.mods.set(`${x},${y}`, type);
  }

  isSolid(x, y) {
    const t = this.getTile(x, y);
    return BLOCK_PROPS[t] && BLOCK_PROPS[t].solid;
  }

  // Licht-Level (Fackeln leuchten)
  lightAt(x, y) {
    let l = 0;
    for (let dx = -3; dx <= 3; dx++)
      for (let dy = -3; dy <= 3; dy++) {
        const t = this.getTile(x + dx, y + dy);
        const p = BLOCK_PROPS[t];
        if (p && p.light) {
          const d = Math.abs(dx) + Math.abs(dy);
          if (d <= p.light) l = Math.max(l, p.light - d);
        }
      }
    return l;
  }

  // Serialisierung der Änderungen (kompakt)
  serializeMods() {
    const obj = {};
    for (const [k, v] of this.mods) obj[k] = v;
    return obj;
  }

  loadMods(obj) {
    this.mods.clear();
    for (const k of Object.keys(obj)) this.mods.set(k, obj[k]);
  }
}
