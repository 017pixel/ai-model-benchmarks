// Procedural pixel-art texture generator.
// Each block/sprite is drawn once into a 16x16 (or larger) offscreen canvas
// and cached. This avoids loading external assets and keeps the look consistent.

import { BlockId, getBlock } from '../block/Blocks';

const SIZE = 16; // texture resolution in pixels

function makeCanvas(w = SIZE, h = SIZE): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgb(r: number, g: number, b: number): string {
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** shade a hex color by a multiplier (1.0 = same, <1 darker, >1 lighter) */
function shade(hex: string, m: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgb(
    Math.max(0, Math.min(255, r * m)),
    Math.max(0, Math.min(255, g * m)),
    Math.max(0, Math.min(255, b * m))
  );
}

/** deterministic per-pixel pseudo-random based on coords */
function pxRand(x: number, y: number, salt: number): number {
  let h = salt ^ Math.imul(x * 374761393 + y * 668265263, 2246822519);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 2654435761) >>> 0;
  return (h & 0xffff) / 0xffff;
}

type DrawFn = (ctx: CanvasRenderingContext2D) => void;

const registry: Record<string, HTMLCanvasElement> = {};

function register(key: string, draw: DrawFn, w = SIZE, h = SIZE): HTMLCanvasElement {
  if (registry[key]) return registry[key];
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  registry[key] = c;
  return c;
}

/** Fill every pixel with a noisy variant of the base color. */
function noisyFill(ctx: CanvasRenderingContext2D, base: string, variance: number, salt: number) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = pxRand(x, y, salt);
      const m = 1 + (n - 0.5) * 2 * variance;
      ctx.fillStyle = shade(base, m);
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

/** top edge highlight, bottom shadow — fakes 3D bevel */
function bevel(ctx: CanvasRenderingContext2D, light: string, dark: string) {
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, SIZE, 1);
  ctx.fillRect(0, 0, 1, SIZE);
  ctx.fillStyle = dark;
  ctx.fillRect(0, SIZE - 1, SIZE, 1);
  ctx.fillRect(SIZE - 1, 0, 1, SIZE);
}

function drawOre(ctx: CanvasRenderingContext2D, stone: string, ore: string, salt: number) {
  noisyFill(ctx, stone, 0.08, salt);
  // scatter ore chunks
  const spots = 5;
  for (let i = 0; i < spots; i++) {
    const sx = 1 + Math.floor(pxRand(i, i * 3, salt + 7) * (SIZE - 3));
    const sy = 1 + Math.floor(pxRand(i * 5, i, salt + 13) * (SIZE - 3));
    const size = 1 + (pxRand(i, i * 2, salt + 17) > 0.6 ? 1 : 0);
    ctx.fillStyle = shade(ore, 0.85);
    ctx.fillRect(sx, sy, size + 1, size + 1);
    ctx.fillStyle = ore;
    ctx.fillRect(sx, sy, size, size);
    ctx.fillStyle = shade(ore, 1.25);
    ctx.fillRect(sx, sy, 1, 1);
  }
}

