// Input manager: tracks held keys, mouse buttons, and mouse position.
// Provides a clean query API for the rest of the game. Also handles pointer lock
// state implicitly by always reading clientX/clientY relative to canvas.

export class Input {
  keys = new Set<string>();
  mouse = { x: 0, y: 0, down: false, rightDown: false };
  /** one-shot events queued for the update loop to consume */
  private pressed = new Set<string>();
  wheel = 0;

  constructor(public canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    // touch (basic) — treat as left mouse
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const r = canvas.getBoundingClientRect();
      this.mouse.x = t.clientX - r.left;
      this.mouse.y = t.clientY - r.top;
      this.mouse.down = true;
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const r = canvas.getBoundingClientRect();
      this.mouse.x = t.clientX - r.left;
      this.mouse.y = t.clientY - r.top;
    }, { passive: false });
    canvas.addEventListener('touchend', () => { this.mouse.down = false; });
  }

  private onKey(e: KeyboardEvent, down: boolean) {
    const k = e.key.toLowerCase();
    // prevent page scroll on game keys
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (down) {
      this.keys.add(k);
      this.pressed.add(k);
    } else {
      this.keys.delete(k);
    }
  }

  private onMouseMove(e: MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - r.left;
    this.mouse.y = e.clientY - r.top;
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button === 0) this.mouse.down = true;
    if (e.button === 2) this.mouse.rightDown = true;
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button === 0) this.mouse.down = false;
    if (e.button === 2) this.mouse.rightDown = false;
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    this.wheel += Math.sign(e.deltaY);
  }

  isDown(...keys: string[]): boolean {
    return keys.some((k) => this.keys.has(k));
  }

  /** consume a one-shot press (returns true once) */
  consume(...keys: string[]): boolean {
    for (const k of keys) {
      if (this.pressed.has(k)) {
        // don't delete here — cleared at end of frame
        return true;
      }
    }
    return false;
  }

  /** consume a one-shot press and remove it */
  take(...keys: string[]): boolean {
    for (const k of keys) {
      if (this.pressed.has(k)) {
        this.pressed.delete(k);
        return true;
      }
    }
    return false;
  }

  /** how many discrete wheel notches scrolled since last call */
  consumeWheel(): number {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  /** end of frame: clear one-shot events */
  endFrame() {
    this.pressed.clear();
  }
}
