import type { BlockType, ItemType } from './config';

export type GameMode = 'survival' | 'creative';

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerState extends Vec2 {
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: -1 | 1;
  grounded: boolean;
  health: number;
  maxHealth: number;
  invulnerable: number;
  swing: number;
  walk: number;
}

export interface Inventory {
  [item: string]: number;
}

export interface Progress {
  woodMined: number;
  copperMined: number;
  crystalsMined: number;
  monstersSlain: number;
  bossDefeated: boolean;
  tier: number;
}

export interface WorldSave {
  id: string;
  name: string;
  seed: number;
  createdAt: number;
  updatedAt: number;
  mode: GameMode;
  player: Pick<PlayerState, 'x' | 'y' | 'health' | 'maxHealth'>;
  inventory: Inventory;
  progress: Progress;
  selectedSlot: number;
  time: number;
  changes: Record<string, BlockType | null>;
}

export type EntityType = 'slime' | 'crawler' | 'shade' | 'warden' | 'guide' | 'smith' | 'rival' | 'projectile';

export interface Entity extends Vec2 {
  id: number;
  type: EntityType;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  damage: number;
  grounded: boolean;
  facing: -1 | 1;
  cooldown: number;
  hurt: number;
  phase: number;
  label?: string;
  owner?: number;
}

export interface WorldMeta {
  id: string;
  name: string;
  seed: number;
  updatedAt: number;
  mode: GameMode;
  progress: Progress;
}

export interface InputState {
  keys: Set<string>;
  pressed: Set<string>;
  mouse: Vec2;
  mouseWorld: Vec2;
  left: boolean;
  right: boolean;
}

export interface Particle extends Vec2 {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface FloatingText extends Vec2 {
  text: string;
  color: string;
  life: number;
}

export interface BreakState {
  x: number;
  y: number;
  progress: number;
  block: BlockType;
}

export interface Dialogue {
  speaker: string;
  text: string;
  choices: Array<{ label: string; action: string }>;
}

export interface ItemDefinition {
  type: ItemType;
  count: number;
}
