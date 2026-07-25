// World: owns all chunks, handles infinite generation on demand, and exposes
// global get/set block APIs in world coordinates. Also tracks player edits so
// unmodified chunks can be regenerated deterministically from the seed.

import { BlockId, CHUNK_WIDTH, WORLD_HEIGHT, getBlock, isSolid } from '../block/Blocks';
import { Chunk } from './Chunk';
import { generateChunk, SurfaceInfo } from '../generation/TerrainGen';

export class World {
  chunks = new Map<number, Chunk>();
  surfaceCache = new Map<number, number>(); // worldX -> surface y
  /** number of modified chunks (for save heuristics) */
  edits = 0;
  villageBuilt = false;

  constructor(public seed: number) {}

  chunkFor(worldX: number): Chunk {
    const cx = Math.floor(worldX / CHUNK_WIDTH);
    return this.getOrCreate(cx);
  }

  getOrCreate(cx: number): Chunk {
    let c = this.chunks.get(cx);
    if (!c) {
      c = new Chunk(cx);
      generateChunk(c, this.seed);
      this.chunks.set(cx, c);
    }
    return c;
  }

  /** get a chunk without forcing generation (returns undefined if absent) */
  peekChunk(cx: number): Chunk | undefined {
    return this.chunks.get(cx);
  }

  getBlock(worldX: number, worldY: number): BlockId {
    if (worldY < 0 || worldY >= WORLD_HEIGHT) return BlockId.Air;
    const cx = Math.floor(worldX / CHUNK_WIDTH);
    const chunk = this.chunks.get(cx);
    if (!chunk) return BlockId.Air; // not generated yet -> treat as air
    const lx = worldX - cx * CHUNK_WIDTH;
    return chunk.getLocal(lx, worldY);
  }

  setBlock(worldX: number, worldY: number, id: BlockId, markDirty = true): Chunk {
    if (worldY < 0 || worldY >= WORLD_HEIGHT) return this.getOrCreate(0);
    const cx = Math.floor(worldX / CHUNK_WIDTH);
    const chunk = this.getOrCreate(cx);
    const lx = worldX - cx * CHUNK_WIDTH;
    chunk.setLocal(lx, worldY, id);
    if (markDirty) chunk.dirty = true;
    return chunk;
  }

  isSolidAt(worldX: number, worldY: number): boolean {
    return isSolid(this.getBlock(worldX, worldY));
  }

  /** Find the surface y (first non-air from top) for a column, caching results. */
  surfaceY(worldX: number): number {
    const cached = this.surfaceCache.get(worldX);
    if (cached !== undefined) return cached;
    // ensure chunk generated
    this.chunkFor(worldX);
    const cx = Math.floor(worldX / CHUNK_WIDTH);
    const chunk = this.chunks.get(cx)!;
    const lx = worldX - cx * CHUNK_WIDTH;
    let y = 0;
    while (y < WORLD_HEIGHT && chunk.getLocal(lx, y) === BlockId.Air) y++;
    const surface = y < WORLD_HEIGHT ? y : WORLD_HEIGHT - 1;
    this.surfaceCache.set(worldX, surface);
    return surface;
  }

  /** release far-away chunks to save memory; keeps a window of recent ones. */
  unloadDistant(centerCx: number, radius: number) {
    for (const key of this.chunks.keys()) {
      if (Math.abs(key - centerCx) > radius) {
        // don't unload dirty chunks unless explicitly saved (handled by SaveSystem)
        const c = this.chunks.get(key)!;
        if (c.dirty) continue;
        this.chunks.delete(key);
      }
    }
  }
}

export type { SurfaceInfo };
export { getBlock };
