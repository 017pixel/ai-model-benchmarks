// Tool definitions: pickaxe / axe / shovel / sword in tiers wood/stone/iron/diamond.
import { ToolType } from '../block/Blocks';
import { getSprite, shade } from '../textures/TextureAtlas';

export type ToolClass = 'pickaxe' | 'axe' | 'shovel' | 'sword';
export type ToolTier = 'wood' | 'stone' | 'iron' | 'diamond';

export interface ToolDef {
  id: string;
  name: string;
  cls: ToolClass;
  tier: ToolTier;
  /** mining speed multiplier */
  speed: number;
  /** required for ores of a given tier */
  tierLevel: number;
  /** damage dealt when used as weapon */
  damage: number;
  /** reach bonus in tiles */
  reach: number;
  /** color used by the procedural icon */
  color: string;
  headColor: string;
}

const TIER_LEVEL: Record<ToolTier, number> = { wood: 0, stone: 1, iron: 2, diamond: 3 };
const TIER_COLOR: Record<ToolTier, { base: string; head: string }> = {
  wood: { base: '#6b4a2b', head: '#9c6a39' },
  stone: { base: '#6b4a2b', head: '#909090' },
  iron: { base: '#5a3a1a', head: '#d0d0d8' },
  diamond: { base: '#5a3a1a', head: '#5ff5d8' },
};

function build(cls: ToolClass, tier: ToolTier): ToolDef {
  const tl = TIER_LEVEL[tier];
  const c = TIER_COLOR[tier];
  const speedMult = 1 + tl * 0.8;
  const baseDamage = cls === 'sword' ? 3 + tl * 3 : 1 + tl;
  return {
    id: `${tier}_${cls}`,
    name: `${tier[0].toUpperCase() + tier.slice(1)} ${cls[0].toUpperCase() + cls.slice(1)}`,
    cls,
    tier,
    speed: cls === 'pickaxe' ? speedMult : cls === 'shovel' ? speedMult * 1.2 : cls === 'axe' ? speedMult : 1,
    tierLevel: tl,
    damage: baseDamage,
    reach: cls === 'sword' ? 0.5 : 0,
    color: c.base,
    headColor: c.head,
  };
}

export const TOOLS: ToolDef[] = [
  // pickaxes
  build('pickaxe', 'wood'), build('pickaxe', 'stone'), build('pickaxe', 'iron'), build('pickaxe', 'diamond'),
  // axes
  build('axe', 'wood'), build('axe', 'stone'), build('axe', 'iron'), build('axe', 'diamond'),
  // shovels
  build('shovel', 'wood'), build('shovel', 'stone'), build('shovel', 'iron'), build('shovel', 'diamond'),
  // swords
  build('sword', 'wood'), build('sword', 'stone'), build('sword', 'iron'), build('sword', 'diamond'),
];

export const TOOL_BY_ID: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

/** Tool affinity: which tool is best for a given block tool-type. */
export function bestToolFor(toolType: ToolType): ToolClass | null {
  switch (toolType) {
    case ToolType.Pickaxe: return 'pickaxe';
    case ToolType.Axe: return 'axe';
    case ToolType.Shovel: return 'shovel';
    default: return null;
  }
}

/** Compute effective mining speed: correct tool tier unlocks full speed. */
export function miningSpeed(tool: ToolDef | null, requiredTier: number, blockTool: ToolType): number {
  if (!tool) return 0.6; // bare hand is slow
  const correctClass = bestToolFor(blockTool);
  if (correctClass && tool.cls === correctClass) {
    if (tool.tierLevel < requiredTier) return 0.1; // can't mine at all effectively
    return tool.speed;
  }
  return 0.6; // wrong tool still works, slowly
}

// ---- Procedural tool icons (drawn into a 16x16 canvas) ----
export function getToolIcon(tool: ToolDef): HTMLCanvasElement {
  return getSprite(`tool:${tool.id}`, (ctx) => {
    const head = tool.headColor;
    const handle = tool.color;
    ctx.save();
    // rotate 45deg for diagonal handle look
    ctx.translate(8, 8);
    ctx.rotate(-Math.PI / 4);
    ctx.translate(-8, -8);
    // handle
    ctx.fillStyle = handle;
    ctx.fillRect(7, 4, 2, 11);
    ctx.fillStyle = shade(handle, 0.7);
    ctx.fillRect(7, 4, 1, 11);
    // head per class
    ctx.fillStyle = head;
    switch (tool.cls) {
      case 'pickaxe':
        ctx.fillRect(3, 2, 10, 2);
        ctx.fillRect(3, 2, 2, 3);
        ctx.fillRect(11, 2, 2, 3);
        break;
      case 'axe':
        ctx.fillRect(7, 1, 6, 5);
        ctx.fillStyle = shade(head, 0.8);
        ctx.fillRect(11, 2, 2, 3);
        break;
      case 'shovel':
        ctx.fillRect(5, 1, 6, 4);
        break;
      case 'sword':
        // blade up, handle down
        ctx.fillStyle = handle;
        ctx.fillRect(7, 4, 2, 11);
        ctx.fillStyle = head;
        ctx.fillRect(6, 0, 4, 7);
        ctx.fillStyle = shade(head, 1.3);
        ctx.fillRect(7, 1, 1, 4);
        // guard
        ctx.fillStyle = '#ffd040';
        ctx.fillRect(4, 6, 8, 1);
        break;
    }
    ctx.fillStyle = shade(head, 1.3);
    ctx.fillRect(4, 2, 1, 1);
    ctx.restore();
  });
}
