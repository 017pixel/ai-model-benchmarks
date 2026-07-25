// ===========================================================================
// Prozedurale Pixel-Art Texturen für Blöcke & Entities
// Jede Textur wird einmal als kleiner Offscreen-Canvas gerendert.
// ===========================================================================
import { BLOCK, BLOCK_PROPS, CONFIG } from '../config.js';
import { mulberry32 } from './rng.js';

function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + amt)));
  g = Math.max(0, Math.min(255, Math.round(g + amt)));
  b = Math.max(0, Math.min(255, Math.round(b + amt)));
  return `rgb(${r},${g},${b})`;
}

// Erzeugt eine Textur für einen Blocktyp (TEX x TEX Pixel)
function makeBlockTexture(type, TEX) {
  const c = document.createElement('canvas');
  c.width = TEX;
  c.height = TEX;
  const ctx = c.getContext('2d');
  const rnd = mulberry32(type * 99173 + 7);
  ctx.imageSmoothingEnabled = false;

  const base = {
    [BLOCK.GRASS]: '#6cae4e',
    [BLOCK.DIRT]: '#8a5a33',
    [BLOCK.STONE]: '#8b8b94',
    [BLOCK.PLANK]: '#c79a5b',
    [BLOCK.LEAVES]: '#4f9a3f',
    [BLOCK.SAND]: '#e2cf94',
    [BLOCK.WATER]: '#3f7fd0',
    [BLOCK.COAL]: '#8b8b94',
    [BLOCK.IRON]: '#8b8b94',
    [BLOCK.GOLD]: '#8b8b94',
    [BLOCK.LOG]: '#7a5230',
    [BLOCK.GLASS]: '#bfe3ff',
    [BLOCK.BRICK]: '#a85545',
    [BLOCK.TORCH]: '#3a2a1a',
    [BLOCK.CLOUD]: '#e8eef7',
  }[type] || '#999999';

  // Füllung mit leichter Variation
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const v = (rnd() - 0.5) * 26;
      px(ctx, x, y, shade(base, v));
    }
  }

  const dark = shade(base, -34);
  const light = shade(base, 30);

  switch (type) {
    case BLOCK.GRASS: {
      // Grasdecke oben + Erde unten
      for (let x = 0; x < TEX; x++) {
        px(ctx, x, 0, shade('#7cbf59', (rnd() - 0.5) * 30));
        if (rnd() > 0.6) px(ctx, x, 1, '#7cbf59');
        if (rnd() > 0.85) px(ctx, x, 2, '#8fd16a');
      }
      for (let y = 3; y < TEX; y++)
        for (let x = 0; x < TEX; x++)
          px(ctx, x, y, shade('#8a5a33', (rnd() - 0.5) * 24));
      break;
    }
    case BLOCK.STONE:
    case BLOCK.COAL:
    case BLOCK.IRON:
    case BLOCK.GOLD: {
      // Gesteinsflecken
      for (let i = 0; i < 6; i++) {
        const cx = Math.floor(rnd() * TEX);
        const cy = Math.floor(rnd() * TEX);
        px(ctx, cx, cy, dark);
        if (rnd() > 0.5) px(ctx, cx + 1, cy, dark);
      }
      if (type === BLOCK.COAL)
        for (let i = 0; i < 5; i++)
          px(ctx, Math.floor(rnd() * TEX), Math.floor(rnd() * TEX), '#1c1c20');
      if (type === BLOCK.IRON)
        for (let i = 0; i < 5; i++)
          px(ctx, Math.floor(rnd() * TEX), Math.floor(rnd() * TEX), '#d98a6a');
      if (type === BLOCK.GOLD)
        for (let i = 0; i < 5; i++)
          px(ctx, Math.floor(rnd() * TEX), Math.floor(rnd() * TEX), '#f3c84b');
      break;
    }
    case BLOCK.PLANK: {
      for (let y = 0; y < TEX; y += 4)
        for (let x = 0; x < TEX; x++) px(ctx, x, y, dark);
      for (let i = 0; i < TEX; i += 5)
        for (let y = 0; y < TEX; y++) px(ctx, i, y, shade(base, -14));
      break;
    }
    case BLOCK.LEAVES: {
      for (let i = 0; i < 10; i++)
        px(ctx, Math.floor(rnd() * TEX), Math.floor(rnd() * TEX), dark);
      break;
    }
    case BLOCK.WATER: {
      for (let x = 0; x < TEX; x++)
        px(ctx, x, Math.floor(rnd() * 2), light);
      ctx.globalAlpha = 0.85;
      break;
    }
    case BLOCK.GLASS: {
      ctx.clearRect(0, 0, TEX, TEX);
      for (let x = 0; x < TEX; x++) { px(ctx, x, 0, '#eaf6ff'); px(ctx, x, TEX - 1, '#9fc7e8'); }
      for (let y = 0; y < TEX; y++) { px(ctx, 0, y, '#eaf6ff'); px(ctx, TEX - 1, y, '#9fc7e8'); }
      px(ctx, 2, 2, '#ffffff');
      break;
    }
    case BLOCK.BRICK: {
      for (let y = 0; y < TEX; y += 4)
        for (let x = 0; x < TEX; x++) px(ctx, x, y, shade('#7d3f33', -10));
      for (let y = 0; y < TEX; y += 8) {
        const off = (y / 8) % 2 === 0 ? 0 : 4;
        for (let x = off; x < TEX; x += 8) px(ctx, x, y, shade('#7d3f33', -10));
      }
      break;
    }
    case BLOCK.TORCH: {
      ctx.clearRect(0, 0, TEX, TEX);
      const mx = (TEX / 2) | 0;
      for (let y = 4; y < TEX; y++) px(ctx, mx, y, '#5a3d23');
      for (let y = 0; y < 4; y++) {
        px(ctx, mx, y, '#ffb347');
        if (y < 3) px(ctx, mx - 1 + (rnd() > 0.5 ? 1 : 0), y, '#ffd66b');
      }
      px(ctx, mx, 0, '#fff2b0');
      break;
    }
    case BLOCK.LOG: {
      for (let x = 0; x < TEX; x++) if (rnd() > 0.7) px(ctx, x, 2, dark);
      for (let y = 0; y < TEX; y += 3) for (let x = 0; x < TEX; x++) px(ctx, x, y, shade('#5e3f24', -8));
      // Jahresringe
      ctx.strokeStyle = shade('#5e3f24', 18);
      ctx.beginPath();
      ctx.arc((TEX / 2) | 0, (TEX / 2) | 0, 2.2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case BLOCK.SAND: {
      for (let i = 0; i < 8; i++) px(ctx, Math.floor(rnd() * TEX), Math.floor(rnd() * TEX), shade(base, 18));
      break;
    }
    case BLOCK.CLOUD: {
      ctx.clearRect(0, 0, TEX, TEX);
      ctx.fillStyle = '#e8eef7';
      ctx.fillRect(0, 4, TEX - 1, TEX - 6);
      break;
    }
  }

  // dezente Außenkante für Tiefe
  if (type !== BLOCK.GLASS && type !== BLOCK.TORCH && type !== BLOCK.CLOUD && type !== BLOCK.WATER) {
    for (let x = 0; x < TEX; x++) px(ctx, x, TEX - 1, dark);
    for (let y = 0; y < TEX; y++) px(ctx, TEX - 1, y, shade(base, -18));
  }
  return c;
}

// Crack-Overlay (Bruchstufen 0..1)
export function makeCrackTexture(stage, TEX) {
  const c = document.createElement('canvas');
  c.width = TEX;
  c.height = TEX;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = 'rgba(20,20,24,0.78)';
  ctx.lineWidth = 1;
  const rnd = mulberry32(stage * 1337 + 3);
  const lines = Math.round(2 + stage * 6);
  for (let i = 0; i < lines; i++) {
    let x = rnd() * TEX;
    let y = rnd() * TEX;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 2 + Math.floor(rnd() * 3);
    for (let s = 0; s < segs; s++) {
      x += (rnd() - 0.5) * TEX * 0.9;
      y += (rnd() - 0.5) * TEX * 0.9;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return c;
}

let _textures = null;
let _cracks = null;

export function getTextures() {
  if (_textures) return _textures;
  const TEX = CONFIG.WORLD.TEX;
  _textures = {};
  for (const key of Object.keys(BLOCK)) {
    const t = BLOCK[key];
    _textures[t] = makeBlockTexture(t, TEX);
  }
  return _textures;
}

export function getCrack(stage) {
  if (!_cracks) _cracks = {};
  const s = Math.max(0, Math.min(9, Math.floor(stage * 10)));
  if (!_cracks[s]) _cracks[s] = makeCrackTexture(s / 9, CONFIG.WORLD.TEX);
  return _cracks[s];
}

// Item-Icons (Werkzeuge) als kleine Canvas
export function getItemIcon(item, size = 28) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);
  const u = size / 16;
  const rect = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * u, y * u, w * u, h * u); };
  if (item === 100) {
    // Spitzhacke
    rect(2, 2, 12, 2, '#b8bccb');
    rect(3, 3, 10, 1, '#e6e9f2');
    rect(7, 3, 2, 11, '#6b4226');
    rect(6, 12, 4, 2, '#4d2f1a');
  } else if (item === 101) {
    // Schwert
    rect(7, 1, 2, 12, '#d9dde8');
    rect(8, 1, 1, 10, '#ffffff');
    rect(5, 12, 6, 2, '#6b4226');
    rect(7, 13, 2, 2, '#caa24a');
  } else if (item === 102) {
    // Axt
    rect(2, 2, 8, 6, '#b8bccb');
    rect(3, 3, 6, 4, '#e6e9f2');
    rect(8, 4, 2, 11, '#6b4226');
  } else if (item === 103) {
    // Boss-Ruf
    rect(6, 2, 4, 12, '#7d3f33');
    rect(5, 5, 6, 5, '#caa24a');
    rect(7, 6, 2, 3, '#3a2a1a');
  } else if (item === 104) {
    rect(5, 4, 6, 9, '#e0556a');
    rect(4, 7, 2, 3, '#e0556a');
    rect(10, 7, 2, 3, '#e0556a');
    rect(5, 5, 6, 2, '#ff8a9a');
  }
  return c;
}
