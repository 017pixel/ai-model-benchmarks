import * as THREE from 'three';
import { GAME_CONFIG, type MovementState } from '../config/game';
import { Input } from '../engine/Input';
import { CollisionWorld, type Rail, type SurfaceType } from '../physics/CollisionWorld';
import { clamp01, damp, moveTowards } from '../utils/math';

export interface PlayerTelemetry {
  speed: number;
  momentum: number;
  state: MovementState;
  combo: number;
  comboLabel: string;
  dashReady: number;
  grounded: boolean;
}

export type PlayerEvent =
  | { type: 'step'; surface: SurfaceType; intensity: number }
  | { type: 'jump'; intensity: number }
  | { type: 'land'; surface: SurfaceType; intensity: number }
  | { type: 'slide'; active: boolean }
  | { type: 'grind'; active: boolean }
  | { type: 'move'; name: MovementState };

interface ActiveGrind {
  rail: Rail;
  direction: THREE.Vector3;
}

export class PlayerController {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  readonly telemetry: PlayerTelemetry = {
    speed: 0,
    momentum: 0,
    state: 'ROAM',
    combo: 0,
    comboLabel: '',
    dashReady: 1,
    grounded: false,
  };

  private height: number = GAME_CONFIG.player.standingHeight;
  private grounded = false;
  private coyoteTimer = 0;
  private jumpBuffer = 0;
  private jumpsUsed = 0;
  private dashTimer = 0;
  private dashCooldown = 0;
  private slideTimer = 0;
  private wallTimer = 0;
  private wallClimbTimer = 0;
  private wallNormal = new THREE.Vector3();
  private grind: ActiveGrind | null = null;
  private ledgeColliderTop = 0;
  private mantling = false;
  private mantleTime = 0;
  private mantleStart = new THREE.Vector3();
  private mantleTarget = new THREE.Vector3();
  private landingKick = 0;
  private cameraRoll = 0;
  private bobPhase = 0;
  private stepPhase = 0;
  private comboTimer = 0;
  private state: MovementState = 'ROAM';
  private readonly moveInput = new THREE.Vector2();
  private readonly wishDirection = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();

  constructor(
    spawn: THREE.Vector3,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: Input,
    private readonly world: CollisionWorld,
    private readonly emit: (event: PlayerEvent) => void,
  ) {
    this.position.copy(spawn);
  }

  update(dt: number): void {
    if (this.position.y < -12 || Math.abs(this.position.x) > 130 || Math.abs(this.position.z) > 130) {
      this.respawn();
    }

    this.updateDirections();
    this.updateTimers(dt);
    if (this.input.justPressed('Space')) this.jumpBuffer = GAME_CONFIG.player.jumpBuffer;

    if (this.mantling) {
      this.updateMantle(dt);
      this.updateCamera(dt);
      this.updateTelemetry();
      return;
    }
    if (this.state === 'LEDGE HANG') {
      this.updateLedgeHang(dt);
      this.updateCamera(dt);
      this.updateTelemetry();
      return;
    }
    if (this.grind) {
      this.updateGrind(dt);
      this.updateCamera(dt);
      this.updateTelemetry();
      return;
    }

    const wasGrounded = this.grounded;
    const fallSpeed = -this.velocity.y;
    this.tryStartDash();
    this.tryStartSlide();
    this.tryVaultOrMantle();

    if (this.mantling) {
      this.updateMantle(dt);
      this.updateCamera(dt);
      this.updateTelemetry();
      return;
    }

    if (this.dashTimer > 0) this.updateDash();
    else if (this.slideTimer > 0) this.updateSlide(dt);
    else this.updateLocomotion(dt);

    this.applyVerticalMovement(dt);
    const result = this.world.move(
      this.position,
      this.velocity,
      dt,
      GAME_CONFIG.player.radius,
      this.height,
    );
    this.grounded = result.grounded;

    if (result.wallNormal) this.wallNormal.copy(result.wallNormal);
    if (!wasGrounded && this.grounded) this.onLand(fallSpeed, result.groundSurface);
    if (this.grounded) {
      this.coyoteTimer = GAME_CONFIG.player.coyoteTime;
      this.jumpsUsed = 0;
      this.wallTimer = 0;
      this.wallClimbTimer = 0;
      if (result.slope && this.input.down('ControlLeft', 'ControlRight')) this.accelerateDownSlope(result.slope.axis, result.slope.rising, dt);
    }

    if (!this.grounded) {
      this.tryWallMovement(dt, result.wallNormal);
      this.tryLedgeGrab();
      this.tryGrind();
    }

    this.consumeJump();
    this.updateStepAudio(dt, result.groundSurface);
    this.updateState();
    this.updateCamera(dt);
    this.updateCombo(dt);
    this.updateTelemetry();
  }

