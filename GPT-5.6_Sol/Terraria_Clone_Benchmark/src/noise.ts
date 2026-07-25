export function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function noise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return top + (bottom - top) * fy;
}

export function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let value = 0;
  let amplitude = 0.55;
  let frequency = 1;
  let total = 0;
  for (let i = 0; i < octaves; i += 1) {
    value += noise2(x * frequency, y * frequency, seed + i * 1013) * amplitude;
    total += amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }
  return value / total;
}
