// Village generation: places a small starting village near world origin on first
// generation. Builds simple houses and clears a flat area. NPCs are spawned by
// the Game after terrain exists (they need a surface to stand on).

import { BlockId, CHUNK_WIDTH } from '../block/Blocks';
import { World } from '../game/World';
import { surfaceHeightAt } from './TerrainGen';

export interface VillageHouse {
  x: number; // door tile x
  y: number; // floor tile y
  width: number;
  npcKind: 'guide' | 'merchant' | 'nurse';
}

export const VILLAGE_RANGE = { minX: -30, maxX: 30 };

/** Build a village across [minX,maxX]. Returns house definitions. */
export function buildVillage(world: World, seed: number): VillageHouse[] {
  const houses: VillageHouse[] = [];
  const layouts: Array<{ kind: VillageHouse['npcKind']; relX: number; w: number }> = [
    { kind: 'guide', relX: -16, w: 9 },
    { kind: 'merchant', relX: 0, w: 11 },
    { kind: 'nurse', relX: 18, w: 9 },
  ];

  for (const l of layouts) {
    const leftX = l.relX;
    const floorY = levelGround(world, leftX, l.w, seed);
    buildHouse(world, leftX, floorY, l.w, 6);
    houses.push({ x: leftX + Math.floor(l.w / 2), y: floorY - 1, width: l.w, npcKind: l.kind });
  }
  return houses;
}

/** Flatten terrain under [x, x+w) to the median surface height and fill gaps. */
function levelGround(world: World, x: number, w: number, seed: number): number {
  const heights: number[] = [];
  for (let i = 0; i < w; i++) heights.push(surfaceHeightAt(x + i, seed));
  // pick a stable floor: max height (lowest y is highest ground) to avoid floating houses
  const floorY = Math.min(...heights);
  for (let i = 0; i < w; i++) {
    const colH = heights[i];
    // raise ground to floorY by filling air below floorY down to colH
    for (let y = colH; y < floorY; y++) {
      if (world.getBlock(x + i, y) === BlockId.Air) world.setBlock(x + i, y, BlockId.Dirt);
    }
    // put a grass/surface cap
    world.setBlock(x + i, floorY, BlockId.Grass);
    // clear above
    for (let y = floorY - 1; y > floorY - 12; y--) {
      if (world.getBlock(x + i, y) !== BlockId.Air) world.setBlock(x + i, y, BlockId.Air);
    }
  }
  return floorY;
}

function buildHouse(world: World, leftX: number, floorY: number, w: number, h: number) {
  const rightX = leftX + w - 1;
  const topY = floorY - h;
  // walls (stone brick)
  for (let y = topY; y <= floorY; y++) {
    world.setBlock(leftX, y, BlockId.StoneBrick);
    world.setBlock(rightX, y, BlockId.StoneBrick);
  }
  // floor
  for (let x = leftX; x <= rightX; x++) {
    world.setBlock(x, floorY, BlockId.Plank);
  }
  // roof beams
  for (let x = leftX; x <= rightX; x++) {
    world.setBlock(x, topY, BlockId.Wood);
  }
  // torches inside
  world.setBlock(leftX + 1, topY + 2, BlockId.Torch);
  world.setBlock(rightX - 1, topY + 2, BlockId.Torch);
  // door at center
  const doorX = leftX + Math.floor(w / 2);
  world.setBlock(doorX, floorY - 1, BlockId.Door);
  world.setBlock(doorX, floorY - 2, BlockId.Air);
  // windows
  world.setBlock(leftX + 1, topY + 2, BlockId.Glass);
  world.setBlock(rightX - 1, topY + 2, BlockId.Glass);
  // re-add torches if windows overwrote them
  world.setBlock(leftX + 2, topY + 2, BlockId.Torch);
  world.setBlock(rightX - 2, topY + 2, BlockId.Torch);
}
