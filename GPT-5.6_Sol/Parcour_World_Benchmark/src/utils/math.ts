import * as THREE from 'three';

export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const damp = (current: number, target: number, smoothing: number, dt: number): number =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * dt));

export const moveTowards = (current: number, target: number, maxDelta: number): number => {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
};

export const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};
