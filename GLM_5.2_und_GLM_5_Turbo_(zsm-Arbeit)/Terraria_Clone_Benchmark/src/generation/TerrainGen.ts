// Terrain generation: heightmap, surface/biome blocks, dirt/stone layering,
// trees, and the bedrock floor. Calls into cave + ore generators to finish a chunk.

import { BlockId, CHUNK_WIDTH, WORLD_HEIGHT } from '../block/Blocks';
import { Chunk } from '../game/Chunk';
import { fbm, RNG, valueNoise2D } from '../game/Noise';
import { carveCaves } from './CaveGen';
import { scatterOres } from './OreGen';

export enum Biome { Forest, Desert, Snow }

export interface SurfaceInfo {
  /** surface height (y) for each local column */
  heights: Int16Array;
  biome: Biome;
}

export function biomeAt(worldX: number, seed: number): Biome {
  const b = valueNoise2D(worldX * 0.004, 0, seed + 2000);
  const b2 = valueNoise2D(worldX * 0.004, 100, seed + 3000);
  if (b > 0.62) return Biome.Desert;
  if (b2 > 0.66) return Biome.Snow;
  return Biome.Forest;
}

/** base ground height for a world x coordinate */
export function surfaceHeightAt(worldX: number, seed: number): number {
  const base = fbm(worldX * 0.012, 0, seed, 4) * 18; // gentle hills
  const detail = fbm(worldX * 0.05, 50, seed + 100, 2) * 6;
  const mountain = Math.pow(fbm(worldX * 0.006, 0, seed + 250, 3), 2) * 60;
  return Math.floor(70 + base + detail + mountain);
}

export function generateChunk(chunk: Chunk, seed: number): SurfaceInfo {
  const baseX = chunk.cx * CHUNK_WIDTH;
  const heights = new Int16Array(CHUNK_WIDTH);
  const biome = biomeAt(baseX + CHUNK_WIDTH / 2, seed);

  for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
    const wx = baseX + lx;
    const h = surfaceHeightAt(wx, seed);
    heights[lx] = h;
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      let id: BlockId = BlockId.Air;
      if (y === WORLD_HEIGHT - 1) {
        id = BlockId.Bedrock;
      } else if (y > WORLD_HEIGHT - 4) {
        id = valueNoise2D(wx, y, seed + 7) > 0.4 ? BlockId.Bedrock : BlockId.Stone;
      } else if (y > h + 6) {
        id = BlockId.Stone;
      } else if (y > h) {
        id = biome === Biome.Desert ? BlockId.Sand : BlockId.Dirt;
      } else if (y === h) {
        // surface block
        id = biome === Biome.Desert ? BlockId.Sand
          : biome === Biome.Snow ? BlockId.Snow
          : BlockId.Grass;
      }
      if (id !== BlockId.Air) chunk.setLocal(lx, y, id);
    }
  }

  // bedrock already set above
  carveCaves(chunk, seed);
  scatterOres(chunk, seed);

  // trees & decoration on grass/snow surface
  if (biome !== Biome.Desert) {
    const rng = new RNG(((seed ^ (chunk.cx * 40503)) >>> 0));
    for (let lx = 2; lx < CHUNK_WIDTH - 2; lx++) {
      const h = heights[lx];
      const surface = chunk.getLocal(lx, h);
      if (surface !== BlockId.Grass && surface !== BlockId.Snow) continue;
      if (rng.chance(0.18)) {
        placeTree(chunk, lx, h - 1, biome === Biome.Snow, rng);
      } else if (rng.chance(0.25)) {
        // tall grass / flower decoration handled as a non-colliding block? keep simple: skip
      }
    }
  }

  chunk.markGenerated();
  return { heights, biome };
}

function placeTree(chunk: Chunk, lx: number, topY: number, snowy: boolean, rng: RNG) {
  const height = rng.int(4, 7);
  // trunk
  for (let i = 0; i < height; i++) {
    const y = topY - i;
    if (y < 0) break;
    chunk.setLocal(lx, y, BlockId.Wood);
  }
  // canopy
  const cy = topY - height;
  const r = rng.int(2, 3);
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      if (dx * dx + dy * dy > r * r + 1) continue;
      const tx = lx + dx;
      const ty = cy + dy;
      if (tx < 0 || tx >= CHUNK_WIDTH || ty < 0) continue;
      if (chunk.getLocal(tx, ty) === BlockId.Air) {
        chunk.setLocal(tx, ty, snowy ? BlockId.Snow : BlockId.Leaves);
      }
    }
  }
}
