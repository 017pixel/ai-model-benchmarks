// ===========================================================================
// UI: HUD auf Canvas + DOM-Overlays (Menüs, Dialog, Touch-Steuerung)
// ===========================================================================
import { CONFIG, ITEM, ITEM_PROPS, BLOCK } from '../config.js';
import { getTextures, getItemIcon } from './textures.js';

export class UI {
  constructor(input, callbacks) {
    this.input = input;
    this.cb = callbacks;
    this.root = document.getElementById('app');
    this.overlay = this._div('bf-overlay');
    this.root.appendChild(this.overlay);
    this.dialogEl = null;
    this.dialogNpc = null;
    this.touchEls = {};
    this._isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this._buildTouch();
    if (this._isTouch) { const t = document.querySelector('.bf-touch'); if (t) t.classList.add('active'); }
  }

  _div(cls, parent) {
    const d = document.createElement('div');
    d.className = cls;
    (parent || this.root).appendChild(d);
    return d;
  }

  // ---------- Startmenü ----------
  showStart(hasSave) {
    this.overlay.style.display = 'flex';
    this.overlay.innerHTML = `
      <div class="bf-card">
        <div class="bf-logo">BLOCK<span>FORGE</span></div>
        <p class="bf-sub">Ein 2D-Sandbox-Abenteuer · Survival &amp; Creative</p>
        <div class="bf-btns">
          <button class="bf-btn primary" id="bf-new">Neue Welt erstellen</button>
          ${hasSave ? '<button class="bf-btn" id="bf-cont">Welt laden</button>' : ''}
          <button class="bf-btn ghost" id="bf-help">Steuerung</button>
        </div>
        <div class="bf-version">v${CONFIG.SAVE.KEY ? '' : ''}${VERSION}</div>
      </div>`;
    this.overlay.querySelector('#bf-new').onclick = () => this.cb.onNew();
    if (hasSave) this.overlay.querySelector('#bf-cont').onclick = () => this.cb.onContinue();
    this.overlay.querySelector('#bf-help').onclick = () => this.showHelp(true);
  }

  showHelp(fromStart) {
    const back = fromStart
      ? `<button class="bf-btn" id="bf-back">Zurück</button>`
      : `<button class="bf-btn" id="bf-back">Weiter spielen</button>`;
    this.overlay.innerHTML = `
      <div class="bf-card">
        <div class="bf-logo small">STEUERUNG</div>
        <div class="bf-help">
          <div><b>WASD / Pfeile</b> Bewegen &amp; Springen (Leertaste)</div>
          <div><b>Maus links</b> Block abbauen / angreifen</div>
          <div><b>Maus rechts</b> Block platzieren</div>
          <div><b>1–0 / Mausrad</b> Hotbar auswählen</div>
          <div><b>F</b> Modus wechseln (Survival / Creative)</div>
          <div><b>E</b> Mit NPC sprechen</div>
          <div><b>P</b> Pause / Menü</div>
          <div><b>T</b> PvP-Gegner beschwören</div>
          <div><b>Boss-Ruf</b> im Hotbar nutzen für den Bosskampf</div>
        </div>
        ${back}
      </div>`;
    this.overlay.querySelector('#bf-back').onclick = () => {
      if (fromStart) this.cb.onNew(); else this.cb.onResume();
    };
  }

  hide() { this.overlay.style.display = 'none'; this.overlay.innerHTML = ''; }

  // ---------- Pause ----------
  showPause() {
    this.overlay.style.display = 'flex';
    this.overlay.innerHTML = `
      <div class="bf-card">
        <div class="bf-logo small">PAUSE</div>
        <div class="bf-btns">
          <button class="bf-btn primary" id="bf-resume">Weiter spielen</button>
          <button class="bf-btn" id="bf-save">Welt speichern</button>
          <button class="bf-btn" id="bf-mode">Modus wechseln</button>
          <button class="bf-btn ghost" id="bf-quit">Hauptmenü</button>
        </div>
      </div>`;
    this.overlay.querySelector('#bf-resume').onclick = () => this.cb.onResume();
    this.overlay.querySelector('#bf-save').onclick = () => { this.cb.onSave(); };
    this.overlay.querySelector('#bf-mode').onclick = () => { this.cb.onToggleMode(); };
    this.overlay.querySelector('#bf-quit').onclick = () => this.cb.onQuit();
  }

