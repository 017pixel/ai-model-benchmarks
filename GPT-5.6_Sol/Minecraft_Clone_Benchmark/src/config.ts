export const GAME_CONFIG = {
  world: {
    size: 1144,
    baseHeight: 44,
    maxTerrainHeight: 55,
    treeChance: 0.035,
    seed: 5187,
  },
  player: {
    height: 1.8,
    eyeHeight: 1.62,
    radius: 0.3,
    walkSpeed: 4.8,
    sprintSpeed: 7.2,
    creativeSpeed: 8.5,
    jumpForce: 8.2,
    gravity: 23,
    reach: 5.5,
    maxHealth: 20,
  },
  combat: {
    playerDamage: 5,
    attackCooldown: 0.42,
    monsterDamage: 2,
    rivalDamage: 3,
    enemyReach: 1.55,
  },
  mining: {
    tickInterval: 0.08,
  },
  mobs: {
    zombies: 5,
    rivals: 2,
    aggroRange: 13,
  },
  dayDuration: 180,
} as const;

export type GameMode = 'survival' | 'creative';

export type BlockType = 'grass' | 'dirt' | 'stone' | 'wood' | 'leaves' | 'sand' | 'brick';

export interface BlockDefinition {
  label: string;
  color: string;
  hardness: number;
}

export const BLOCKS: Record<BlockType, BlockDefinition> = {
  grass: { label: 'Gras', color: '#67934d', hardness: 0.65 },
  dirt: { label: 'Erde', color: '#76523a', hardness: 0.55 },
  stone: { label: 'Stein', color: '#777a76', hardness: 1.8 },
  wood: { label: 'Holz', color: '#75502d', hardness: 1.2 },
  leaves: { label: 'Laub', color: '#3f713e', hardness: 0.35 },
  sand: { label: 'Sand', color: '#c7b875', hardness: 0.45 },
  brick: { label: 'Ziegel', color: '#8f4937', hardness: 1.4 },
};

export const HOTBAR: BlockType[] = ['grass', 'dirt', 'stone', 'wood', 'sand', 'brick'];
