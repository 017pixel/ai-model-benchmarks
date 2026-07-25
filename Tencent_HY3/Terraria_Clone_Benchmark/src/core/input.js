// ===========================================================================
// Eingaben: Tastatur & Maus
// ===========================================================================
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this._isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.keys = new Set();
    this.pressed = new Set(); // einmalig gedrückt (Frame)
    this.mouse = { x: 0, y: 0, down: false, right: false, rightPressed: false, wheel: 0 };
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    this.canvas.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) { this.mouse.right = true; this.mouse.rightPressed = true; }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.right = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('wheel', (e) => {
      this.mouse.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
  }

  // Touch-Buttons (aus UI gesetzt)
  touch = { left: false, right: false, jump: false, up: false, down: false, swipeX: 0 };

  wasPressed(k) { return this.pressed.has(k); }
  isDown(k) { return this.keys.has(k) || (Array.isArray(k) && k.some((x) => this.keys.has(x))); }
  endFrame() { this.pressed.clear(); this.mouse.rightPressed = false; this.mouse.wheel = 0; }
}
