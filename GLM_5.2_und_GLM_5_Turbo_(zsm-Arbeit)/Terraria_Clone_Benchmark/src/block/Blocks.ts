// Block type registry. Every tile in the world references a BlockId.
// Block definitions carry rendering + gameplay metadata.

export enum BlockId {
  Air = 0,
  Grass,
  Dirt,
  Stone,
  Wood, // tree trunk
  Leaves,
  Sand,
  Snow,
  Ice,
  Plank, // crafted wood
  Cobblestone,
  StoneBrick,
  Glass,
  IronOre,
  GoldOre,
  DiamondOre,
  CoalOre,
  Coal, // item-only really, but allow as block
  Torch,
  CraftingTable,
  Door,
  Water,
  Lava,
  Bedrock,
  Cloud,
  WoodPlatform,
}

export interface BlockDef {
  id: BlockId;
  name: string;
  /** solid = collides with entities and blocks light fully */
  solid: boolean;
  /** hardness in "break ticks" base; refined by tool speed. 0 = unbreakable */
  hardness: number;
  /** tool tier required to drop anything (0 = hand works) */
  requiredTier: number;
  /** drop id when broken (defaults to itself) */
  drop?: BlockId;
  /** emits light (0..15) */
  light: number;
  /** transparent to light (leaves, glass, water) */
  transparent: boolean;
  /** liquid (no collision, slows entities) */
  liquid: boolean;
  /** category for tool affinity: pickaxe / axe / shovel / none */
  tool: ToolType;
  /** tint family used by procedural texture */
  color: string;
  /** secondary accent color for the texture */
  accent?: string;
}

export enum ToolType {
  None = 0,
  Pickaxe,
  Axe,
  Shovel,
}

function def(
  id: BlockId,
  name: string,
  color: string,
  opts: Partial<BlockDef> = {}
): BlockDef {
  return {
    id,
    name,
    color,
    solid: opts.solid ?? true,
    hardness: opts.hardness ?? 1,
    requiredTier: opts.requiredTier ?? 0,
    drop: opts.drop ?? id,
    light: opts.light ?? 0,
    transparent: opts.transparent ?? false,
    liquid: opts.liquid ?? false,
    tool: opts.tool ?? ToolType.Pickaxe,
    accent: opts.accent,
  };
}

