// HUD: hearts (survival), mode badge, day/night clock, boss health bar,
// crosshair, and contextual hints. Inventory overlay rendered separately.

import { Player } from '../entity/Player';
import { Monster } from '../entity/Monster';
import { Hotbar } from './Hotbar';
import { getSprite } from '../textures/TextureAtlas';

export class HUD {
  hotbar: Hotbar;
  messages: { text: string; time: number }[] = [];
  boss: Monster | null = null;
  /** transient hint shown center-bottom */
  hint = '';
  hintTime = 0;

  constructor(public player: Player) {
    this.hotbar = new Hotbar(player);
  }

  message(text: string) {
    this.messages.push({ text, time: 4 });
    if (this.messages.length > 6) this.messages.shift();
  }

  showHint(text: string, dur = 3) {
    this.hint = text;
    this.hintTime = dur;
  }

  update(dt: number) {
    for (const m of this.messages) m.time -= dt;
    this.messages = this.messages.filter((m) => m.time > 0);
    if (this.hintTime > 0) this.hintTime -= dt;
  }

  render(ctx: CanvasRenderingContext2D, vw: number, vh: number, dayTime: number, fps: number) {
    // hearts
    if (this.player.mode === 'survival') {
      this.drawHearts(ctx, 12, 12);
    } else {
      // creative badge
      ctx.fillStyle = 'rgba(40,140,220,0.85)';
      ctx.fillRect(10, 10, 120, 26);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Trebuchet MS';
      ctx.textAlign = 'left';
      ctx.fillText('✈ CREATIVE', 20, 28);
    }

    // clock / day-night
    this.drawClock(ctx, vw - 90, 16, dayTime);

    // messages
    ctx.textAlign = 'left';
    ctx.font = '13px Trebuchet MS';
    let my = 50;
    for (const m of this.messages) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.6, m.time / 4)})`;
      ctx.fillText(m.text, 14, my + 1);
      ctx.fillStyle = `rgba(255,255,200,${Math.min(1, m.time / 2)})`;
      ctx.fillText(m.text, 13, my);
      my += 18;
    }

    // crosshair
    const cx = vw / 2;
    const cy = vh / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
    ctx.stroke();

    // boss bar
    if (this.boss && this.boss.alive) {
      this.drawBossBar(ctx, vw);
    }

    // hotbar
    this.hotbar.render(ctx, vw, vh);

    // hint
    if (this.hintTime > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.6, this.hintTime)})`;
      ctx.font = '14px Trebuchet MS';
      ctx.textAlign = 'center';
      const w = ctx.measureText(this.hint).width;
      ctx.fillRect(vw / 2 - w / 2 - 8, vh - 90, w + 16, 24);
      ctx.fillStyle = '#ffe080';
      ctx.fillText(this.hint, vw / 2, vh - 74);
    }

    // fps + coords
    ctx.textAlign = 'right';
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`${fps | 0} fps`, vw - 12, vh - 12);
    ctx.fillText(`(${this.player.x | 0}, ${this.player.y | 0})`, vw - 12, vh - 26);
    ctx.textAlign = 'left';
  }

  private drawHearts(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const full = Math.ceil(this.player.maxHealth / 2);
    const halfHearts = (this.player.health / 2);
    for (let i = 0; i < full; i++) {
      const hx = x + i * 22;
      const fill = halfHearts - i;
      this.drawHeart(ctx, hx, y, fill >= 1 ? 'full' : fill > 0 ? 'half' : 'empty');
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, state: 'full' | 'half' | 'empty') {
    ctx.save();
    const s = 1.4;
    ctx.translate(x, y);
    ctx.scale(s, s);
    // outline
    ctx.fillStyle = '#000';
    this.heartPath(ctx, 0, 0, 9);
    ctx.fill();
    // body
    const color = state === 'empty' ? '#3a1010' : '#e02030';
    ctx.fillStyle = color;
    this.heartPath(ctx, 0.5, 0.5, 8);
    ctx.fill();
    if (state === 'half') {
      ctx.save();
      ctx.fillStyle = '#3a1010';
      ctx.beginPath();
      ctx.rect(4.5, 0, 9, 18);
      ctx.fill();
      ctx.restore();
    }
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(3, 3, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + size / 4);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
    ctx.bezierCurveTo(x, y + size / 2, x + size / 2, y + size * 0.7, x + size / 2, y + size);
    ctx.bezierCurveTo(x + size / 2, y + size * 0.7, x + size, y + size / 2, x + size, y + size / 4);
    ctx.bezierCurveTo(x + size, y, x + size / 2, y, x + size / 2, y + size / 4);
    ctx.closePath();
  }

  private drawClock(ctx: CanvasRenderingContext2D, x: number, y: number, dayTime: number) {
    // dayTime 0..1 (0 = midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset)
    const isDay = dayTime > 0.25 && dayTime < 0.75;
    ctx.fillStyle = 'rgba(20,20,30,0.7)';
    ctx.fillRect(x - 6, y - 4, 86, 32);
    ctx.fillStyle = isDay ? '#ffd040' : '#a0b0e0';
    ctx.beginPath();
    ctx.arc(x + 16, y + 12, 9, 0, Math.PI * 2);
    ctx.fill();
    if (!isDay) {
      ctx.fillStyle = 'rgba(20,20,30,0.95)';
      ctx.beginPath();
      ctx.arc(x + 19, y + 9, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    const hours = Math.floor(dayTime * 24);
    const mins = Math.floor((dayTime * 24 - hours) * 60);
    const label = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    ctx.fillText(label, x + 32, y + 17);
  }

  private drawBossBar(ctx: CanvasRenderingContext2D, vw: number) {
    const b = this.boss!;
    const w = Math.min(500, vw - 80);
    const x = (vw - w) / 2;
    const y = 24;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 2, y - 2, w + 4, 24);
    ctx.fillStyle = '#600';
    ctx.fillRect(x, y, w, 14);
    const frac = Math.max(0, b.health / b.maxHealth);
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#ff4040');
    grad.addColorStop(1, '#c01010');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w * frac, 14);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 14);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.fillText('Auge des Cthulhu', vw / 2, y + 12);
    ctx.textAlign = 'left';
  }
}
