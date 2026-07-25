// Dialog box: typewriter-style NPC conversation at the bottom of the screen.
// Pages through multiple lines, advancing on click/E.

import { DialogLine } from '../entity/NPC';

export class DialogBox {
  lines: DialogLine[] = [];
  index = 0;
  /** how many characters of the current line are revealed */
  revealed = 0;
  active = false;
  onFinish?: () => void;

  start(lines: DialogLine[], onFinish?: () => void) {
    this.lines = lines;
    this.index = 0;
    this.revealed = 0;
    this.active = true;
    this.onFinish = onFinish;
  }

  close() {
    this.active = false;
    this.lines = [];
    this.onFinish?.();
    this.onFinish = undefined;
  }

  update(dt: number) {
    if (!this.active) return;
    const cur = this.lines[this.index];
    if (!cur) { this.close(); return; }
    if (this.revealed < cur.text.length) {
      this.revealed = Math.min(cur.text.length, this.revealed + dt * 60);
    }
  }

  /** advance: finish typing, or go to next line, or close */
  advance() {
    if (!this.active) return;
    const cur = this.lines[this.index];
    if (!cur) { this.close(); return; }
    if (this.revealed < cur.text.length) {
      this.revealed = cur.text.length; // reveal all
      return;
    }
    this.index++;
    this.revealed = 0;
    if (this.index >= this.lines.length) this.close();
  }

  render(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
    if (!this.active) return;
    const cur = this.lines[this.index];
    if (!cur) return;
    const w = Math.min(680, vw - 60);
    const h = 110;
    const x = (vw - w) / 2;
    const y = vh - h - 70;

    ctx.fillStyle = 'rgba(15,15,25,0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#c8a050';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    // portrait box
    ctx.fillStyle = 'rgba(60,50,30,0.8)';
    ctx.fillRect(x + 10, y + 10, 70, h - 20);
    ctx.fillStyle = '#c8a050';
    ctx.font = 'bold 12px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.fillText('NPC', x + 45, y + h / 2 + 4);

    // speaker name
    ctx.fillStyle = '#ffd060';
    ctx.font = 'bold 16px Trebuchet MS';
    ctx.textAlign = 'left';
    ctx.fillText(cur.speaker, x + 95, y + 28);

    // text (word wrap)
    ctx.fillStyle = '#fff';
    ctx.font = '14px Trebuchet MS';
    const shown = cur.text.substring(0, Math.floor(this.revealed));
    this.wrapText(ctx, shown, x + 95, y + 50, w - 110, 18);

    // prompt
    if (this.revealed >= cur.text.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '12px Trebuchet MS';
      ctx.textAlign = 'right';
      const blink = Math.floor(performance.now() / 400) % 2 === 0 ? '▼' : ' ';
      ctx.fillText(`${blink} E / Klick`, x + w - 14, y + h - 12);
    }
    ctx.textAlign = 'left';
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += lh;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }
}
