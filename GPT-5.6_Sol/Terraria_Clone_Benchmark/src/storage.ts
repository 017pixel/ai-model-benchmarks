import { CONFIG } from './config';
import type { GameMode, Progress, WorldMeta, WorldSave } from './types';

function readAll(): WorldSave[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONFIG.storageKey) ?? '[]') as WorldSave[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(worlds: WorldSave[]): void {
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(worlds));
}

export function listWorlds(): WorldMeta[] {
  return readAll()
    .map(({ id, name, seed, updatedAt, mode, progress }) => ({ id, name, seed, updatedAt, mode, progress }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadWorld(id: string): WorldSave | undefined {
  return readAll().find((world) => world.id === id);
}

export function saveWorld(save: WorldSave): void {
  const worlds = readAll();
  const index = worlds.findIndex((world) => world.id === save.id);
  const next = { ...save, updatedAt: Date.now() };
  if (index >= 0) worlds[index] = next;
  else worlds.push(next);
  writeAll(worlds);
}

export function deleteWorld(id: string): void {
  writeAll(readAll().filter((world) => world.id !== id));
}

export function createWorld(name: string, mode: GameMode, seedText = ''): WorldSave {
  const parsedSeed = Number.parseInt(seedText, 10);
  const seed = Number.isFinite(parsedSeed) ? Math.abs(parsedSeed) : Math.floor(Math.random() * 2_000_000_000);
  const progress: Progress = {
    woodMined: 0,
    copperMined: 0,
    crystalsMined: 0,
    monstersSlain: 0,
    bossDefeated: false,
    tier: mode === 'creative' ? 3 : 1,
  };
  const now = Date.now();
  return {
    id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || 'Neue Wildnis',
    seed,
    createdAt: now,
    updatedAt: now,
    mode,
    player: { x: 0, y: 0, health: 100, maxHealth: 100 },
    inventory: {
      pickaxe: 1,
      axe: 1,
      sword: 1,
      shovel: 1,
      dirt: mode === 'creative' ? 999 : 8,
      stone: mode === 'creative' ? 999 : 0,
      wood: mode === 'creative' ? 999 : 0,
      plank: mode === 'creative' ? 999 : 12,
      torch: mode === 'creative' ? 999 : 6,
      coal: mode === 'creative' ? 999 : 0,
      copper: mode === 'creative' ? 999 : 0,
      crystal: mode === 'creative' ? 999 : 0,
    },
    progress,
    selectedSlot: 0,
    time: 0.22,
    changes: {},
  };
}
