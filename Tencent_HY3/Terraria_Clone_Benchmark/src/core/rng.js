// ===========================================================================
// Zufallszahlen & Noise (deterministisch, seedbasiert)
// ===========================================================================

// Mulberry32 PRNG
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash-basierte 1D-Value-Noise für die Oberfläche
export function hash1(x, seed) {
  let h = x * 374761393 + seed * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

// 1D Value Noise (kontinuierlich) mit mehreren Oktaven
export function valueNoise1D(x, seed, octaves = 4) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const xi = Math.floor(x * freq);
    const xf = x * freq - xi;
    const a = hash1(xi, seed + o * 17);
    const b = hash1(xi + 1, seed + o * 17);
    sum += smooth(xf) * (b - a) + a * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// 2D Value Noise für Höhlen
export function hash2(x, y, seed) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + seed * 2147483647;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}

export function valueNoise2D(x, y, seed, octaves = 4) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const xi = Math.floor(x * freq);
    const yi = Math.floor(y * freq);
    const xf = x * freq - xi;
    const yf = y * freq - yi;
    const v00 = hash2(xi, yi, seed + o * 31);
    const v10 = hash2(xi + 1, yi, seed + o * 31);
    const v01 = hash2(xi, yi + 1, seed + o * 31);
    const v11 = hash2(xi + 1, yi + 1, seed + o * 31);
    const sx = smooth(xf);
    const sy = smooth(yf);
    const top = v00 + sx * (v10 - v00);
    const bot = v01 + sx * (v11 - v01);
    sum += (top + sy * (bot - top)) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}
