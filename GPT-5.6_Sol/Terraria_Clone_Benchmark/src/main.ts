import './styles.css';
import { HOTBAR_ITEMS, ITEM_NAMES, type ItemType } from './config';
import { Game, type HudState } from './game';
import { createWorld, deleteWorld, listWorlds, loadWorld, saveWorld } from './storage';
import type { Dialogue, GameMode, WorldSave } from './types';

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('App-Container fehlt.');
const app: HTMLDivElement = appElement;

let game: Game | null = null;
let activeSave: WorldSave | null = null;
let lastHud = '';
let toastTimer = 0;

function icon(name: 'play' | 'plus' | 'trash' | 'save' | 'mode' | 'pvp' | 'boss' | 'menu' | 'close'): string {
  const paths = {
    play: '<path d="M8 5v14l11-7z"/>',
    plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2"/>',
    trash: '<path d="M7 8h10l-1 11H8L7 8Zm2-3h6l1 3H8l1-3Z"/>',
    save: '<path d="M5 4h12l2 2v14H5V4Zm3 0v6h8V4M8 15h8v5H8z"/>',
    mode: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4"/>',
    pvp: '<path d="m6 4 5 5-2 2-5-5V4h2Zm12 0-5 5 2 2 5-5V4h-2ZM8 13l3 3-4 4H4v-3l4-4Zm8 0-3 3 4 4h3v-3l-4-4Z"/>',
    boss: '<path d="m4 9 4 2 4-7 4 7 4-2-2 11H6L4 9Zm4 7h8"/>',
    menu: '<path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" stroke-width="2.2"/>',
    close: '<path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function renderMenu(): void {
  game?.stop();
  game = null;
  activeSave = null;
  const worlds = listWorlds();
  app.innerHTML = `
    <main class="menu-screen">
      <div class="menu-sky" aria-hidden="true">
        <span class="sun-disc"></span>
        <span class="cloud cloud-a"></span><span class="cloud cloud-b"></span>
        <span class="ridge ridge-back"></span><span class="ridge ridge-front"></span>
        <span class="ground-line"></span>
        <span class="menu-tree tree-a"></span><span class="menu-tree tree-b"></span>
      </div>
      <section class="menu-content">
        <header class="brand-block">
          <p class="eyebrow">PROZEDURALE 2D-SANDBOX</p>
          <h1>DEEP<span>WARD</span></h1>
          <p class="brand-copy">Baue eine Zuflucht. Steige in die Tiefe. Wecke, was dort unten wartet.</p>
        </header>
        <div class="world-panel">
          <div class="panel-heading">
            <div><p class="section-label">LOKALE ARCHIVE</p><h2>Deine Welten</h2></div>
            <button class="button primary" id="new-world">${icon('plus')} Neue Welt</button>
          </div>
          <div class="world-list">
            ${worlds.length ? worlds.map((world) => `
              <article class="world-card" data-world="${world.id}">
                <div class="world-mark"><span></span></div>
                <div class="world-info">
                  <h3>${escapeHtml(world.name)}</h3>
                  <p>Seed ${world.seed} <i></i> ${world.mode === 'creative' ? 'Creative' : 'Survival'} <i></i> Stufe ${world.progress.tier}</p>
                  <small>${world.progress.bossDefeated ? 'Tiefenwächter bezwungen' : `${world.progress.monstersSlain} Kreaturen besiegt`} · ${formatDate(world.updatedAt)}</small>
                </div>
                <button class="button icon-button delete-world" data-delete="${world.id}" aria-label="Welt löschen">${icon('trash')}</button>
                <button class="button play-button" data-play="${world.id}">${icon('play')} Spielen</button>
              </article>
            `).join('') : `
              <div class="empty-worlds">
                <div class="empty-art"><span></span></div>
                <h3>Noch unkartiertes Land</h3>
                <p>Deine Welten werden automatisch und vollständig in diesem Browser gespeichert.</p>
              </div>
            `}
          </div>
          <footer class="menu-footer">
            <span>WASD bewegen</span><span>Maus abbauen / bauen</span><span>E sprechen</span><span>C Modus</span>
          </footer>
        </div>
      </section>
    </main>
    <div id="sheet-root"></div>
  `;
  document.querySelector('#new-world')?.addEventListener('click', showCreateSheet);
  document.querySelectorAll<HTMLElement>('[data-play]').forEach((button) => button.addEventListener('click', () => {
    const save = loadWorld(button.dataset.play ?? '');
    if (save) startGame(save);
  }));
  document.querySelectorAll<HTMLElement>('[data-delete]').forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    const id = button.dataset.delete ?? '';
    const world = worlds.find((item) => item.id === id);
    if (world && window.confirm(`Welt „${world.name}“ wirklich löschen?`)) {
      deleteWorld(id);
      renderMenu();
    }
  }));
}

