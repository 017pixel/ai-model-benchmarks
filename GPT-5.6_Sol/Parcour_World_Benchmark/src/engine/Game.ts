import { AudioSystem } from '../audio/AudioSystem';
import { Input } from './Input';
import { PlayerController, type PlayerEvent } from '../player/PlayerController';
import { HUD } from '../ui/HUD';
import { City } from '../world/City';
import { Renderer } from './Renderer';

export class Game {
  private readonly view: Renderer;
  private readonly city: City;
  private readonly input: Input;
  private readonly audio = new AudioSystem();
  private readonly hud: HUD;
  private readonly player: PlayerController;
  private running = false;
  private started = false;
  private lastTime = performance.now();
  private accumulator = 0;
  private fpsTime = 0;
  private fpsFrames = 0;
  private animationFrame = 0;
  private readonly fixedStep = 1 / 90;

  constructor(root: HTMLElement) {
    this.view = new Renderer(root);
    this.city = new City(this.view.scene);
    this.input = new Input(this.view.canvas);
    this.hud = new HUD(root);
    this.player = new PlayerController(
      this.city.spawn,
      this.view.camera,
      this.input,
      this.city.collision,
      this.handlePlayerEvent,
    );
    this.view.camera.position.set(15, 8, 33);
    this.view.camera.lookAt(15, 3, 18);

    this.hud.onStart(this.start);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('keydown', this.onGlobalKey);
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  private readonly start = (): void => {
    this.started = true;
    void this.audio.unlock();
    void this.view.canvas.requestPointerLock();
  };

  private readonly onPointerLockChange = (): void => {
    this.running = document.pointerLockElement === this.view.canvas;
    this.hud.setPaused(!this.running, this.started);
    this.input.endFrame();
    this.lastTime = performance.now();
    this.accumulator = 0;
  };

  private readonly onGlobalKey = (event: KeyboardEvent): void => {
    if (event.code === 'KeyR' && this.running) this.player.respawn(this.city.spawn);
  };

  private readonly handlePlayerEvent = (event: PlayerEvent): void => {
    this.audio.handle(event);
  };

  private readonly frame = (now: number): void => {
    const elapsed = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.input.update();

    if (this.running) {
      this.accumulator += elapsed;
      while (this.accumulator >= this.fixedStep) {
        this.player.update(this.fixedStep);
        this.accumulator -= this.fixedStep;
        // Edge-triggered input is consumed by exactly one simulation step.
        this.input.endFrame();
      }
      this.audio.update(this.player.telemetry.speed);
      this.hud.update(this.player.telemetry);
    }

    this.updateFps(elapsed);
    this.view.render();
    if (!this.running) this.input.endFrame();
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  private updateFps(dt: number): void {
    this.fpsTime += dt;
    this.fpsFrames++;
    if (this.fpsTime >= 0.5) {
      this.hud.setFps(this.fpsFrames / this.fpsTime);
      this.fpsTime = 0;
      this.fpsFrames = 0;
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('keydown', this.onGlobalKey);
    this.input.dispose();
    this.view.dispose();
  }
}
