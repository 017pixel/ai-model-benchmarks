// A vertical slice of the world: CHUNK_WIDTH tiles wide, WORLD_HEIGHT tall.
// Stored as a flat typed array for cache-friendly access.

import { BlockId, CHUNK_WIDTH, WORLD_HEIGHT } from '../block/Blocks';

export class Chunk {
  /** tile ids, length = CHUNK_WIDTH * WORLD_HEIGHT */
  tiles: Uint8Array;
  /** true if the chunk has been modified by the player (for selective saving) */
  dirty = false;
  /** true once terrain + features have been generated */
  generated = false;

  constructor(public readonly cx: number) {
    this.tiles = new Uint8Array(CHUNK_WIDTH * WORLD_HEIGHT);
  }

  /** local x in [0, CHUNK_WIDTH) */
  getLocal(x: number, y: number): BlockId {
    if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= WORLD_HEIGHT) return BlockId.Air;
    return this.tiles[y * CHUNK_WIDTH + x] as BlockId;
  }

  setLocal(x: number, y: number, id: BlockId) {
    if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= WORLD_HEIGHT) return;
    this.tiles[y * CHUNK_WIDTH + x] = id;
    this.dirty = true;
  }

  /** mark dirty without writing (used after generation) */
  markGenerated() {
    this.generated = true;
  }

  /** RLE-ish serialization: run-length encode for compactness. */
  serialize(): string {
    const out: number[] = [];
    let last = this.tiles[0];
    let count = 1;
    for (let i = 1; i < this.tiles.length; i++) {
      if (this.tiles[i] === last) {
        count++;
      } else {
        out.push(last, count);
        last = this.tiles[i];
        count = 1;
      }
    }
    out.push(last, count);
    return out.join(',');
  }

  deserialize(data: string) {
    const parts = data.split(',').map(Number);
    let idx = 0;
    for (let i = 0; i < parts.length; i += 2) {
      const id = parts[i];
      const count = parts[i + 1];
      for (let j = 0; j < count; j++) {
        if (idx < this.tiles.length) this.tiles[idx] = id;
        idx++;
      }
    }
    this.generated = true;
  }
}
