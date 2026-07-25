import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game';

export class Input {
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly released = new Set<string>();
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  yaw = 0;
  pitch = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clear);
    document.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.keys.has(event.code)) this.pressed.add(event.code);
    this.keys.add(event.code);
    if (['Space', 'ControlLeft', 'ControlRight'].includes(event.code)) event.preventDefault();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    this.released.add(event.code);
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== this.canvas) return;
    this.mouseDeltaX += event.movementX;
    this.mouseDeltaY += event.movementY;
  };

  private readonly clear = (): void => {
    this.keys.clear();
    this.pressed.clear();
    this.released.clear();
  };

  update(): void {
    this.yaw -= this.mouseDeltaX * GAME_CONFIG.camera.mouseSensitivity;
    this.pitch -= this.mouseDeltaY * GAME_CONFIG.camera.mouseSensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch,
      -GAME_CONFIG.camera.maxPitch,
      GAME_CONFIG.camera.maxPitch,
    );
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }

  endFrame(): void {
    this.pressed.clear();
    this.released.clear();
  }

  down(...codes: string[]): boolean {
    return codes.some((code) => this.keys.has(code));
  }

  justPressed(...codes: string[]): boolean {
    return codes.some((code) => this.pressed.has(code));
  }

  justReleased(...codes: string[]): boolean {
    return codes.some((code) => this.released.has(code));
  }

  getMoveVector(target = new THREE.Vector2()): THREE.Vector2 {
    target.set(
      Number(this.down('KeyD', 'ArrowRight')) - Number(this.down('KeyA', 'ArrowLeft')),
      Number(this.down('KeyW', 'ArrowUp')) - Number(this.down('KeyS', 'ArrowDown')),
    );
    if (target.lengthSq() > 1) target.normalize();
    return target;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clear);
    document.removeEventListener('mousemove', this.onMouseMove);
  }
}