  private updateDirections(): void {
    this.forward.set(-Math.sin(this.input.yaw), 0, -Math.cos(this.input.yaw));
    this.right.set(Math.cos(this.input.yaw), 0, -Math.sin(this.input.yaw));
    this.input.getMoveVector(this.moveInput);
    this.wishDirection
      .copy(this.forward)
      .multiplyScalar(this.moveInput.y)
      .addScaledVector(this.right, this.moveInput.x);
    if (this.wishDirection.lengthSq() > 1) this.wishDirection.normalize();
  }

  private updateTimers(dt: number): void {
    this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.slideTimer = Math.max(0, this.slideTimer - dt);
    this.landingKick = damp(this.landingKick, 0, 13, dt);
  }

  private updateLocomotion(dt: number): void {
    const config = GAME_CONFIG.player;
    const sprinting = this.input.down('ShiftLeft', 'ShiftRight') && this.moveInput.y > 0.1;
    const targetSpeed = sprinting ? config.sprintSpeed : config.walkSpeed;
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const desiredMomentumSpeed = sprinting && horizontalSpeed > targetSpeed ? Math.min(horizontalSpeed, 16.5) : targetSpeed;
    const targetX = this.wishDirection.x * desiredMomentumSpeed;
    const targetZ = this.wishDirection.z * desiredMomentumSpeed;
    const acceleration = (this.grounded ? config.groundAcceleration : config.airAcceleration) * dt;

    if (this.wishDirection.lengthSq() > 0) {
      this.velocity.x = moveTowards(this.velocity.x, targetX, acceleration);
      this.velocity.z = moveTowards(this.velocity.z, targetZ, acceleration);
    } else if (this.grounded) {
      const friction = Math.max(0, 1 - config.groundFriction * dt);
      this.velocity.x *= friction;
      this.velocity.z *= friction;
    }
  }

  private applyVerticalMovement(dt: number): void {
    if (this.grounded || this.dashTimer > 0 || this.state === 'WALL RUN') return;
    this.velocity.y = Math.max(
      -GAME_CONFIG.player.maxFallSpeed,
      this.velocity.y - GAME_CONFIG.world.gravity * dt,
    );
  }

