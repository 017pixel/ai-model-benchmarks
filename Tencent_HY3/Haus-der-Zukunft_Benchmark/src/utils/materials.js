import * as THREE from 'three';
import { COLORS } from './constants.js';

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function woodTexture(base, grain) {
  return canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = grain;
      ctx.globalAlpha = 0.05 + Math.random() * 0.08;
      ctx.lineWidth = 0.5 + Math.random() * 2;
      const y = Math.random() * s;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 16) {
        ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3 + (Math.random() - 0.5) * 2);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

function floorPlankTexture() {
  return canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = '#c8a06a';
    ctx.fillRect(0, 0, s, s);
    const plank = s / 6;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#c19a62' : '#caa46e';
      ctx.fillRect(0, i * plank, s, plank - 2);
      ctx.strokeStyle = 'rgba(90,60,30,0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, i * plank, s, plank - 2);
    }
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = 'rgba(90,60,30,0.12)';
      ctx.beginPath();
      const y = Math.random() * s;
      ctx.moveTo(0, y);
      ctx.lineTo(s, y + (Math.random() - 0.5) * 4);
      ctx.stroke();
    }
  });
}

function wallTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#f2f0ec';
    ctx.fillRect(0, 0, s, s);
    ctx.globalAlpha = 0.015;
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
      ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
    }
    ctx.globalAlpha = 1;
  });
}

const cache = {};
export function materials() {
  if (cache.m) return cache.m;

  const floorTex = floorPlankTexture();
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(5, 4);

  const wallTex = wallTexture();
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(3, 2);

  const woodTex = woodTexture('#c8a06a', '#8a6326');
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;

  cache.m = {
    wall: new THREE.MeshStandardMaterial({ color: COLORS.warmWhite, map: wallTex, roughness: 0.95, metalness: 0.0 }),
    wallWhite: new THREE.MeshStandardMaterial({ color: COLORS.whiteWall, roughness: 0.9 }),
    floor: new THREE.MeshStandardMaterial({ color: 0xffffff, map: floorTex, roughness: 0.55, metalness: 0.0 }),
    floorConcrete: new THREE.MeshStandardMaterial({ color: 0x9a9a96, roughness: 0.85 }),
    slab: new THREE.MeshStandardMaterial({ color: 0xd8d4cd, roughness: 0.8 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xffffff, map: woodTex, roughness: 0.6 }),
    woodDark: new THREE.MeshStandardMaterial({ color: COLORS.darkWood, roughness: 0.6 }),
    black: new THREE.MeshStandardMaterial({ color: COLORS.matteBlack, roughness: 0.55, metalness: 0.25 }),
    metal: new THREE.MeshStandardMaterial({ color: COLORS.metal, roughness: 0.32, metalness: 0.9 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x6c6f75, roughness: 0.4, metalness: 0.85 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: COLORS.glass, roughness: 0.06, metalness: 0,
      transmission: 0.92, thickness: 0.4, ior: 1.45,
      transparent: true, opacity: 0.5, reflectivity: 0.4
    }),
    glassDark: new THREE.MeshPhysicalMaterial({
      color: 0x223044, roughness: 0.12, metalness: 0,
      transmission: 0.6, thickness: 0.3, ior: 1.45,
      transparent: true, opacity: 0.7
    }),
    tech: new THREE.MeshStandardMaterial({ color: COLORS.darkTech, roughness: 0.6, metalness: 0.5 }),
    techPanel: new THREE.MeshStandardMaterial({ color: COLORS.techPanel, roughness: 0.5, metalness: 0.6 }),
    fabric: new THREE.MeshStandardMaterial({ color: COLORS.fabric, roughness: 0.95 }),
    fabricDark: new THREE.MeshStandardMaterial({ color: COLORS.fabricDark, roughness: 0.95 }),
    stone: new THREE.MeshStandardMaterial({ color: COLORS.stone, roughness: 0.4, metalness: 0.05 }),
    leaf: new THREE.MeshStandardMaterial({ color: COLORS.leaf, roughness: 0.8, side: THREE.DoubleSide }),
    leafDark: new THREE.MeshStandardMaterial({ color: 0x3c6632, roughness: 0.85, side: THREE.DoubleSide }),
    soil: new THREE.MeshStandardMaterial({ color: COLORS.soil, roughness: 1 }),
    screen: new THREE.MeshStandardMaterial({ color: COLORS.screen, roughness: 0.25, metalness: 0.1, emissive: 0x102a4a, emissiveIntensity: 0 }),
    screenOff: new THREE.MeshStandardMaterial({ color: 0x05080f, roughness: 0.3 }),
    carpet: new THREE.MeshStandardMaterial({ color: COLORS.carpet, roughness: 1 }),
    accent: new THREE.MeshStandardMaterial({ color: COLORS.accent, roughness: 0.5, metalness: 0.3 }),
    solar: new THREE.MeshStandardMaterial({ color: COLORS.solar, roughness: 0.18, metalness: 0.6 }),
    solarCell: new THREE.MeshStandardMaterial({ color: COLORS.solarCell, roughness: 0.25, metalness: 0.5 }),
    emitter: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1d6, emissiveIntensity: 1.4, roughness: 0.4 }),
    ledGreen: new THREE.MeshStandardMaterial({ color: 0x103018, emissive: 0x4cd964, emissiveIntensity: 1.6, roughness: 0.4 }),
    ledAmber: new THREE.MeshStandardMaterial({ color: 0x301f08, emissive: 0xe0a020, emissiveIntensity: 1.4, roughness: 0.4 }),
    ledRed: new THREE.MeshStandardMaterial({ color: 0x300808, emissive: 0xd8442a, emissiveIntensity: 1.4, roughness: 0.4 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x5b7d44, roughness: 1 }),
    asphalt: new THREE.MeshStandardMaterial({ color: 0x3b3d42, roughness: 0.95 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x6b513a, roughness: 0.9 }),
    whiteEmissive: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.4 })
  };
  return cache.m;
}
