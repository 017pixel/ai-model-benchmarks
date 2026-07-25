import * as THREE from 'three'
import { AIR, BLOCKS, isOpaque } from './blocks.js'
import { atlasTexture, tileUV } from './textures.js'

const WORLD_W = 64
const WORLD_D = 64
const WORLD_H = 40
const CHUNK = 16

// ---- value noise ----
function makeNoise(seed) {
  const size = 256
  const r = new Float32Array(size * size)
  let s = seed
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  for (let i = 0; i < r.length; i++) r[i] = rnd()
  const at = (ix, iz) => { ix = ((ix % size) + size) % size; iz = ((iz % size) + size) % size; return r[ix + iz * size] }
  const smooth = (t) => t * t * (3 - 2 * t)
  return (x, z) => {
    const x0 = Math.floor(x), z0 = Math.floor(z)
    const xf = x - x0, zf = z - z0
    const v00 = at(x0, z0), v10 = at(x0 + 1, z0), v01 = at(x0, z0 + 1), v11 = at(x0 + 1, z0 + 1)
    const sx = smooth(xf), sz = smooth(zf)
    const a = v00 + (v10 - v00) * sx
    const b = v01 + (v11 - v01) * sx
    return a + (b - a) * sz
  }
}

const FACES = [
  { dir: [1, 0, 0], shade: 0.8, verts: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { dir: [-1, 0, 0], shade: 0.8, verts: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { dir: [0, 1, 0], shade: 1.0, verts: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]] },
  { dir: [0, -1, 0], shade: 0.55, verts: [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]] },
  { dir: [0, 0, 1], shade: 0.7, verts: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { dir: [0, 0, -1], shade: 0.7, verts: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] }
]

export class World {
  constructor(scene) {
    this.scene = scene
    this.W = WORLD_W
    this.D = WORLD_D
    this.data = new Uint8Array(WORLD_W * WORLD_D * WORLD_H)
    this.chunks = new Map()
    this.material = new THREE.MeshLambertMaterial({ map: atlasTexture, vertexColors: true, side: THREE.DoubleSide })
    this._generate()
    this._buildAll()
    this.spawn = new THREE.Vector3(WORLD_W / 2, 0, WORLD_D / 2)
    this.spawn.y = this.surfaceHeight(this.spawn.x, this.spawn.z) + 1
  }

  inBounds(x, y, z) { return x >= 0 && x < WORLD_W && z >= 0 && z < WORLD_D && y >= 0 && y < WORLD_H }
  idx(x, y, z) { return x + z * WORLD_W + y * WORLD_W * WORLD_D }
  get(x, y, z) {
    if (!this.inBounds(x, y, z)) return AIR
    return this.data[this.idx(x, y, z)]
  }
  set(x, y, z, t) {
    if (!this.inBounds(x, y, z)) return
    this.data[this.idx(x, y, z)] = t
    this._rebuildChunk(x, z)
    if (x % CHUNK === 0) this._rebuildChunk(x - 1, z)
    if (x % CHUNK === CHUNK - 1) this._rebuildChunk(x + 1, z)
    if (z % CHUNK === 0) this._rebuildChunk(x, z - 1)
    if (z % CHUNK === CHUNK - 1) this._rebuildChunk(x, z + 1)
  }
  surfaceHeight(x, z) {
    for (let y = WORLD_H - 1; y >= 0; y--) if (this.get(x, y, z) !== AIR) return y
    return 0
  }

  _generate() {
    const noise = makeNoise(1337)
    const fbm = (x, z) => {
      let v = 0, amp = 1, freq = 1 / 28, sum = 0
      for (let o = 0; o < 4; o++) { v += noise(x * freq, z * freq) * amp; sum += amp; amp *= 0.5; freq *= 2 }
      return v / sum
    }
    for (let x = 0; x < WORLD_W; x++)
      for (let z = 0; z < WORLD_D; z++) {
        const h = Math.floor(8 + fbm(x, z) * 22)
        for (let y = 0; y <= h; y++) {
          let t
          if (y === 0) t = 11
          else if (y < h - 3) t = 3
          else if (y < h) t = 2
          else t = 1
          this.data[this.idx(x, y, z)] = t
        }
        if (Math.random() < 0.02 && h > 2) this._tree(x, h + 1, z)
      }
  }