  private consumeJump(): void {
    if (this.jumpBuffer <= 0) return;
    const config = GAME_CONFIG.player;
    if (this.state === 'WALL RUN' || this.state === 'WALL CLIMB') {
      this.velocity.addScaledVector(this.wallNormal, config.wallJumpPush);
      this.velocity.y = config.wallJumpVertical;
      this.setState('WALL JUMP', true);
      this.wallTimer = config.wallRunDuration;
      this.wallClimbTimer = config.wallClimbDuration;
      this.jumpBuffer = 0;
      this.emit({ type: 'jump', intensity: 1.15 });
      return;
    }
    if (this.grounded || this.coyoteTimer > 0) {
      const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      const longJump = this.slideTimer > 0 || (this.input.down('ControlLeft', 'ControlRight') && horizontalSpeed > 7);
      if (longJump) {
        this.velocity.x = this.forward.x * Math.max(horizontalSpeed, config.longJumpSpeed);
        this.velocity.z = this.forward.z * Math.max(horizontalSpeed, config.longJumpSpeed);
        this.velocity.y = config.jumpSpeed * 0.9;
        this.slideTimer = 0;
        this.setState('LONG JUMP', true);
      } else {
        this.velocity.y = config.jumpSpeed + Math.min(1.1, horizontalSpeed * 0.045);
        this.setState('AIR');
      }
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpsUsed = 1;
      this.jumpBuffer = 0;
      this.emit({ type: 'jump', intensity: longJump ? 1.2 : 1 });
      return;
    }
    if (this.jumpsUsed < 2) {
      this.velocity.y = config.doubleJumpSpeed;
      this.velocity.x += this.wishDirection.x * 1.6;
      this.velocity.z += this.wishDirection.z * 1.6;
      this.jumpsUsed = 2;
      this.jumpBuffer = 0;
      this.setState('DOUBLE JUMP', true);
      this.emit({ type: 'jump', intensity: 0.8 });
    }
  }

  private tryStartDash(): void {
    if (!this.input.justPressed('KeyE') || this.dashCooldown > 0) return;
    this.dashTimer = GAME_CONFIG.player.dashDuration;
    this.dashCooldown = GAME_CONFIG.player.dashCooldown;
    const direction = this.wishDirection.lengthSq() > 0 ? this.wishDirection : this.forward;
    this.velocity.x = direction.x * GAME_CONFIG.player.dashSpeed;
    this.velocity.z = direction.z * GAME_CONFIG.player.dashSpeed;
    this.velocity.y = Math.max(this.velocity.y, this.grounded ? 0.8 : 1.5);
    this.setState('DASH', true);
  }

