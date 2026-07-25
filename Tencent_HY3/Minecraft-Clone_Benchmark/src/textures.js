import * as THREE from 'three'

const TILE = 16
const COLS = 8

function hexToRgb(h) {
  h = h.replace('#', '')
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]
}
function rgbToHex(r, g, b) {
  const c = (v) => ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2)
  return '#' + c(r) + c(g) + c(b)
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + amt, g + amt, b + amt)
}
function makeTile(draw) {
  const c = document.createElement('canvas')
  c.width = TILE; c.height = TILE
  const ctx = c.getContext('2d')
  draw(ctx)
  return c
}
function px(ctx, x, y, color) { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1) }
function noiseFill(ctx, base, variation) {
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++)
      px(ctx, x, y, shade(base, (Math.random() * 2 - 1) * variation))
}

const painters = {
  grass_top: (c) => noiseFill(c, '#5fb24b', 22),
  grass_side: (c) => {
    noiseFill(c, '#8a6240', 14)
    for (let x = 0; x < 16; x++) {
      const h = 4 + (Math.random() < 0.35 ? 1 : 0)
      for (let y = 0; y < h; y++) px(c, x, y, shade('#5fb24b', (Math.random() * 2 - 1) * 22))
    }
  },
  dirt: (c) => noiseFill(c, '#8a6240', 14),
  stone: (c) => noiseFill(c, '#8a8a8a', 18),
  cobblestone: (c) => {
    noiseFill(c, '#8f8f8f', 12)
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(Math.random() * 16), y = Math.floor(Math.random() * 16)
      px(c, x, y, shade('#6f6f6f', (Math.random() * 2 - 1) * 16))
    }
  },
  log_side: (c) => {
    noiseFill(c, '#6b4a2b', 10)
    for (let x = 1; x < 16; x += 4)
      for (let y = 0; y < 16; y++) px(c, x, y, shade('#523619', 6))
  },
  log_top: (c) => {
    c.fillStyle = '#b8945a'; c.fillRect(0, 0, 16, 16)
    for (let r = 1; r < 8; r++) {
      c.strokeStyle = shade('#b8945a', r % 2 ? -22 : 22); c.lineWidth = 1
      c.beginPath(); c.arc(8, 8, r, 0, Math.PI * 2); c.stroke()
    }
  },
  planks: (c) => {
    noiseFill(c, '#b08a4f', 10)
    for (let y = 0; y < 16; y += 4)
      for (let x = 0; x < 16; x++) px(c, x, y, shade('#7a5a2c', 9))
    for (let x = 4; x < 16; x += 8)
      for (let y = 0; y < 16; y++) px(c, x, y, shade('#7a5a2c', 9))
  },
  leaves: (c) => noiseFill(c, '#3f8f3a', 34),
  sand: (c) => noiseFill(c, '#e0d29a', 12),
  brick: (c) => {
    c.fillStyle = '#9c4a3a'; c.fillRect(0, 0, 16, 16)
    c.fillStyle = '#d8b9a0'
    for (let y = 0; y < 16; y += 4) c.fillRect(0, y, 16, 1)
    for (let y = 0; y < 16; y += 4) {
      const off = (Math.floor(y / 4) % 2) * 4
      for (let x = off; x < 16; x += 8) c.fillRect(x, y, 1, 4)
    }
  },
  glass: (c) => {
    c.fillStyle = '#bfe0f0'; c.fillRect(0, 0, 16, 16)
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(2, 2, 5, 1); c.fillRect(2, 2, 1, 6)
    c.strokeStyle = 'rgba(90,140,170,0.8)'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, 15, 15)
  },
  bedrock: (c) => noiseFill(c, '#3a3a3a', 22)
}

const ORDER = ['grass_top', 'grass_side', 'dirt', 'stone', 'cobblestone', 'log_side', 'log_top', 'planks', 'leaves', 'sand', 'brick', 'glass', 'bedrock']
const atlas = document.createElement('canvas')
const ROWS = Math.ceil(ORDER.length / COLS)
const atlasW = COLS * TILE
const atlasH = ROWS * TILE
atlas.width = atlasW; atlas.height = atlasH
const actx = atlas.getContext('2d')
ORDER.forEach((name, i) => {
  const tile = makeTile(painters[name])
  const col = i % COLS, row = Math.floor(i / COLS)
  actx.drawImage(tile, col * TILE, row * TILE)
})
export const atlasTexture = new THREE.CanvasTexture(atlas)
atlasTexture.magFilter = THREE.NearestFilter
atlasTexture.minFilter = THREE.NearestFilter
atlasTexture.colorSpace = THREE.SRGBColorSpace

export function tileIndex(name) { return ORDER.indexOf(name) }
export function tileUV(i) {
  const col = i % COLS, row = Math.floor(i / COLS)
  const u0 = (col * TILE + 0.5) / atlasW
  const u1 = (col * TILE + TILE - 0.5) / atlasW
  const v1 = 1 - (row * TILE + 0.5) / atlasH
  const v0 = 1 - (row * TILE + TILE - 0.5) / atlasH
  return { u0, u1, v0, v1 }
}

export const crackTextures = []
for (let s = 1; s <= 10; s++) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, 16, 16)
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1
  const lines = s * 2
  for (let i = 0; i < lines; i++) {
    ctx.beginPath()
    ctx.moveTo(Math.random() * 16, Math.random() * 16)
    ctx.lineTo(Math.random() * 16, Math.random() * 16)
    ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter
  crackTextures.push(t)
}
