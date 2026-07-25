import * as THREE from 'three';
import type { BlockType } from './config';

type Pattern = 'grass' | 'grass-side' | 'dirt' | 'stone' | 'wood' | 'wood-top' | 'leaves' | 'sand' | 'brick';

const palette: Record<Pattern, string[]> = {
  grass: ['#4f7f3a', '#629347', '#75a554', '#87b961'],
  'grass-side': ['#476f35', '#5a8240', '#79553a', '#68482f'],
  dirt: ['#68462f', '#79543a', '#865f42', '#5a3c29'],
  stone: ['#666b69', '#797e7b', '#898d89', '#585c5b'],
  wood: ['#654326', '#76502d', '#8a6036', '#57391f'],
  'wood-top': ['#8b6035', '#75502d', '#9b7040', '#604021'],
  leaves: ['#315c34', '#3f713e', '#4d8248', '#284c2d'],
  sand: ['#b5a767', '#c8b978', '#d1c487', '#a8995d'],
  brick: ['#743829', '#8d4936', '#a05a43', '#643025'],
};

function seededValue(x: number, y: number, seed = 0): number {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 91.3) * 43758.5453;
  return value - Math.floor(value);
}

function makeTexture(pattern: Pattern): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const context = canvas.getContext('2d')!;
  const colors = palette[pattern];

  context.fillStyle = colors[1];
  context.fillRect(0, 0, 16, 16);

  for (let y = 0; y < 16; y += 2) {
    for (let x = 0; x < 16; x += 2) {
      const index = Math.floor(seededValue(x, y, pattern.length) * colors.length);
      context.fillStyle = colors[index];
      context.fillRect(x, y, 2, 2);
    }
  }

  if (pattern === 'grass-side') {
    context.fillStyle = '#5f9146';
    context.fillRect(0, 0, 16, 5);
    for (let x = 0; x < 16; x += 2) {
      const depth = 2 + Math.floor(seededValue(x, 3) * 5);
      context.fillRect(x, 4, 2, depth);
    }
  }

  if (pattern === 'wood') {
    context.fillStyle = 'rgba(45, 26, 14, 0.26)';
    for (let x = 2; x < 16; x += 5) context.fillRect(x, 0, 1, 16);
  }

  if (pattern === 'wood-top') {
    context.strokeStyle = '#57371d';
    context.lineWidth = 1;
    context.strokeRect(2.5, 2.5, 11, 11);
    context.strokeRect(5.5, 5.5, 5, 5);
  }

  if (pattern === 'brick') {
    context.fillStyle = '#442820';
    context.fillRect(0, 5, 16, 1);
    context.fillRect(0, 11, 16, 1);
    context.fillRect(7, 0, 1, 5);
    context.fillRect(3, 6, 1, 5);
    context.fillRect(11, 12, 1, 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

function material(texture: THREE.Texture, transparent = false): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    map: texture,
    transparent,
    alphaTest: transparent ? 0.35 : 0,
  });
}

export function createBlockMaterials(): Record<BlockType, THREE.Material | THREE.Material[]> {
  const dirt = material(makeTexture('dirt'));
  const grassTop = material(makeTexture('grass'));
  const grassSide = material(makeTexture('grass-side'));
  const woodSide = material(makeTexture('wood'));
  const woodTop = material(makeTexture('wood-top'));
  const leaves = material(makeTexture('leaves'), true);

  return {
    grass: [grassSide, grassSide, grassTop, dirt, grassSide, grassSide],
    dirt,
    stone: material(makeTexture('stone')),
    wood: [woodSide, woodSide, woodTop, woodTop, woodSide, woodSide],
    leaves,
    sand: material(makeTexture('sand')),
    brick: material(makeTexture('brick')),
  };
}

export function createCrackTextures(): THREE.CanvasTexture[] {
  return Array.from({ length: 6 }, (_, stage) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.clearRect(0, 0, 64, 64);
    context.strokeStyle = '#171512';
    context.lineWidth = 2.5;
    context.lineCap = 'square';

    for (let branch = 0; branch <= stage * 2; branch += 1) {
      let x = 32 + (seededValue(branch, stage, 2) - 0.5) * 14;
      let y = 32 + (seededValue(branch, stage, 3) - 0.5) * 14;
      context.beginPath();
      context.moveTo(x, y);
      const segments = 2 + stage;
      for (let segment = 0; segment < segments; segment += 1) {
        x += (seededValue(branch, segment, 7) - 0.5) * 18;
        y += (seededValue(branch, segment, 9) - 0.5) * 18;
        context.lineTo(x, y);
      }
      context.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  });
}