// ---- Block texture drawing per id ----
function drawBlock(id: BlockId): HTMLCanvasElement {
  const b = getBlock(id);
  const salt = id * 911 + 17;

  return register(`block:${id}`, (ctx) => {
    switch (id) {
      case BlockId.Air:
        break;
      case BlockId.Grass: {
        noisyFill(ctx, b.color, 0.1, salt); // dirt body
        // grassy top
        for (let x = 0; x < SIZE; x++) {
          const h = 2 + Math.floor(pxRand(x, 0, salt) * 2);
          for (let y = 0; y < h; y++) {
            ctx.fillStyle = shade(b.accent!, 0.85 + pxRand(x, y, salt + 1) * 0.4);
            ctx.fillRect(x, y, 1, 1);
          }
          // little grass blades dripping down
          if (pxRand(x, 9, salt) > 0.7) {
            ctx.fillStyle = b.accent!;
            ctx.fillRect(x, h, 1, 1);
          }
        }
        break;
      }
      case BlockId.Dirt:
        noisyFill(ctx, b.color, 0.12, salt);
        // a few darker pebbles
        for (let i = 0; i < 6; i++) {
          const x = Math.floor(pxRand(i, i * 2, salt) * SIZE);
          const y = Math.floor(pxRand(i * 3, i, salt) * SIZE);
          ctx.fillStyle = shade(b.color, 0.7);
          ctx.fillRect(x, y, 1, 1);
        }
        break;
      case BlockId.Stone:
      case BlockId.Cobblestone: {
        noisyFill(ctx, b.color, 0.08, salt);
        // cobble: draw a few rounded stones
        if (id === BlockId.Cobblestone) {
          ctx.fillStyle = shade(b.color, 0.7);
          ctx.fillRect(2, 3, 4, 4);
          ctx.fillRect(9, 2, 5, 4);
          ctx.fillRect(3, 9, 5, 4);
          ctx.fillRect(10, 10, 4, 4);
          ctx.fillStyle = shade(b.color, 1.15);
          ctx.fillRect(2, 3, 4, 1);
          ctx.fillRect(9, 2, 5, 1);
        } else {
          // cracks
          ctx.strokeStyle = shade(b.color, 0.6);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(3, 4); ctx.lineTo(6, 7); ctx.lineTo(5, 11);
          ctx.moveTo(11, 3); ctx.lineTo(9, 8);
          ctx.stroke();
        }
        break;
      }
      case BlockId.Wood: {
        // vertical grain
        for (let x = 0; x < SIZE; x++) {
          const stripe = pxRand(x, 0, salt) > 0.5;
          const m = stripe ? 1.1 : 0.85;
          for (let y = 0; y < SIZE; y++) {
            ctx.fillStyle = shade(b.color, m + (pxRand(x, y, salt) - 0.5) * 0.2);
            ctx.fillRect(x, y, 1, 1);
          }
        }
        // bark edges
        ctx.fillStyle = shade(b.color, 0.6);
        ctx.fillRect(0, 0, 1, SIZE);
        ctx.fillRect(SIZE - 1, 0, 1, SIZE);
        break;
      }
      case BlockId.Leaves: {
        noisyFill(ctx, b.color, 0.25, salt);
        // poke holes for transparency feel
        for (let i = 0; i < 10; i++) {
          const x = Math.floor(pxRand(i, i * 2, salt) * SIZE);
          const y = Math.floor(pxRand(i * 3, i, salt) * SIZE);
          ctx.fillStyle = shade(b.accent!, 1.2);
          ctx.fillRect(x, y, 1, 1);
        }
        break;
      }
      case BlockId.Sand:
        noisyFill(ctx, b.color, 0.06, salt);
        break;
      case BlockId.Snow:
        noisyFill(ctx, b.color, 0.04, salt);
        // sparkle dots
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.floor(pxRand(i, 0, salt) * SIZE), Math.floor(pxRand(i, 1, salt) * SIZE), 1, 1);
        }
        break;
      case BlockId.Ice:
        noisyFill(ctx, b.color, 0.08, salt);
        // diagonal shine
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(8, 8); ctx.stroke();
        break;
      case BlockId.Plank: {
        for (let y = 0; y < SIZE; y++) {
          const row = Math.floor(y / 4);
          const m = row % 2 === 0 ? 1.0 : 0.88;
          for (let x = 0; x < SIZE; x++) {
            ctx.fillStyle = shade(b.color, m + (pxRand(x, y, salt) - 0.5) * 0.1);
            ctx.fillRect(x, y, 1, 1);
          }
          ctx.fillStyle = shade(b.color, 0.6);
          ctx.fillRect(0, y, SIZE, 1); // plank seam
          y += 0;
        }
        // nails
        ctx.fillStyle = '#3a2a18';
        ctx.fillRect(1, 1, 1, 1); ctx.fillRect(14, 1, 1, 1);
        ctx.fillRect(1, 14, 1, 1); ctx.fillRect(14, 14, 1, 1);
        break;
      }
      case BlockId.StoneBrick: {
        noisyFill(ctx, b.color, 0.05, salt);
        ctx.fillStyle = shade(b.color, 0.5);
        // brick mortar lines
        ctx.fillRect(0, 7, SIZE, 1);
        ctx.fillRect(0, 15, SIZE, 1);
        ctx.fillRect(7, 0, 1, 8);
        ctx.fillRect(3, 8, 1, 8);
        ctx.fillRect(12, 8, 1, 8);
        break;
      }
      case BlockId.Glass: {
        ctx.fillStyle = 'rgba(207,234,255,0.35)';
        ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.strokeStyle = shade(b.color, 0.7);
        ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1);
        // reflection streak
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.moveTo(3, 3); ctx.lineTo(8, 3); ctx.lineTo(12, 9); ctx.stroke();
        break;
      }
      case BlockId.IronOre:
        drawOre(ctx, '#7d7d7d', b.accent!, salt); break;
      case BlockId.GoldOre:
        drawOre(ctx, '#7d7d7d', b.accent!, salt); break;
      case BlockId.DiamondOre:
        drawOre(ctx, '#7d7d7d', b.accent!, salt); break;
      case BlockId.CoalOre:
        drawOre(ctx, '#7d7d7d', '#1a1a1a', salt); break;
      case BlockId.Coal:
        noisyFill(ctx, b.color, 0.15, salt); break;
      case BlockId.Torch: {
        // stick
        ctx.fillStyle = '#6b4a2b';
        ctx.fillRect(7, 6, 2, 10);
        // flame
        ctx.fillStyle = '#ff8000';
        ctx.fillRect(6, 3, 4, 4);
        ctx.fillStyle = '#ffd040';
        ctx.fillRect(7, 4, 2, 2);
        ctx.fillStyle = '#ffff80';
        ctx.fillRect(7, 5, 1, 1);
        break;
      }
      case BlockId.CraftingTable: {
        // top grid
        noisyFill(ctx, b.color, 0.08, salt);
        ctx.fillStyle = shade(b.color, 0.5);
        ctx.fillRect(0, 0, SIZE, 2);
        ctx.strokeStyle = shade(b.color, 0.6);
        ctx.beginPath();
        ctx.moveTo(4, 0); ctx.lineTo(4, 2);
        ctx.moveTo(8, 0); ctx.lineTo(8, 2);
        ctx.moveTo(12, 0); ctx.lineTo(12, 2);
        ctx.stroke();
        // saw on the side
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(3, 6, 10, 1);
        for (let i = 0; i < 10; i++) ctx.fillRect(3 + i, 7, 1, 1);
        break;
      }
      case BlockId.Door: {
        ctx.fillStyle = b.color;
        ctx.fillRect(2, 0, 12, SIZE);
        ctx.fillStyle = shade(b.color, 0.8);
        ctx.fillRect(2, 0, 1, SIZE);
        ctx.fillRect(13, 0, 1, SIZE);
        // panels
        ctx.strokeStyle = shade(b.color, 0.6);
        ctx.strokeRect(4, 2, 8, 4);
        ctx.strokeRect(4, 9, 8, 4);
        // handle
        ctx.fillStyle = '#ffd040';
        ctx.fillRect(11, 7, 1, 2);
        break;
      }
      case BlockId.Water: {
        const g = ctx.createLinearGradient(0, 0, 0, SIZE);
        g.addColorStop(0, 'rgba(90,142,224,0.7)');
        g.addColorStop(1, 'rgba(40,90,180,0.8)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, SIZE, SIZE);
        // wave highlights
        ctx.fillStyle = 'rgba(180,220,255,0.4)';
        ctx.fillRect(2, 3, 6, 1);
        ctx.fillRect(9, 8, 5, 1);
        break;
      }
      case BlockId.Lava: {
        const g = ctx.createLinearGradient(0, 0, 0, SIZE);
        g.addColorStop(0, '#ffaa20');
        g.addColorStop(1, '#e04020');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.fillStyle = '#ffe060';
        ctx.fillRect(2, 3, 3, 1);
        ctx.fillRect(10, 7, 4, 1);
        break;
      }
      case BlockId.Bedrock:
        noisyFill(ctx, b.color, 0.2, salt);
        ctx.fillStyle = '#444';
        ctx.fillRect(3, 4, 3, 3); ctx.fillRect(9, 8, 4, 3); ctx.fillRect(5, 11, 3, 2);
        break;
      case BlockId.Cloud: {
        noisyFill(ctx, '#ffffff', 0.04, salt);
        ctx.fillStyle = 'rgba(232,232,240,0.6)';
        ctx.fillRect(0, 4, SIZE, 8);
        break;
      }
      case BlockId.WoodPlatform: {
        ctx.fillStyle = b.color;
        ctx.fillRect(0, 4, SIZE, 6);
        ctx.fillStyle = shade(b.color, 0.6);
        ctx.fillRect(0, 9, SIZE, 1);
        ctx.fillStyle = shade(b.color, 1.2);
        ctx.fillRect(0, 4, SIZE, 1);
        break;
      }
      default:
        noisyFill(ctx, b.color, 0.1, salt);
        bevel(ctx, shade(b.color, 1.2), shade(b.color, 0.6));
    }
  });
}