const REGISTRY: Record<number, BlockDef> = {
  [BlockId.Air]: def(BlockId.Air, 'Air', '#000000', {
    solid: false, hardness: 0, transparent: true, tool: ToolType.None,
  }),
  [BlockId.Grass]: def(BlockId.Grass, 'Grass', '#5fae3a', { accent: '#7ec850', drop: BlockId.Dirt, tool: ToolType.Shovel }),
  [BlockId.Dirt]: def(BlockId.Dirt, 'Dirt', '#7a5230', { accent: '#8a6038', tool: ToolType.Shovel }),
  [BlockId.Stone]: def(BlockId.Stone, 'Stone', '#7d7d7d', { accent: '#909090', hardness: 2 }),
  [BlockId.Wood]: def(BlockId.Wood, 'Wood', '#6b4a2b', { accent: '#825a36', tool: ToolType.Axe, hardness: 1.5 }),
  [BlockId.Leaves]: def(BlockId.Leaves, 'Leaves', '#3d8b2e', { accent: '#4fa83a', transparent: true, tool: ToolType.None, hardness: 0.3, drop: BlockId.Air }),
  [BlockId.Sand]: def(BlockId.Sand, 'Sand', '#e6d49a', { accent: '#f0e0a8', tool: ToolType.Shovel }),
  [BlockId.Snow]: def(BlockId.Snow, 'Snow', '#f4f8ff', { accent: '#dde8f5', tool: ToolType.Shovel, hardness: 0.5 }),
  [BlockId.Ice]: def(BlockId.Ice, 'Ice', '#a8d8f0', { accent: '#c0e4f5', transparent: true, hardness: 0.6 }),
  [BlockId.Plank]: def(BlockId.Plank, 'Plank', '#b07a43', { accent: '#9c6a39', tool: ToolType.Axe, hardness: 1.2 }),
  [BlockId.Cobblestone]: def(BlockId.Cobblestone, 'Cobblestone', '#888888', { accent: '#6e6e6e', hardness: 2 }),
  [BlockId.StoneBrick]: def(BlockId.StoneBrick, 'StoneBrick', '#7a7a7a', { accent: '#9a9a9a', hardness: 2.5 }),
  [BlockId.Glass]: def(BlockId.Glass, 'Glass', '#cfeaff', { accent: '#a0d8f5', transparent: true, hardness: 0.4 }),
  [BlockId.IronOre]: def(BlockId.IronOre, 'Iron Ore', '#8a8a8a', { accent: '#c8946a', hardness: 3, requiredTier: 1 }),
  [BlockId.GoldOre]: def(BlockId.GoldOre, 'Gold Ore', '#8a8a8a', { accent: '#f0c040', hardness: 3.5, requiredTier: 2 }),
  [BlockId.DiamondOre]: def(BlockId.DiamondOre, 'Diamond Ore', '#8a8a8a', { accent: '#5ff5d8', hardness: 4, requiredTier: 2 }),
  [BlockId.CoalOre]: def(BlockId.CoalOre, 'Coal Ore', '#7d7d7d', { accent: '#2a2a2a', hardness: 2.5 }),
  [BlockId.Coal]: def(BlockId.Coal, 'Coal', '#2a2a2a', { accent: '#1a1a1a', hardness: 1 }),
  [BlockId.Torch]: def(BlockId.Torch, 'Torch', '#d8a040', {
    accent: '#ffe060', solid: false, hardness: 0.1, light: 14, transparent: true, tool: ToolType.None,
  }),
  [BlockId.CraftingTable]: def(BlockId.CraftingTable, 'Crafting Table', '#8a5a30', {
    accent: '#5a3a1a', tool: ToolType.Axe, hardness: 1.5,
  }),
  [BlockId.Door]: def(BlockId.Door, 'Door', '#a06a30', {
    accent: '#704020', solid: false, transparent: true, tool: ToolType.Axe, hardness: 1,
  }),
  [BlockId.Water]: def(BlockId.Water, 'Water', '#3a6ec8', {
    accent: '#5a8ee0', solid: false, transparent: true, liquid: true, hardness: 0, tool: ToolType.None, drop: BlockId.Air,
  }),
  [BlockId.Lava]: def(BlockId.Lava, 'Lava', '#e04020', {
    accent: '#ffa030', solid: false, transparent: true, liquid: true, hardness: 0, light: 15, tool: ToolType.None, drop: BlockId.Air,
  }),
  [BlockId.Bedrock]: def(BlockId.Bedrock, 'Bedrock', '#2a2a2a', { accent: '#1a1a1a', hardness: 0, requiredTier: 99 }),
  [BlockId.Cloud]: def(BlockId.Cloud, 'Cloud', '#ffffff', { accent: '#e8e8f0', solid: true, transparent: true, hardness: 0.5, drop: BlockId.Air }),
  [BlockId.WoodPlatform]: def(BlockId.WoodPlatform, 'Platform', '#9a6a35', { accent: '#7a5025', solid: false, transparent: true, tool: ToolType.Axe, hardness: 0.4 }),
};

export function getBlock(id: BlockId): BlockDef {
  return REGISTRY[id] ?? REGISTRY[BlockId.Air];
}

export const TILE = 16; // pixels per tile in world space (logical)
export const WORLD_HEIGHT = 256; // tiles tall (chunk column height)
export const CHUNK_WIDTH = 16; // tiles wide per chunk

/** True if a block stops entities horizontally/vertically. */
export function isSolid(id: BlockId): boolean {
  return getBlock(id).solid;
}
