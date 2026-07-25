// ===========================================================================
// BlockForge - Zentrale Konfiguration
// Alle wichtigen, änderbaren Werte sind hier gebündelt (kein Hardcoding im Code).
// ===========================================================================

export const CONFIG = {
  // --- Welt ---
  WORLD: {
    SEED: 1337, // Start-Seed; wird beim Neuerstellen zufällig überschrieben
    TILE: 32, // Dargestellte Pixel pro Block auf dem Bildschirm
    TEX: 16, // Auflösung der prozeduralen Texturen (Pixel-Art)
    CHUNK_W: 16, // Blöcke pro Chunk (horizontal)
    WORLD_H: 220, // Gesamthöhe der Welt in Blöcken
    SURFACE: 90, // Ungefähre Oberflächenhöhe (wird durch Noise modifiziert)
    SEA_LEVEL: 110,
    CAVE_THRESHOLD: 0.45, // Kleinerer Wert = mehr Höhlen (Noise < Schwellwert -> Luft)
    GRAVITY: 0.6,
    MAX_FALL: 14,
  },

  // --- Spieler ---
  PLAYER: {
    WIDTH: 20,
    HEIGHT: 48,
    SPEED: 3.2,
    FLY_SPEED: 5.5,
    JUMP: 11,
    MAX_HEALTH: 100,
    REACH: 6, // Reichweite in Blöcken
    INVULN: 60, // Frames Unverwundbarkeit nach Treffer
  },

  // --- Kamera ---
  CAMERA: {
    LERP: 0.12,
  },

  // --- Speicher ---
  SAVE: {
    KEY: 'blockforge_save_v1',
    VERSION: 1,
  },

  // --- Render ---
  RENDER: {
    SKY_TOP: '#1b2a4a',
    SKY_BOTTOM: '#3d6ea5',
    NIGHT_TOP: '#070b18',
    NIGHT_BOTTOM: '#10203a',
    SHOW_SHADOWS: true,
  },

  // --- Gameplay ---
  GAMEPLAY: {
    DAY_LENGTH: 1800, // Frames pro Tagphase
    MONSTER_CAP: 24,
    BOSS_HEALTH: 1200,
    PVP_HEALTH: 100,
  },
};

// Block-Typen (zentral, damit Texture/World/UI konsistent bleiben)
export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  PLANK: 4,
  LEAVES: 5,
  SAND: 6,
  WATER: 7,
  COAL: 8,
  IRON: 9,
  GOLD: 10,
  LOG: 11,
  GLASS: 12,
  BRICK: 13,
  TORCH: 14,
  CLOUD: 15,
};

// Eigenschaften je Block
export const BLOCK_PROPS = {
  [BLOCK.AIR]: { name: 'Luft', solid: false, break: 0 },
  [BLOCK.GRASS]: { name: 'Gras', solid: true, break: 0.45, drop: BLOCK.DIRT },
  [BLOCK.DIRT]: { name: 'Erde', solid: true, break: 0.4 },
  [BLOCK.STONE]: { name: 'Stein', solid: true, break: 1.2 },
  [BLOCK.PLANK]: { name: 'Holzplanke', solid: true, break: 0.6 },
  [BLOCK.LEAVES]: { name: 'Blätter', solid: true, break: 0.25 },
  [BLOCK.SAND]: { name: 'Sand', solid: true, break: 0.35 },
  [BLOCK.WATER]: { name: 'Wasser', solid: false, break: 99, liquid: true },
  [BLOCK.COAL]: { name: 'Kohle-Erz', solid: true, break: 1.4, drop: BLOCK.COAL },
  [BLOCK.IRON]: { name: 'Eisen-Erz', solid: true, break: 1.8, drop: BLOCK.IRON },
  [BLOCK.GOLD]: { name: 'Gold-Erz', solid: true, break: 2.0, drop: BLOCK.GOLD },
  [BLOCK.LOG]: { name: 'Baumstamm', solid: true, break: 0.9 },
  [BLOCK.GLASS]: { name: 'Glas', solid: true, break: 0.3 },
  [BLOCK.BRICK]: { name: 'Steinziegel', solid: true, break: 1.4 },
  [BLOCK.TORCH]: { name: 'Fackel', solid: false, break: 0.1, light: 6 },
  [BLOCK.CLOUD]: { name: 'Wolke', solid: false, break: 0.1 },
};

// Platzierbare Blöcke im Inventar (Hotbar)
export const PLACEABLE = [
  BLOCK.DIRT, BLOCK.GRASS, BLOCK.STONE, BLOCK.PLANK, BLOCK.LOG,
  BLOCK.LEAVES, BLOCK.SAND, BLOCK.GLASS, BLOCK.BRICK, BLOCK.TORCH,
];

// Item-IDs (Werkzeuge etc.)
export const ITEM = {
  PICKAXE: 100,
  SWORD: 101,
  AXE: 102,
  BOSS_SUMMON: 103,
  HEART: 104,
};

export const ITEM_PROPS = {
  [ITEM.PICKAXE]: { name: 'Spitzhacke', type: 'tool', power: 2.2 },
  [ITEM.SWORD]: { name: 'Schwert', type: 'weapon', dmg: 22 },
  [ITEM.AXE]: { name: 'Axt', type: 'tool', power: 1.6 },
  [ITEM.BOSS_SUMMON]: { name: 'Boss-Ruf', type: 'summon' },
  [ITEM.HEART]: { name: 'Herz', type: 'heal', heal: 25 },
};

export const VERSION = '1.0.0';