  private updateDash(): void {
    const horizontal = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizontal < GAME_CONFIG.player.dashSpeed * 0.8) {
      const direction = this.wishDirection.lengthSq() > 0 ? this.wishDirection : this.forward;
      this.velocity.x = direction.x * GAME_CONFIG.player.dashSpeed * 0.8;
      this.velocity.z = direction.z * GAME_CONFIG.player.dashSpeed * 0.8;
    }
  }

  private tryStartSlide(): void {
    if (
      !this.input.justPressed('ControlLeft', 'ControlRight') ||
      !this.grounded ||
      Math.hypot(this.velocity.x, this.velocity.z) < 6.3
    ) return;
    this.slideTimer = GAME_CONFIG.player.slideDuration;
    this.height = GAME_CONFIG.player.crouchingHeight;
    this.velocity.x *= 1.08;
    this.velocity.z *= 1.08;
    this.setState('SLIDE', true);
    this.emit({ type: 'slide', active: true });
  }

  private updateSlide(dt: number): void {
    const friction = Math.max(0, 1 - dt * 1.25);
    this.velocity.x *= friction;
    this.velocity.z *= friction;
    if (!this.input.down('ControlLeft', 'ControlRight') || Math.hypot(this.velocity.x, this.velocity.z) < 3.5) {
      this.slideTimer = 0;
      this.emit({ type: 'slide', active: false });
    }
  }

  private tryVaultOrMantle(): void {
    if (!this.grounded || this.moveInput.y < 0.4) return;
    const hit = this.world.findWall(this.position, this.forward, 0.8, this.height);
    if (!hit) return;
    const obstacleHeight = hit.collider.max.y - this.position.y;
    if (obstacleHeight > 0.3 && obstacleHeight <= 1.35 && hit.collider.vaultable) {
      this.startMantle(hit.collider.max.y + 0.04, 1.5, 'VAULT');
    } else if (obstacleHeight > 1.15 && obstacleHeight <= 2.05 && this.input.justPressed('Space')) {
      this.startMantle(hit.collider.max.y + 0.04, 0.85, 'MANTLE');
      this.jumpBuffer = 0;
    }
  }

  private startMantle(targetY: number, forwardDistance: number, state: 'MANTLE' | 'VAULT'): void {
    this.mantling = true;
    this.mantleTime = 0;
    this.mantleStart.copy(this.position);
    this.mantleTarget.copy(this.position).addScaledVector(this.forward, forwardDistance);
    this.mantleTarget.y = targetY;
    this.velocity.set(0, 0, 0);
    this.setState(state, true);
  }

  private updateMantle(dt: number): void {
    this.mantleTime += dt / (this.state === 'VAULT' ? 0.24 : 0.34);
    const t = clamp01(this.mantleTime);
    const smooth = t * t * (3 - 2 * t);
    this.position.lerpVectors(this.mantleStart, this.mantleTarget, smooth);
    this.position.y += Math.sin(t * Math.PI) * (this.state === 'VAULT' ? 0.45 : 0.22);
    if (t >= 1) {
      this.mantling = false;
      this.grounded = true;
      this.velocity.copy(this.forward).multiplyScalar(this.state === 'VAULT' ? 8.5 : 5);
      this.setState('ROAM');
    }
  }

  private tryWallMovement(dt: number, collisionNormal: THREE.Vector3 | null): void {
    if (this.moveInput.y <= 0 || this.velocity.y < -9) return;
    const leftHit = this.world.findWall(this.position, this.right.clone().negate(), 0.62, this.height);
    const rightHit = this.world.findWall(this.position, this.right, 0.62, this.height);
    const sideHit = leftHit ?? rightHit;
    const forwardHit = this.world.findWall(this.position, this.forward, 0.62, this.height);

    if (forwardHit && forwardHit.collider.climbable && this.wallClimbTimer < GAME_CONFIG.player.wallClimbDuration && this.velocity.y > -2.5) {
      this.wallNormal.copy(forwardHit.normal);
      this.wallClimbTimer += dt;
      this.velocity.x *= 0.72;
      this.velocity.z *= 0.72;
      this.velocity.y = 5.1 - this.wallClimbTimer * 3.2;
      this.setState('WALL CLIMB');
      return;
    }

    if (sideHit && Math.hypot(this.velocity.x, this.velocity.z) > 5.5 && this.wallTimer < GAME_CONFIG.player.wallRunDuration) {
      this.wallNormal.copy(sideHit.normal);
      this.wallTimer += dt;
      const tangent = new THREE.Vector3(-this.wallNormal.z, 0, this.wallNormal.x);
      if (tangent.dot(this.velocity) < 0) tangent.negate();
      const speed = Math.max(7.8, Math.hypot(this.velocity.x, this.velocity.z));
      this.velocity.x = tangent.x * speed;
      this.velocity.z = tangent.z * speed;
      this.velocity.y = Math.max(-1.8, this.velocity.y - GAME_CONFIG.player.wallRunGravity * dt);
      this.position.addScaledVector(this.wallNormal, -0.015);
      this.setState('WALL RUN');
      return;
    }

    if (collisionNormal && this.state === 'WALL RUN') this.wallNormal.copy(collisionNormal);
  }

  private tryLedgeGrab(): void {
    if (this.velocity.y > 1 || this.moveInput.y < 0.2 || this.state === 'WALL RUN') return;
    const hit = this.world.findWall(this.position, this.forward, 0.72, this.height);
    if (!hit) return;
    const ledgeHeight = hit.collider.max.y;
    const relative = ledgeHeight - this.position.y;
    if (relative < 1.15 || relative > 1.9) return;
    this.ledgeColliderTop = ledgeHeight;
    this.position.y = ledgeHeight - 1.45;
    this.position.addScaledVector(hit.normal, GAME_CONFIG.player.radius + 0.04);
    this.velocity.set(0, 0, 0);
    this.wallNormal.copy(hit.normal);
    this.setState('LEDGE HANG', true);
  }

  private updateLedgeHang(dt: number): void {
    if (this.input.justPressed('ControlLeft', 'ControlRight') || this.input.justPressed('KeyS')) {
      this.setState('AIR');
      this.velocity.y = -1;
      return;
    }
    const tangent = new THREE.Vector3(-this.wallNormal.z, 0, this.wallNormal.x);
    const shimmy = this.moveInput.x * 2.1 * dt;
    this.position.addScaledVector(tangent, shimmy);
    if (this.input.justPressed('Space') || this.input.down('KeyW')) {
      this.mantling = true;
      this.mantleTime = 0;
      this.mantleStart.copy(this.position);
      this.mantleTarget.copy(this.position).addScaledVector(this.wallNormal, -1.05);
      this.mantleTarget.y = this.ledgeColliderTop + 0.04;
      this.setState('MANTLE', true);
    }
  }

  private tryGrind(): void {
    if (this.velocity.y > 0.5 || this.state === 'LEDGE HANG') return;
    const hit = this.world.findGrindRail(this.position, 0.7);
    if (!hit) return;
    const direction = hit.rail.end.clone().sub(hit.rail.start).normalize();
    if (direction.dot(this.velocity) < 0) direction.negate();
    this.grind = { rail: hit.rail, direction };
    this.position.copy(hit.point);
    this.position.y += 0.06;
    this.velocity.copy(direction).multiplyScalar(Math.max(8, Math.hypot(this.velocity.x, this.velocity.z)));
    this.setState('GRIND', true);
    this.emit({ type: 'grind', active: true });
  }

  private updateGrind(dt: number): void {
    if (!this.grind) return;
    const speed = Math.min(17, this.velocity.length() + dt * 0.8);
    this.velocity.copy(this.grind.direction).multiplyScalar(speed);
    this.position.addScaledVector(this.grind.direction, speed * dt);
    const start = this.grind.rail.start;
    const end = this.grind.rail.end;
    const segment = end.clone().sub(start);
    const t = this.position.clone().sub(start).dot(segment) / segment.lengthSq();
    const point = start.clone().addScaledVector(segment, THREE.MathUtils.clamp(t, 0, 1));
    this.position.y = point.y + 0.06;
    if (this.input.justPressed('Space')) {
      this.velocity.y = GAME_CONFIG.player.jumpSpeed * 0.9;
      this.position.y += 0.15;
      this.jumpsUsed = 1;
      this.endGrind();
      this.setState('AIR');
      this.emit({ type: 'jump', intensity: 1 });
    } else if (t <= 0 || t >= 1 || this.input.justPressed('ControlLeft', 'ControlRight')) {
      this.endGrind();
      this.velocity.y = -0.5;
      this.setState('AIR');
    }
  }

  private endGrind(): void {
    this.grind = null;
    this.emit({ type: 'grind', active: false });
  }

  private onLand(fallSpeed: number, surface: SurfaceType): void {
    const intensity = clamp01((fallSpeed - 3) / 13);
    this.landingKick = Math.min(0.22, fallSpeed * 0.012);
    this.emit({ type: 'land', surface, intensity });
    if (this.jumpBuffer > 0) this.consumeJump();
  }

  private accelerateDownSlope(axis: 'x' | 'z', rising: 1 | -1, dt: number): void {
    this.velocity[axis] -= rising * dt * 8;
    if (this.slideTimer <= 0 && Math.hypot(this.velocity.x, this.velocity.z) > 4) {
      this.slideTimer = 0.35;
      this.setState('SLIDE', true);
    }
  }

  private updateStepAudio(dt: number, surface: SurfaceType): void {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (!this.grounded || speed < 1.5 || this.slideTimer > 0) {
      this.stepPhase = 0;
      return;
    }
    this.stepPhase += dt * speed;
    if (this.stepPhase >= 2.8) {
      this.stepPhase %= 2.8;
      this.emit({ type: 'step', surface, intensity: clamp01(speed / 12) });
    }
  }

  private updateState(): void {
    if (['DASH', 'WALL RUN', 'WALL CLIMB', 'WALL JUMP', 'LONG JUMP', 'DOUBLE JUMP'].includes(this.state)) {
      if (!this.grounded && this.state !== 'DASH' && this.state !== 'WALL RUN' && this.state !== 'WALL CLIMB') return;
    }
    if (this.slideTimer > 0) this.setState('SLIDE');
    else if (!this.grounded) this.setState('AIR');
    else if (this.input.down('ShiftLeft', 'ShiftRight') && this.moveInput.y > 0) this.setState('SPRINT');
    else this.setState('ROAM');
  }

  private setState(next: MovementState, score = false): void {
    if (this.state === next) return;
    this.state = next;
    if (score && !['ROAM', 'SPRINT', 'AIR'].includes(next)) {
      this.telemetry.combo += 1;
      this.telemetry.comboLabel = next;
      this.comboTimer = 2.4;
      this.emit({ type: 'move', name: next });
    }
  }

  private updateCombo(dt: number): void {
    if (this.comboTimer > 0) this.comboTimer -= dt;
    if (this.comboTimer <= 0 && this.grounded && Math.hypot(this.velocity.x, this.velocity.z) < 5) {
      this.telemetry.combo = 0;
      this.telemetry.comboLabel = '';
    }
  }

  private updateCamera(dt: number): void {
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const crouching = this.slideTimer > 0 || this.input.down('ControlLeft', 'ControlRight');
    const targetHeight = crouching ? GAME_CONFIG.player.crouchingHeight : GAME_CONFIG.player.standingHeight;
    this.height = damp(this.height, targetHeight, crouching ? 16 : 9, dt);
    const eyeHeight = crouching ? this.height - 0.12 : GAME_CONFIG.player.eyeOffset;
    const movingOnGround = this.grounded && horizontalSpeed > 1.2 && this.slideTimer <= 0;
    if (movingOnGround) this.bobPhase += dt * (6.5 + horizontalSpeed * 0.72);
    const bob = movingOnGround ? Math.sin(this.bobPhase) * Math.min(0.055, horizontalSpeed * 0.0045) : 0;
    const sway = movingOnGround ? Math.cos(this.bobPhase * 0.5) * 0.025 : 0;

    let targetRoll = 0;
    if (this.state === 'WALL RUN') targetRoll = this.wallNormal.dot(this.right) * -0.13;
    else targetRoll = -this.moveInput.x * Math.min(0.035, horizontalSpeed * 0.003);
    this.cameraRoll = damp(this.cameraRoll, targetRoll, 8, dt);

    this.camera.position.copy(this.position);
    this.camera.position.y += eyeHeight + bob - this.landingKick;
    this.camera.position.addScaledVector(this.right, sway);
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.input.pitch, this.input.yaw, this.cameraRoll, 'YXZ'));

    const targetFov = this.dashTimer > 0
      ? GAME_CONFIG.camera.dashFov
      : horizontalSpeed > GAME_CONFIG.player.sprintSpeed * 0.78
        ? GAME_CONFIG.camera.sprintFov + Math.min(3, (horizontalSpeed - 9) * 0.55)
        : GAME_CONFIG.camera.baseFov;
    this.camera.fov = damp(this.camera.fov, targetFov, 7, dt);
    this.camera.updateProjectionMatrix();
  }

  private updateTelemetry(): void {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.telemetry.speed = speed;
    this.telemetry.momentum = clamp01((speed - 3) / 13);
    this.telemetry.state = this.state;
    this.telemetry.dashReady = 1 - clamp01(this.dashCooldown / GAME_CONFIG.player.dashCooldown);
    this.telemetry.grounded = this.grounded;
  }

  respawn(spawn = new THREE.Vector3(15, 0.32, 18)): void {
    this.position.copy(spawn);
    this.velocity.set(0, 0, 0);
    this.input.yaw = Math.PI;
    this.input.pitch = 0;
    this.grounded = false;
    this.grind = null;
    this.mantling = false;
    this.slideTimer = 0;
    this.setState('ROAM');
  }
}
