// Save system: persists world seed + modified chunks + player state to
// localStorage. Auto-saves periodically and on page hide. Only dirty chunks
// are saved; unmodified ones regenerate from the seed.

import { CHUNK_WIDTH } from '../block/Blocks';
import { Chunk } from '../game/Chunk';
import { World } from '../game/World';
import { Player } from '../entity/Player';

const SAVE_KEY = 'terraria_clone_save_v1';

export interface SaveData {
  version: number;
  seed: number;
  player: {
    x: number; y: number; vx: number; vy: number;
    health: number; mode: string; selected: number;
    hotbar: any[];
    inventory: any[];
    bossDefeated: boolean;
  };
  chunks: { cx: number; data: string }[];
  time: number; // day cycle 0..1
  villageBuilt: boolean;
}

export class SaveSystem {
  /** collect a snapshot of the current game state */
  static serialize(world: World, player: Player, time: number, bossDefeated: boolean): SaveData {
    const chunks: { cx: number; data: string }[] = [];
    for (const [cx, chunk] of world.chunks) {
      if (chunk.dirty) {
        chunks.push({ cx, data: chunk.serialize() });
      }
    }
    return {
      version: 1,
      seed: world.seed,
      player: {
        x: player.x, y: player.y, vx: player.vx, vy: player.vy,
        health: player.health, mode: player.mode, selected: player.selected,
        hotbar: player.hotbar,
        inventory: player.inventory,
        bossDefeated,
      },
      chunks,
      time,
      villageBuilt: world.villageBuilt,
    };
  }

  static save(world: World, player: Player, time: number, bossDefeated: boolean): boolean {
    try {
      const data = this.serialize(world, player, time, bossDefeated);
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('Save failed', e);
      return false;
    }
  }

  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (!data || data.version !== 1) return null;
      return data;
    } catch (e) {
      console.warn('Load failed', e);
      return null;
    }
  }

  static applyToWorld(data: SaveData, world: World) {
    // restore chunks
    for (const c of data.chunks) {
      const chunk = new Chunk(c.cx);
      chunk.deserialize(c.data);
      chunk.dirty = true;
      world.chunks.set(c.cx, chunk);
    }
    world.villageBuilt = data.villageBuilt;
  }

  static applyToPlayer(data: SaveData, player: Player) {
    const p = data.player;
    player.x = p.x; player.y = p.y; player.vx = p.vx; player.vy = p.vy;
    player.health = p.health; player.mode = p.mode as any; player.selected = p.selected;
    player.hotbar = p.hotbar;
    player.inventory = p.inventory;
  }

  static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  static clear() {
    localStorage.removeItem(SAVE_KEY);
  }
}
