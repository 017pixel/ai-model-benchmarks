// Entry point: bootstrap canvas, handle loading screen, and start the game.
// Generates a random seed on first play, or loads an existing save.

import { Game } from './game/Game';
import { SaveSystem } from './save/SaveSystem';
import { RNG } from './game/Noise';
import { getBlockTexture } from './textures/TextureAtlas';
import { BlockId } from './block/Blocks';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize() {
  // Render at CSS pixel resolution. The canvas CSS (image-rendering: pixelated)
  // handles crisp upscaling, so we keep the backing store 1:1 with the viewport
  // — simpler coordinate math and plenty fast for a tile game.
  canvas.width = Math.floor(window.innerWidth);
  canvas.height = Math.floor(window.innerHeight);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

// show a loading screen, then bootstrap once textures are warmed up
async function boot() {
  // warm up the texture cache by drawing every block once (off-screen)
  await new Promise((resolve) => setTimeout(resolve, 30));
  const loading = document.getElementById('loading')!;
  try {
    // pre-generate all block textures
    for (const idStr of Object.keys(getAllBlockIds())) {
      getBlockTexture(Number(idStr) as BlockId);
    }
  } catch (e) {
    console.warn('texture warmup issue', e);
  }

  // pick seed: reuse from save, or random
  const save = SaveSystem.load();
  const seed = save ? save.seed : (new RNG((Date.now() & 0xffffffff) >>> 0).int(1, 1_000_000_000));

  const game = new Game(canvas, seed, save);

  // hide loading screen
  loading.style.transition = 'opacity 0.4s';
  loading.style.opacity = '0';
  setTimeout(() => loading.remove(), 450);

  game.start();
}

function getAllBlockIds(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(BlockId).filter((k) => isNaN(Number(k)))) {
    out[(BlockId as any)[k]] = (BlockId as any)[k];
  }
  return out;
}

boot();
