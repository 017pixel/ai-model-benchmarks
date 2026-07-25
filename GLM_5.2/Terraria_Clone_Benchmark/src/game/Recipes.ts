// Crafting recipes. A recipe consumes a set of (block, count) inputs and
// produces an output (block or tool). Requires proximity to a crafting table
// unless requiresTable === false.

import { BlockId } from '../block/Blocks';
import { ToolDef } from '../tools/Tools';
import { TOOL_BY_ID } from '../tools/Tools';

export interface RecipeOutput {
  block?: BlockId;
  tool?: ToolDef;
  count: number;
}

export interface Recipe {
  id: string;
  name: string;
  inputs: { block: BlockId; count: number }[];
  output: RecipeOutput;
  requiresTable: boolean;
}

function R(id: string, name: string, inputs: { block: BlockId; count: number }[], output: RecipeOutput, requiresTable = true): Recipe {
  return { id, name, inputs, output, requiresTable };
}

export const RECIPES: Recipe[] = [
  // basics (hand)
  R('plank', 'Holzbretter', [{ block: BlockId.Wood, count: 1 }], { block: BlockId.Plank, count: 4 }, false),
  R('stick', 'Stock', [{ block: BlockId.Plank, count: 2 }], { block: BlockId.Torch, count: 1 }, false), // simplified stick->torch
  R('torch', 'Fackel', [{ block: BlockId.Wood, count: 1 }, { block: BlockId.CoalOre, count: 1 }], { block: BlockId.Torch, count: 4 }, false),
  // crafting table
  R('table', 'Werkbank', [{ block: BlockId.Plank, count: 4 }], { block: BlockId.CraftingTable, count: 1 }, false),
  // tools
  R('wood_pickaxe', 'Holz-Spitzhacke', [{ block: BlockId.Plank, count: 3 }], { tool: TOOL_BY_ID['wood_pickaxe'], count: 1 }),
  R('wood_axe', 'Holz-Axt', [{ block: BlockId.Plank, count: 3 }], { tool: TOOL_BY_ID['wood_axe'], count: 1 }),
  R('wood_sword', 'Holz-Schwert', [{ block: BlockId.Plank, count: 2 }], { tool: TOOL_BY_ID['wood_sword'], count: 1 }),
  R('wood_shovel', 'Holz-Schaufel', [{ block: BlockId.Plank, count: 2 }], { tool: TOOL_BY_ID['wood_shovel'], count: 1 }),
  R('stone_pickaxe', 'Stein-Spitzhacke', [{ block: BlockId.Plank, count: 2 }, { block: BlockId.Cobblestone, count: 3 }], { tool: TOOL_BY_ID['stone_pickaxe'], count: 1 }),
  R('stone_axe', 'Stein-Axt', [{ block: BlockId.Plank, count: 2 }, { block: BlockId.Cobblestone, count: 3 }], { tool: TOOL_BY_ID['stone_axe'], count: 1 }),
  R('stone_sword', 'Stein-Schwert', [{ block: BlockId.Plank, count: 1 }, { block: BlockId.Cobblestone, count: 2 }], { tool: TOOL_BY_ID['stone_sword'], count: 1 }),
  R('iron_pickaxe', 'Eisen-Spitzhacke', [{ block: BlockId.Plank, count: 2 }, { block: BlockId.IronOre, count: 12 }], { tool: TOOL_BY_ID['iron_pickaxe'], count: 1 }),
  R('iron_sword', 'Eisen-Schwert', [{ block: BlockId.Plank, count: 1 }, { block: BlockId.IronOre, count: 10 }], { tool: TOOL_BY_ID['iron_sword'], count: 1 }),
  R('diamond_pickaxe', 'Diamant-Spitzhacke', [{ block: BlockId.Plank, count: 2 }, { block: BlockId.DiamondOre, count: 8 }], { tool: TOOL_BY_ID['diamond_pickaxe'], count: 1 }),
  R('diamond_sword', 'Diamant-Schwert', [{ block: BlockId.Plank, count: 1 }, { block: BlockId.DiamondOre, count: 6 }], { tool: TOOL_BY_ID['diamond_sword'], count: 1 }),
  // building
  R('cobblestone', 'Bruchstein', [{ block: BlockId.Stone, count: 1 }], { block: BlockId.Cobblestone, count: 1 }, false),
  R('stonebrick', 'Steinziegel', [{ block: BlockId.Stone, count: 1 }], { block: BlockId.StoneBrick, count: 1 }),
  R('glass', 'Glas', [{ block: BlockId.Sand, count: 1 }], { block: BlockId.Glass, count: 1 }),
  R('door', 'Tür', [{ block: BlockId.Plank, count: 6 }], { block: BlockId.Door, count: 1 }),
  R('platform', 'Plattform', [{ block: BlockId.Plank, count: 1 }], { block: BlockId.WoodPlatform, count: 2 }),
  // boss summon
  R('summon_eye', 'Verdächtiger Blick', [{ block: BlockId.IronOre, count: 5 }, { block: BlockId.DiamondOre, count: 1 }], { block: BlockId.Cloud, count: 1 /* placeholder marker */ }),
];

/** count how many of a block the player has across hotbar + inventory */
export function countItems(slots: (any | null)[], block: BlockId): number {
  let n = 0;
  for (const s of slots) {
    if (s && s.block === block) n += s.count;
  }
  return n;
}

/** remove inputs from the combined slots; returns true if successful */
export function consumeInputs(slots: (any | null)[], inputs: { block: BlockId; count: number }[]): boolean {
  // verify first
  for (const inp of inputs) {
    if (countItems(slots, inp.block) < inp.count) return false;
  }
  for (const inp of inputs) {
    let remaining = inp.count;
    for (const s of slots) {
      if (remaining <= 0) break;
      if (s && s.block === inp.block) {
        const take = Math.min(s.count, remaining);
        s.count -= take;
        remaining -= take;
        if (s.count <= 0) s.block = undefined;
      }
    }
  }
  return true;
}
