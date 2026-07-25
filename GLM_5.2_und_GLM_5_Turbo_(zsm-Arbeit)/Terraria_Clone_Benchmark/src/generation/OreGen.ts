// Ore distribution: scatters ore veins through the stone layer with depth-based
// rarity. Coal is common near the surface; diamond only appears deep.

import { BlockId, CHUNK_WIDTH, WORLD_HEIGHT } from '../block/Blocks';
import { Chunk } from '../game/Chunk';
import { RNG, valueNoise2D } from '../game/Noise';

interface OreConfig { id: BlockId; minY: number; maxY: number; chance: number; veinSize: number; }
const ORES: OreConfig[] = [
  { id: BlockId.CoalOre, minY: 32, maxY: 200, chance: 0.012, veinSize: 5 },
  { id: BlockId.IronOre, minY: 50, maxY: 200, chance: 0.010, veinSize: 4 },
  { id: BlockId.GoldOre, minY: 90, maxY: 200, chance: 0.006, veinSize: 3 },
  { id: BlockId.DiamondOre, minY: 130, maxY: 240, chance: 0.004, veinSize: 3 },
];

export function scatterOres(chunk: Chunk, seed: number) {
  const baseX = chunk.cx * CHUNK_WIDTH;
  const rng = new RNG(seed ^ (chunk.cx * 2654435761) >>> 0);
  for (const ore of ORES) {
    for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
      const wx = baseX + lx;
      for (let y = ore.minY; y < ore.maxY && y < WORLD_HEIGHT - 4; y++) {
        if (chunk.getLocal(lx, y) !== BlockId.Stone) continue;
        // vein center probability modulated by a slow noise to cluster ores
        const cluster = valueNoise2D(wx * 0.1, y * 0.1, seed + ore.id * 31);
        if (rng.chance(ore.chance * (0.5 + cluster))) {
          placeVein(chunk, lx, y, ore.id, ore.veinSize, rng);
        }
      }
    }
  }
}

function placeVein(chunk: Chunk, lx: number, y: number, id: BlockId, size: number, rng: RNG) {
  let placed = 0;
  let cx = lx;
  let cy = y;
  let guard = 0;
  while (placed < size && guard++ < size * 4) {
    if (cx >= 0 && cx < CHUNK_WIDTH && cy >= 0 && cy < WORLD_HEIGHT) {
      if (chunk.getLocal(cx, cy) === BlockId.Stone) {
        chunk.setLocal(cx, cy, id);
        placed++;
      }
    }
    // random walk
    cx += rng.int(-1, 1);
    cy += rng.int(-1, 1);
  }
}