function showCreateSheet(): void {
  const root = document.querySelector<HTMLDivElement>('#sheet-root');
  if (!root) return;
  root.innerHTML = `
    <div class="sheet-backdrop" id="sheet-backdrop">
      <form class="bottom-sheet" id="world-form">
        <div class="sheet-handle"></div>
        <div class="sheet-heading"><div><p class="section-label">NEUE EXPEDITION</p><h2>Welt erschaffen</h2></div><button type="button" class="button icon-button" id="close-sheet" aria-label="Schließen">${icon('close')}</button></div>
        <label class="field"><span>Weltname</span><input name="name" maxlength="28" value="Tiefenruh" autocomplete="off" /></label>
        <label class="field"><span>Seed <small>optional</small></span><input name="seed" inputmode="numeric" placeholder="Zufällig" autocomplete="off" /></label>
        <fieldset class="mode-picker">
          <legend>Startmodus</legend>
          <label><input type="radio" name="mode" value="survival" checked /><span><b>Survival</b><small>Herzen, Ressourcen und Progression</small></span></label>
          <label><input type="radio" name="mode" value="creative" /><span><b>Creative</b><small>Fliegen, unverwundbar, sofort bauen</small></span></label>
        </fieldset>
        <button class="button primary create-button" type="submit">${icon('play')} Welt betreten</button>
      </form>
    </div>
  `;
  const close = () => { root.innerHTML = ''; };
  document.querySelector('#close-sheet')?.addEventListener('click', close);
  document.querySelector('#sheet-backdrop')?.addEventListener('click', (event) => { if (event.target === event.currentTarget) close(); });
  document.querySelector<HTMLFormElement>('#world-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const save = createWorld(String(data.get('name') ?? ''), String(data.get('mode')) as GameMode, String(data.get('seed') ?? ''));
    saveWorld(save);
    startGame(save);
  });
}

