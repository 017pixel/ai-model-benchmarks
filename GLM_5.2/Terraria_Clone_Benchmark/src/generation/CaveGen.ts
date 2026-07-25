// Cave generation: carves tunnels and caverns into the stone layer using
// 2D noise thresholds. Also digs vertical shafts for variety.

import { BlockId, CHUNK_WIDTH, WORLD_HEIGHT } from '../block/Blocks';
import { Chunk } from '../game/Chunk';
import { fbm, valueNoise2D } from '../game/Noise';

export function carveCaves(chunk: Chunk, seed: number) {
  const baseX = chunk.cx * CHUNK_WIDTH;
  for (let lx = 0; lx < CHUNK_WIDTH; lx++) {
    const wx = baseX + lx;
    for (let y = 40; y < WORLD_HEIGHT - 6; y++) {
      const cur = chunk.getLocal(lx, y);
      if (cur === BlockId.Air || cur === BlockId.Bedrock) continue;
      // tunnels: combine two noise fields for worm-like caves
      const tunnel = fbm(wx * 0.05, y * 0.08, seed + 500, 3);
      const wiggle = valueNoise2D(wx * 0.1, y * 0.1, seed + 777);
      const cavern = fbm(wx * 0.03, y * 0.04, seed + 900, 4);
      const threshold = 0.32;
      // big caverns deeper down
      const deepBoost = y > 90 ? 0.06 : 0;
      if (tunnel * wiggle > threshold + 0.05 - deepBoost || cavern > 0.62 + deepBoost * 2) {
        chunk.setLocal(lx, y, BlockId.Air);
        continue;
      }
      // deep lava pools
      if (y > 150 && cavern > 0.6 && valueNoise2D(wx * 0.2, y * 0.2, seed + 33) > 0.7) {
        chunk.setLocal(lx, y, BlockId.Lava);
      }
      // shallow water pools near surface caves
      if (y > 50 && y < 80 && cavern > 0.6 && valueNoise2D(wx * 0.2, y * 0.2, seed + 44) > 0.75) {
        chunk.setLocal(lx, y, BlockId.Water);
      }
    }
  }
}
