export const CONFIG = {
  storageKey: 'deepward.worlds.v1',
  tileSize: 32,
  gravity: 1550,
  playerSpeed: 235,
  jumpSpeed: 555,
  flySpeed: 350,
  reach: 6 * 32,
  autosaveMs: 12_000,
  maxMonsters: 18,
  surfaceBase: 17,
  worldBottom: 130,
  dayLength: 240,
  villageLeft: -18,
  villageRight: 18,
  colors: {
    skyDay: '#78aab0',
    skyDusk: '#8b6b62',
    skyNight: '#101923',
    ink: '#f4ecd8',
    panel: '#101918',
    accent: '#d2a85b',
    danger: '#c95d4b',
  },
} as const;

export const BLOCKS = {
  grass: { name: 'Grassode', hardness: 0.45, tool: 'shovel', color: '#55784c', drop: 'dirt' },
  dirt: { name: 'Erde', hardness: 0.4, tool: 'shovel', color: '#76513a', drop: 'dirt' },
  stone: { name: 'Stein', hardness: 1.45, tool: 'pickaxe', color: '#596166', drop: 'stone' },
  wood: { name: 'Stamm', hardness: 0.85, tool: 'axe', color: '#75513a', drop: 'wood' },
  leaves: { name: 'Laub', hardness: 0.25, tool: 'axe', color: '#426644', drop: 'wood' },
  plank: { name: 'Holzplanke', hardness: 0.6, tool: 'axe', color: '#a27448', drop: 'plank' },
  coal: { name: 'Kohle', hardness: 1.7, tool: 'pickaxe', color: '#35383b', drop: 'coal' },
  copper: { name: 'Kupfererz', hardness: 2.1, tool: 'pickaxe', color: '#9b6446', drop: 'copper' },
  crystal: { name: 'Tiefenkristall', hardness: 2.8, tool: 'pickaxe', color: '#5d9b91', drop: 'crystal' },
  torch: { name: 'Fackel', hardness: 0.15, tool: 'any', color: '#d5a54d', drop: 'torch' },
  bedrock: { name: 'Grundfels', hardness: 999, tool: 'none', color: '#26282b', drop: 'stone' },
} as const;

export type BlockType = keyof typeof BLOCKS;
export type ToolType = 'pickaxe' | 'axe' | 'sword' | 'shovel';
export type ItemType = BlockType | ToolType;

export const HOTBAR_ITEMS: ItemType[] = [
  'pickaxe', 'axe', 'sword', 'dirt', 'stone', 'wood', 'plank', 'torch', 'crystal',
];

export const ITEM_NAMES: Record<ItemType, string> = {
  ...Object.fromEntries(Object.entries(BLOCKS).map(([key, value]) => [key, value.name])),
  pickaxe: 'Spitzhacke',
  axe: 'Axt',
  sword: 'Kurzschwert',
  shovel: 'Schaufel',
} as Record<ItemType, string>;