function startGame(save: WorldSave): void {
  activeSave = save;
  app.innerHTML = `
    <main class="game-screen">
      <canvas id="game-canvas" aria-label="Deepward Spielfeld"></canvas>
      <div class="hud" id="hud">
        <section class="status-cluster">
          <div id="health-display" class="health-display"></div>
          <div class="world-readout"><b id="time-label">06:00</b><span id="depth-label">Oberfläche</span><span id="tier-label">Werkzeuge I</span></div>
        </section>
        <nav class="game-actions" aria-label="Spielaktionen">
          <button class="hud-button" id="save-button" aria-label="Speichern">${icon('save')}<span>Speichern</span></button>
          <button class="hud-button" id="mode-button" aria-label="Spielmodus wechseln">${icon('mode')}<span>Modus</span></button>
          <button class="hud-button" id="pvp-button" aria-label="Lokales PvP">${icon('pvp')}<span>PvP</span></button>
          <button class="hud-button" id="boss-button" aria-label="Boss rufen">${icon('boss')}<span>Boss</span></button>
          <button class="hud-button" id="menu-button" aria-label="Menü">${icon('menu')}<span>Menü</span></button>
        </nav>
        <aside class="quest-card"><span>AKTUELLES ZIEL</span><p id="quest-text">Sprich mit Mira.</p></aside>
        <div class="interaction-hint" id="interaction-hint"><kbd>E</kbd> Mit Dorfbewohnern sprechen</div>
        <section class="boss-hud" id="boss-hud" hidden><div><span id="boss-name">Tiefenwächter</span><b id="boss-value">720 / 720</b></div><div class="boss-track"><i id="boss-fill"></i></div></section>
        <section class="hotbar" id="hotbar" aria-label="Schnellleiste">
          ${HOTBAR_ITEMS.map((item, index) => `
            <button class="hotbar-slot${index === save.selectedSlot ? ' selected' : ''}" data-slot="${index}" aria-label="${ITEM_NAMES[item]}">
              <span class="slot-key">${index + 1}</span><span class="item-glyph item-${item}"></span><b class="item-count" data-count="${item}"></b><small>${shortName(item)}</small>
            </button>
          `).join('')}
        </section>
        <div class="touch-controls" aria-label="Touch-Steuerung">
          <div class="touch-movement"><button data-control="left" aria-label="Links">‹</button><button data-control="right" aria-label="Rechts">›</button><button data-control="jump" aria-label="Springen">↑</button><button data-control="down" aria-label="Abwärts">↓</button></div>
          <div class="touch-actions"><button data-control="mine">ABBAU</button><button data-control="attack">KAMPF</button><button data-control="place">BAU</button></div>
        </div>
      </div>
      <div class="toast" id="toast" role="status"></div>
      <div id="dialogue-root"></div>
    </main>
  `;
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  if (!canvas) return;
  game = new Game(canvas, save, {
    onHud: updateHud,
    onToast: showToast,
    onDialogue: showDialogue,
    onSave: saveWorld,
    onPause: showPauseSheet,
  });
  document.querySelector('#save-button')?.addEventListener('click', () => game?.saveNow());
  document.querySelector('#mode-button')?.addEventListener('click', () => game?.toggleMode());
  document.querySelector('#pvp-button')?.addEventListener('click', () => game?.togglePvp());
  document.querySelector('#boss-button')?.addEventListener('click', () => game?.summonBoss());
  document.querySelector('#menu-button')?.addEventListener('click', showPauseSheet);
  document.querySelectorAll<HTMLElement>('[data-slot]').forEach((button) => button.addEventListener('click', () => game?.selectSlot(Number(button.dataset.slot))));
  document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach((button) => {
    const control = button.dataset.control ?? '';
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); game?.touchControl(control, true); });
    button.addEventListener('pointerup', (event) => { event.preventDefault(); game?.touchControl(control, false); });
    button.addEventListener('pointercancel', () => game?.touchControl(control, false));
  });
  game.start();
}

function updateHud(hud: HudState): void {
  const signature = JSON.stringify(hud);
  if (signature === lastHud) return;
  lastHud = signature;
  const health = document.querySelector<HTMLDivElement>('#health-display');
  if (health) {
    health.innerHTML = hud.mode === 'creative'
      ? `<div class="creative-badge"><span class="wing-glyph">◇</span><b>CREATIVE FLUG</b><small>Unverwundbar</small></div>`
      : `<div class="hearts">${Array.from({ length: Math.ceil(hud.maxHealth / 20) }, (_, index) => {
          const amount = Math.max(0, Math.min(20, hud.health - index * 20));
          return `<span class="heart" style="--fill:${amount / 20}" title="${Math.ceil(hud.health)} Leben"><i></i></span>`;
        }).join('')}</div><small>${Math.ceil(hud.health)} / ${hud.maxHealth} LEBEN</small>`;
  }
  setText('#time-label', hud.timeLabel);
  setText('#depth-label', hud.depth > 0 ? `${hud.depth * 2} m Tiefe` : 'Oberfläche');
  setText('#tier-label', `Werkzeuge ${roman(hud.tier)}`);
  setText('#quest-text', hud.quest);
  document.querySelectorAll<HTMLElement>('[data-slot]').forEach((slot, index) => slot.classList.toggle('selected', index === hud.selected));
  for (const item of HOTBAR_ITEMS) {
    const counter = document.querySelector<HTMLElement>(`[data-count="${item}"]`);
    if (counter) counter.textContent = ['pickaxe', 'axe', 'sword', 'shovel'].includes(item) ? roman(hud.tier) : String(hud.inventory[item] ?? 0);
  }
  document.querySelector('#mode-button')?.classList.toggle('active', hud.mode === 'creative');
  document.querySelector('#pvp-button')?.classList.toggle('active', hud.pvp);
  const bossHud = document.querySelector<HTMLElement>('#boss-hud');
  if (bossHud) {
    bossHud.hidden = !hud.boss;
    if (hud.boss) {
      setText('#boss-name', hud.boss.name);
      setText('#boss-value', `${Math.ceil(hud.boss.health)} / ${hud.boss.maxHealth}`);
      const fill = document.querySelector<HTMLElement>('#boss-fill');
      if (fill) fill.style.width = `${Math.max(0, hud.boss.health / hud.boss.maxHealth) * 100}%`;
    }
  }
}

