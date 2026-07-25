export const WORLD = {
  seed: 74291,
  blockSize: 46,
  roadWidth: 14,
  blocksPerAxis: 7,
  coastZ: -178,
  worldLimit: 170,
  trafficCount: 18,
  treeCount: 72,
} as const;

export const VEHICLE = {
  maxForwardSpeed: 48,
  maxReverseSpeed: 13,
  acceleration: 16,
  reverseAcceleration: 9,
  braking: 28,
  rollingResistance: 4.2,
  steeringRate: 1.75,
  wheelBase: 2.75,
} as const;

export const RENDERING = {
  maxPixelRatio: 1.7,
  shadowMapSize: 4096,
  fogDensity: 0.00245,
  exposure: 0.98,
  targetFps: 50,
} as const;

export type QualityLevel = "ULTRA" | "HIGH" | "BALANCED";
