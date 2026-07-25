import { tileIndex } from './textures.js'

export const AIR = 0

function all(t) {
  const i = tileIndex(t)
  return { top: i, side: i, bottom: i }
}

export const BLOCKS = [
  null,
  { name: 'Gras', top: tileIndex('grass_top'), side: tileIndex('grass_side'), bottom: tileIndex('dirt'), opaque: true, hardness: 0.8 },
  { name: 'Erde', ...all('dirt'), opaque: true, hardness: 0.6 },
  { name: 'Stein', ...all('stone'), opaque: true, hardness: 1.8 },
  { name: 'Kies', ...all('cobblestone'), opaque: true, hardness: 1.5 },
  { name: 'Holz', top: tileIndex('log_top'), side: tileIndex('log_side'), bottom: tileIndex('log_top'), opaque: true, hardness: 1.1 },
  { name: 'Planke', ...all('planks'), opaque: true, hardness: 1.0 },
  { name: 'Laub', ...all('leaves'), opaque: true, hardness: 0.4 },
  { name: 'Sand', ...all('sand'), opaque: true, hardness: 0.6 },
  { name: 'Ziegel', ...all('brick'), opaque: true, hardness: 1.6 },
  { name: 'Glas', ...all('glass'), opaque: true, hardness: 0.2 },
  { name: 'Fels', ...all('bedrock'), opaque: true, hardness: -1 }
]

export const HOTBAR = [1, 2, 3, 4, 5, 6, 7, 8, 10]

export function isOpaque(t) { return t !== AIR && BLOCKS[t] && BLOCKS[t].opaque }
export function isSolid(t) { return t !== AIR }