function showDialogue(dialogue: Dialogue | null): void {
  const root = document.querySelector<HTMLDivElement>('#dialogue-root');
  if (!root) return;
  if (!dialogue) { root.innerHTML = ''; return; }
  root.innerHTML = `
    <div class="dialogue-wrap">
      <section class="dialogue-box">
        <p class="section-label">DORFGESPRÄCH</p>
        <h2>${escapeHtml(dialogue.speaker)}</h2>
        <p>${escapeHtml(dialogue.text)}</p>
        <div class="dialogue-choices">${dialogue.choices.map((choice) => `<button class="button ${choice.action === 'close' ? 'secondary' : 'primary'}" data-dialogue="${choice.action}">${escapeHtml(choice.label)}</button>`).join('')}</div>
      </section>
    </div>
  `;
  document.querySelectorAll<HTMLElement>('[data-dialogue]').forEach((button) => button.addEventListener('click', () => game?.handleDialogueAction(button.dataset.dialogue ?? 'close')));
}

function showPauseSheet(): void {
  const root = document.querySelector<HTMLDivElement>('#dialogue-root');
  if (!root || !game) return;
  root.innerHTML = `
    <div class="dialogue-wrap pause-wrap">
      <section class="dialogue-box pause-box">
        <p class="section-label">EXPEDITION PAUSIERT</p><h2>${escapeHtml(activeSave?.name ?? 'Deepward')}</h2>
        <div class="control-grid"><span><kbd>A D</kbd> Laufen</span><span><kbd>W</kbd> Springen / Fliegen</span><span><kbd>Maus 1</kbd> Abbau / Angriff</span><span><kbd>Maus 2</kbd> Block setzen</span><span><kbd>E</kbd> Gespräch</span><span><kbd>C</kbd> Modus wechseln</span><span><kbd>P</kbd> Lokales PvP</span><span><kbd>B</kbd> Boss rufen</span></div>
        <div class="dialogue-choices"><button class="button primary" id="resume-game">Weiterspielen</button><button class="button secondary" id="leave-game">Speichern und verlassen</button></div>
      </section>
    </div>
  `;
  document.querySelector('#resume-game')?.addEventListener('click', () => { root.innerHTML = ''; });
  document.querySelector('#leave-game')?.addEventListener('click', () => { game?.saveNow(); renderMenu(); });
}

function showToast(message: string): void {
  const toast = document.querySelector<HTMLDivElement>('#toast');
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 3200);
}

function setText(selector: string, text: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.textContent = text;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(timestamp);
}

function roman(value: number): string {
  return ['I', 'I', 'II', 'III'][Math.max(0, Math.min(3, value))];
}

function shortName(item: ItemType): string {
  const names: Record<ItemType, string> = {
    pickaxe: 'Picke', axe: 'Axt', sword: 'Klinge', shovel: 'Spaten', grass: 'Gras', dirt: 'Erde', stone: 'Stein', wood: 'Holz',
    leaves: 'Laub', plank: 'Planke', coal: 'Kohle', copper: 'Kupfer', crystal: 'Kristall', torch: 'Fackel', bedrock: 'Fels',
  };
  return names[item];
}

window.addEventListener('beforeunload', () => game?.saveNow());
renderMenu();