  // ---------- NPC-Dialog ----------
  showDialog(npc) {
    this.dialogNpc = npc;
    this.overlay.style.display = 'flex';
    this.overlay.innerHTML = `
      <div class="bf-dialog">
        <div class="bf-dlg-name">${npc.name}</div>
        <div class="bf-dlg-text" id="bf-dlg-text">${npc.lines[npc.lineIdx]}</div>
        <div class="bf-dlg-btns">
          <button class="bf-btn small" id="bf-dlg-next">Weiter</button>
          <button class="bf-btn small ghost" id="bf-dlg-close">Schließen</button>
        </div>
      </div>`;
    this.overlay.querySelector('#bf-dlg-next').onclick = () => {
      npc.lineIdx = (npc.lineIdx + 1) % npc.lines.length;
      this.overlay.querySelector('#bf-dlg-text').textContent = npc.lines[npc.lineIdx];
    };
    this.overlay.querySelector('#bf-dlg-close').onclick = () => this.hideDialog();
  }
  hideDialog() { this.dialogNpc = null; this.cb.onResume(); }
  isDialogOpen() { return !!this.dialogNpc; }

  // ---------- Tod ----------
  showDeath() {
    this.overlay.style.display = 'flex';
    this.overlay.innerHTML = `
      <div class="bf-card">
        <div class="bf-logo small danger">GESTORBEN</div>
        <p class="bf-sub">Du wirst am Dorf wiederbelebt.</p>
        <button class="bf-btn primary" id="bf-respawn">Wiederbeleben</button>
      </div>`;
    this.overlay.querySelector('#bf-respawn').onclick = () => this.cb.onResume();
  }

