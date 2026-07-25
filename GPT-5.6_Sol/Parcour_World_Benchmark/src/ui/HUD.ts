import type { PlayerTelemetry } from '../player/PlayerController';

export class HUD {
  private readonly overlay: HTMLElement;
  private readonly startButton: HTMLButtonElement;
  private readonly speed: HTMLElement;
  private readonly state: HTMLElement;
  private readonly momentum: HTMLElement;
  private readonly dash: HTMLElement;
  private readonly combo: HTMLElement;
  private readonly fps: HTMLElement;
  private readonly prompt: HTMLElement;
  private lastState = '';

  constructor(root: HTMLElement) {
    root.insertAdjacentHTML(
      'beforeend',
      `
        <main id="game-shell" aria-label="ROOFLINE Parkour-Spiel">
          <div class="hud" aria-live="polite">
            <section class="telemetry" aria-label="Spielstatus">
              <div class="speed-block"><strong id="speed">00</strong><span>KM/H</span></div>
              <div class="state-block"><span class="eyebrow">FLOW STATE</span><strong id="state">ROAM</strong></div>
            </section>
            <div class="fps" id="fps">60 FPS</div>
            <div class="crosshair" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
            <section class="flow-meter" aria-label="Momentum">
              <div class="meter-label"><span>MOMENTUM</span><span id="dash-label">DASH READY</span></div>
              <div class="meter-track"><div id="momentum" class="meter-fill"></div><div id="dash" class="dash-tick"></div></div>
            </section>
            <div id="combo" class="combo" aria-hidden="true"></div>
            <div id="action-prompt" class="action-prompt"></div>
          </div>

          <section id="overlay" class="overlay visible">
            <div class="brand-rail"><span>RFL / 01</span><span>FREEFLOW DISTRICT</span></div>
            <div class="title-lockup">
              <p class="kicker">FREERUN THE CONCRETE</p>
              <h1>ROOF<span>LINE</span></h1>
              <p class="intro">Keine Route. Keine Ziellinie. Baue Geschwindigkeit auf und lies die Stadt als eine einzige, zusammenhängende Bewegung.</p>
            </div>
            <div class="launch-panel">
              <div class="controls" aria-label="Steuerung">
                <div><kbd>W A S D</kbd><span>BEWEGEN</span></div>
                <div><kbd>SHIFT</kbd><span>SPRINT</span></div>
                <div><kbd>SPACE</kbd><span>SPRUNG / MANTLE</span></div>
                <div><kbd>CTRL</kbd><span>SLIDE / DUCKEN</span></div>
                <div><kbd>E</kbd><span>DASH</span></div>
                <div><kbd>R</kbd><span>RESET</span></div>
              </div>
              <button id="start-game" type="button"><span>LAUF STARTEN</span><small>MAUSKLICK AKTIVIERT BLICKSTEUERUNG</small></button>
            </div>
            <p class="pause-copy">ESC pausiert das Spiel</p>
          </section>
        </main>
      `,
    );
    this.overlay = this.requireElement('overlay');
    this.startButton = this.requireElement('start-game') as HTMLButtonElement;
    this.speed = this.requireElement('speed');
    this.state = this.requireElement('state');
    this.momentum = this.requireElement('momentum');
    this.dash = this.requireElement('dash');
    this.combo = this.requireElement('combo');
    this.fps = this.requireElement('fps');
    this.prompt = this.requireElement('action-prompt');
  }

  onStart(handler: () => void): void {
    this.startButton.addEventListener('click', handler);
  }

  setPaused(paused: boolean, hasStarted: boolean): void {
    this.overlay.classList.toggle('visible', paused);
    if (hasStarted) {
      this.overlay.classList.add('compact');
      this.startButton.querySelector('span')!.textContent = 'WEITERLAUFEN';
      this.startButton.querySelector('small')!.textContent = 'ZURÜCK IN DIE STADT';
    }
  }

  update(data: PlayerTelemetry): void {
    this.speed.textContent = Math.round(data.speed * 3.6).toString().padStart(2, '0');
    this.state.textContent = data.state;
    this.momentum.style.transform = `scaleX(${data.momentum})`;
    this.dash.style.opacity = data.dashReady > 0.99 ? '1' : '0.25';
    const dashLabel = document.getElementById('dash-label');
    if (dashLabel) dashLabel.textContent = data.dashReady > 0.99 ? 'DASH READY' : `DASH ${Math.round(data.dashReady * 100)}%`;

    if (data.combo > 0) {
      this.combo.innerHTML = `<strong>${data.combo}x</strong><span>${data.comboLabel}</span>`;
      this.combo.classList.add('visible');
    } else {
      this.combo.classList.remove('visible');
    }

    if (this.lastState !== data.state) {
      this.state.classList.remove('state-pulse');
      void this.state.offsetWidth;
      this.state.classList.add('state-pulse');
      this.lastState = data.state;
    }
    this.prompt.textContent = data.state === 'LEDGE HANG' ? 'SPACE  HOCHZIEHEN  /  CTRL  LOSLASSEN' : '';
  }

  setFps(value: number): void {
    this.fps.textContent = `${Math.round(value)} FPS`;
  }

  private requireElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing UI element #${id}`);
    return element;
  }
}