// cache break-stage crack overlays (0..9)
const crackStages: HTMLCanvasElement[] = [];
export function getCrackOverlay(stage: number): HTMLCanvasElement {
  const s = Math.max(0, Math.min(9, stage));
  if (crackStages[s]) return crackStages[s];
  return register(`crack:${s}`, (ctx) => {
    const density = s / 9;
    ctx.strokeStyle = `rgba(0,0,0,${0.25 + density * 0.5})`;
    ctx.lineWidth = 1;
    const count = Math.ceil(density * 8);
    for (let i = 0; i < count; i++) {
      const x = 1 + Math.floor(pxRand(i, i * 3, s + 1) * (SIZE - 2));
      const y = 1 + Math.floor(pxRand(i * 5, i, s + 3) * (SIZE - 2));
      const len = 2 + Math.floor(pxRand(i, i * 7, s + 5) * 3);
      const dir = pxRand(i, i * 2, s + 9) > 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (dir ? len : 0), y + (dir ? 0 : len));
      ctx.stroke();
    }
    if (s >= 7) {
      // big dark blotch
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(4, 4, 8, 8);
    }
  });
}

// ---- Sprite (entity) textures ----
export function getBlockTexture(id: BlockId): HTMLCanvasElement {
  if (id === BlockId.Air) return makeCanvas(); // empty
  return drawBlock(id);
}

/** Generic helper to fetch + cache a named sprite via a draw fn. */
export function getSprite(name: string, draw: DrawFn, w = SIZE, h = SIZE): HTMLCanvasElement {
  return register(`sprite:${name}`, draw, w, h);
}

export { shade, hexToRgb, rgb, pxRand, SIZE as TEX_SIZE };