  // ---------- Touch-Steuerung ----------
  _buildTouch() {
    if (!this._isTouch) return;
    const wrap = this._div('bf-touch');
    const mk = (id, label, cls) => {
      const b = document.createElement('button');
      b.className = 'bf-tbtn ' + (cls || '');
      b.textContent = label;
      b.id = id;
      wrap.appendChild(b);
      this.touchEls[id] = b;
      const set = (v) => (e) => { e.preventDefault(); this.input.touch[id.replace('bf-', '')] = v; };
      b.addEventListener('touchstart', set(true), { passive: false });
      b.addEventListener('touchend', set(false), { passive: false });
      b.addEventListener('touchcancel', set(false), { passive: false });
    };
    const left = this._div('bf-dpad', wrap);
    mk('bf-left', '◀', 'dpad-l');
    mk('bf-right', '▶', 'dpad-r');
    const right = this._div('bf-actions', wrap);
    mk('bf-jump', '▲', 'act');
    mk('bf-up', '↑', 'act');
    mk('bf-down', '↓', 'act');
    const top = this._div('bf-tops', wrap);
    const modeBtn = document.createElement('button');
    modeBtn.className = 'bf-tbtn mode'; modeBtn.id = 'bf-tmode'; modeBtn.textContent = 'F';
    modeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.cb.onToggleMode(); }, { passive: false });
    top.appendChild(modeBtn);
  }

  // ---------- HUD (Canvas) ----------
  drawHUD(ctx, g) {
    const W = ctx.canvas.clientWidth;
    const H = ctx.canvas.clientHeight;
    const p = g.player;

    // Tageszeit-Balken oben
    this._drawTimeBar(ctx, W, g);

    // Modus-Anzeige
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(12, 14, 150, 26);
    ctx.fillStyle = p.mode === 'creative' ? '#9a7bf0' : '#6f9a4a';
    ctx.fillRect(16, 20, 14, 14);
    ctx.fillStyle = '#fff';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(p.mode === 'creative' ? 'CREATIVE' : 'SURVIVAL', 36, 31);

    // Herzen (nur Survival)
    if (p.mode === 'survival') this._drawHearts(ctx, p);

    // Hotbar
    this._drawHotbar(ctx, g, W, H);

    // Boss-Leiste
    if (g.boss && g.boss.active && !g.boss.dead) this._drawBossBar(ctx, g.boss, W);

    // Hinweis bei NPC in der Nähe
    if (g.nearNpc) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[E] ' + g.nearNpc.name + ' ansprechen', W / 2, H - 110);
      ctx.textAlign = 'left';
    }

    // PvP-Hinweis
    if (g.rival) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(W - 162, 14, 150, 26);
      ctx.fillStyle = '#e0556a';
      ctx.fillRect(W - 158, 20, 14, 14);
      ctx.fillStyle = '#fff';
      ctx.fillText('RIVALE', W - 138, 31);
    }
    if (g.toast) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const tw = ctx.measureText(g.toast).width + 24;
      ctx.fillRect(W / 2 - tw / 2, 60, tw, 28);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(g.toast, W / 2, 79);
      ctx.textAlign = 'left';
    }
  }

  _drawTimeBar(ctx, W, g) {
    const x = W / 2 - 70, y = 12, w = 140, h = 8;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    const t = g.dayTime; // 0..1
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#1b2a4a');
    grad.addColorStop(0.5, '#ffd98a');
    grad.addColorStop(1, '#1b2a4a');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + t * w, y + h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cdd6e6';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(g.isNight ? 'Nacht' : 'Tag', W / 2, y + 22);
    ctx.textAlign = 'left';
  }

  _drawHearts(ctx, p) {
    const hp = p.health, max = p.maxHealth;
    const full = Math.ceil(max / 20);
    const per = max / full;
    let x = 14, y = 50;
    for (let i = 0; i < full; i++) {
      const v = Math.max(0, Math.min(1, (hp - i * per) / per));
      this._heart(ctx, x + i * 26, y, v);
    }
  }

  _heart(ctx, x, y, fill) {
    ctx.save();
    ctx.translate(x, y);
    const draw = (color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(9, 16);
      ctx.bezierCurveTo(-2, 7, 2, 0, 9, 5);
      ctx.bezierCurveTo(16, 0, 20, 7, 9, 16);
      ctx.fill();
    };
    draw('#3a1b22');
    if (fill > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 16 - 16 * fill, 18, 16 * fill);
      ctx.clip();
      draw(fill > 0.5 ? '#e0556a' : '#c0556a');
      ctx.restore();
    }
    ctx.restore();
  }

  _drawHotbar(ctx, g, W, H) {
    const p = g.player;
    const n = p.hotbar.length;
    const s = 52, gap = 6;
    const total = n * s + (n - 1) * gap;
    const x0 = W / 2 - total / 2;
    const y0 = H - s - 16;
    for (let i = 0; i < n; i++) {
      const it = p.hotbar[i];
      const x = x0 + i * (s + gap);
      ctx.fillStyle = i === p.slot ? 'rgba(95,133,117,0.85)' : 'rgba(20,22,30,0.7)';
      ctx.fillRect(x, y0, s, s);
      ctx.strokeStyle = i === p.slot ? '#aee0c8' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y0 + 1, s - 2, s - 2);
      // Icon
      const tex = getTextures();
      const cx = x + s / 2, cy = y0 + s / 2 - 4;
      if (it.id && it.id < 100) {
        ctx.drawImage(tex[it.id], x + 8, y0 + 8, s - 16, s - 16);
      } else if (it.id >= 100) {
        const ic = getItemIcon(it.id, s - 16);
        ctx.drawImage(ic, x + 8, y0 + 8, s - 16, s - 16);
      }
      // Count
      if (it.id < 100 || it.id === ITEM.ITEM) {
        ctx.fillStyle = '#fff';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(it.count > 1 ? it.count : '', x + s - 4, y0 + s - 4);
        ctx.textAlign = 'left';
      }
      // Slot-Nummer
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px system-ui';
      ctx.fillText(String((i + 1) % 10), x + 4, y0 + 12);
    }
  }

  _drawBossBar(ctx, boss, W) {
    const w = Math.min(520, W - 80), x = W / 2 - w / 2, y = 40, h = 16;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = '#3a1118';
    ctx.fillRect(x, y, w, h);
    const f = Math.max(0, boss.health / boss.maxHealth);
    ctx.fillStyle = '#e0556a';
    ctx.fillRect(x, y, w * f, h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(boss.name + (boss.phase === 2 ? '  ·  PHASE 2' : ''), W / 2, y - 8);
    ctx.textAlign = 'left';
  }
}

import { VERSION } from '../config.js';
