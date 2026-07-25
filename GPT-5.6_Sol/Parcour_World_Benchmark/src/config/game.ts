export const GAME_CONFIG = {
  world: {
    size: 820,
    fogNear: 70,
    fogFar: 210,
    gravity: 25,
    spatialCellSize: 16,
  },
  player: {
    radius: 0.38,
    standingHeight: 1.78,
    crouchingHeight: 1.05,
    eyeOffset: 1.62,
    walkSpeed: 6.2,
    sprintSpeed: 10.8,
    groundAcceleration: 46,
    airAcceleration: 17,
    groundFriction: 11,
    jumpSpeed: 8.4,
    doubleJumpSpeed: 7.6,
    longJumpSpeed: 13.8,
    dashSpeed: 18,
    dashDuration: 0.16,
    dashCooldown: 1.15,
    slideDuration: 1.25,
    wallRunDuration: 1.35,
    wallClimbDuration: 0.65,
    wallRunGravity: 5.5,
    wallJumpVertical: 8.8,
    wallJumpPush: 8,
    coyoteTime: 0.13,
    jumpBuffer: 0.14,
    maxFallSpeed: 32,
  },
  camera: {
    baseFov: 78,
    sprintFov: 88,
    dashFov: 94,
    mouseSensitivity: 0.0018,
    maxPitch: Math.PI * 0.485,
  },
  renderer: {
    maxPixelRatio: 1.75,
    shadowMapSize: 2048,
  },
} as const;

export type MovementState =
  | 'ROAM'
  | 'SPRINT'
  | 'AIR'
  | 'DOUBLE JUMP'
  | 'LONG JUMP'
  | 'SLIDE'
  | 'WALL RUN'
  | 'WALL CLIMB'
  | 'WALL JUMP'
  | 'MANTLE'
  | 'VAULT'
  | 'LEDGE HANG'
  | 'GRIND'
  | 'DASH';
