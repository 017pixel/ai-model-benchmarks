import './styles.css';
import { Game } from './game';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) throw new Error('App container was not found.');

root.innerHTML = `
  <main id="game-shell">
    <div id="viewport" aria-label="3D-Spielwelt"></div>
    <div id="damage-flash"></div>

    <section id="start-screen" class="screen active">
      <div class="start-noise"></div>
      <div class="start-copy">
        <div class="eyebrow"><span></span> PROZEDURALE VOXELWELT</div>
        <h1>BLOCK<span>HAVEN</span></h1>
        <p>Überlebe die Wildnis. Baue dir Schutz. Oder fliege im Kreativmodus über eine Welt, die nur dir gehört.</p>
        <button id="play-button" class="primary-button">WELT BETRETEN <span>W</span></button>
        <div class="start-meta">
          <span>SEED 5187</span><span>DESKTOP + TOUCH</span><span>LOKALES SPIEL</span>
        </div>
      </div>
      <aside class="controls-card">
        <div class="card-heading"><span>STEUERUNG</span><span>01</span></div>
        <dl>
          <div><dt>Bewegen</dt><dd>W A S D</dd></div>
          <div><dt>Springen / Fliegen</dt><dd>LEERTASTE</dd></div>
          <div><dt>Abbauen / Angriff</dt><dd>LINKSKLICK</dd></div>
          <div><dt>Block setzen</dt><dd>RECHTSKLICK</dd></div>
          <div><dt>Spielmodus</dt><dd>G</dd></div>
          <div><dt>Hotbar</dt><dd>1 - 6</dd></div>
        </dl>
      </aside>
      <div class="start-corner">BUILD 1.0<br />NO DOWNLOAD</div>
    </section>

    <section id="hud" class="hidden" aria-live="polite">
      <div class="top-bar">
        <div class="brand-mark"><i></i><span>BLOCKHAVEN</span></div>
        <button id="mode-button" class="mode-chip"><b id="mode-dot"></b><span id="mode-label">SURVIVAL</span><small>G</small></button>
        <div id="coordinates">X 0 &nbsp; Y 0 &nbsp; Z 0</div>
      </div>

      <div id="target-label"></div>
      <div id="crosshair"><i></i><b></b></div>
      <div id="break-progress"><span></span></div>
      <div id="toast-stack"></div>
      <div id="boss-bar" class="hidden"><div><span id="boss-name">RAIDER</span><small id="boss-health-label">20 / 20</small></div><i><b id="boss-health"></b></i></div>

      <div class="bottom-hud">
        <div id="hearts" class="hearts"></div>
        <div id="creative-status" class="creative-status hidden"><span class="wing-icon">▲</span><div><b>FREIER FLUG</b><small>LEERTASTE AUF · SHIFT AB</small></div></div>
        <div id="hotbar" class="hotbar"></div>
        <div class="action-hint"><span>G</span> MODUS</div>
      </div>

      <div id="mobile-controls">
        <div id="joystick"><i></i></div>
        <div id="look-zone"></div>
        <button id="mobile-jump" aria-label="Springen">↑<small>SPRUNG</small></button>
        <button id="mobile-break" aria-label="Abbauen">×<small>ABBAU</small></button>
        <button id="mobile-place" aria-label="Bauen">+</button>
      </div>
    </section>

    <section id="pause-screen" class="screen pause-screen">
      <div class="pause-panel">
        <div class="eyebrow"><span></span> SPIEL PAUSIERT</div>
        <h2>Die Welt wartet.</h2>
        <p>Dein Fortschritt bleibt in dieser Sitzung erhalten.</p>
        <button id="resume-button" class="primary-button">WEITERSPIELEN <span>ESC</span></button>
        <button id="reset-button" class="text-button">NEUE WELT ERZEUGEN</button>
      </div>
    </section>
  </main>
`;

new Game(document.querySelector<HTMLDivElement>('#viewport')!);