  _tree(x, y, z) {
    const h = 4 + Math.floor(Math.random() * 2)
    for (let i = 0; i < h; i++) this._safeSet(x, y + i, z, 5)
    const top = y + h
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        for (let dy = -1; dy <= 1; dy++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue
          if (dx === 0 && dz === 0 && dy < 0) continue
          this._safeSet(x + dx, top + dy, z + dz, 7)
        }
    this._safeSet(x, top + 1, z, 7)
  }
  _safeSet(x, y, z, t) { if (this.inBounds(x, y, z)) this.data[this.idx(x, y, z)] = t }

  _chunkKey(cx, cz) { return cx + ',' + cz }
  _rebuildChunk(x, z) {
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK)
    const key = this._chunkKey(cx, cz)
    const old = this.chunks.get(key)
    if (old) { this.scene.remove(old); old.geometry.dispose() }
    const mesh = this._buildChunkMesh(cx, cz)
    if (mesh) { this.scene.add(mesh); this.chunks.set(key, mesh) }
    else this.chunks.delete(key)
  }
  _buildAll() {
    for (let cx = 0; cx < WORLD_W / CHUNK; cx++)
      for (let cz = 0; cz < WORLD_D / CHUNK; cz++) {
        const mesh = this._buildChunkMesh(cx, cz)
        if (mesh) { this.scene.add(mesh); this.chunks.set(this._chunkKey(cx, cz), mesh) }
      }
  }

  _buildChunkMesh(cx, cz) {
    const pos = [], nor = [], uv = [], col = []
    const x0 = cx * CHUNK, z0 = cz * CHUNK
    for (let x = x0; x < x0 + CHUNK; x++)
      for (let z = z0; z < z0 + CHUNK; z++)
        for (let y = 0; y < WORLD_H; y++) {
          const t = this.get(x, y, z)
          if (t === AIR) continue
          const def = BLOCKS[t]
          for (let f = 0; f < 6; f++) {
            const face = FACES[f]
            const [dx, dy, dz] = face.dir
            const nb = this.get(x + dx, y + dy, z + dz)
            const visible = nb === AIR || (isOpaque(nb) ? false : nb !== t)
            if (!visible) continue
            const tile = def[dx === 0 && dy === 1 ? 'top' : dx === 0 && dy === -1 ? 'bottom' : 'side']
            const tv = tileUV(tile)
            const corners = face.verts
            const tri = [0, 1, 2, 0, 2, 3]
            for (const vi of tri) {
              const [vx, vy, vz] = corners[vi]
              pos.push(x + vx, y + vy, z + vz)
              nor.push(dx, dy, dz)
              const u = vi === 1 || vi === 2 ? tv.u1 : tv.u0
              const w = vi === 2 || vi === 3 ? tv.v1 : tv.v0
              uv.push(u, w)
              col.push(face.shade, face.shade, face.shade)
            }
          }
        }
    if (pos.length === 0) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    return new THREE.Mesh(g, this.material)
  }

  raycast(origin, dir, max) {
    let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z)
    const stepX = Math.sign(dir.x), stepY = Math.sign(dir.y), stepZ = Math.sign(dir.z)
    const tDX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity
    const tDY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity
    const tDZ = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity
    let tMX = dir.x !== 0 ? ((stepX > 0 ? x + 1 - origin.x : origin.x - x) / Math.abs(dir.x)) : Infinity
    let tMY = dir.y !== 0 ? ((stepY > 0 ? y + 1 - origin.y : origin.y - y) / Math.abs(dir.y)) : Infinity
    let tMZ = dir.z !== 0 ? ((stepZ > 0 ? z + 1 - origin.z : origin.z - z) / Math.abs(dir.z)) : Infinity
    let nx = 0, ny = 0, nz = 0, t = 0
    for (let i = 0; i < 256; i++) {
      if (this.get(x, y, z) !== AIR) return { x, y, z, nx, ny, nz }
      if (tMX < tMY && tMX < tMZ) { x += stepX; t = tMX; tMX += tDX; nx = -stepX; ny = 0; nz = 0 }
      else if (tMY < tMZ) { y += stepY; t = tMY; tMY += tDY; nx = 0; ny = -stepY; nz = 0 }
      else { z += stepZ; t = tMZ; tMZ += tDZ; nx = 0; ny = 0; nz = -stepZ }
      if (t > max) break
    }
    return null
  }
}

export { WORLD_W, WORLD_D, WORLD_H, CHUNK }
