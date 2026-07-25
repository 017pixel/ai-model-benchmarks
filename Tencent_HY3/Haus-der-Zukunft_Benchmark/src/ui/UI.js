export class UI {
  constructor(state, house, cameraCtrl, controlPanel) {
    this.state = state;
    this.house = house;
    this.ctrl = cameraCtrl;
    this.cp = controlPanel;
    this.root = document.getElementById('ui-root');
    this.build();
    this.sync();
    state.on('*', () => this.sync());
  }

  el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  build() {
    const left = this.el('div', 'panel ui-corner ui-left');
    left.innerHTML = `
      <div class="brand">
        <div class="brand-mark">HDZ</div>
        <div class="brand-text"><strong>HAUS DER ZUKUNFT</strong><span>Lokale KI · Autarkie</span></div>
      </div>
      <div class="section-label">Kameramodus</div>
      <button class="btn" data-mode="exterior"><span class="material-symbols-rounded">home</span> Außenansicht</button>
      <button class="btn" data-mode="walk"><span class="material-symbols-rounded">directions_walk</span> Innen (Walkthrough)</button>
      <button class="btn" data-mode="arch"><span class="material-symbols-rounded">view_in_ar</span> Architektur</button>
      <div class="section-label">Darstellung</div>
      <button class="btn" id="t-explode"><span class="material-symbols-rounded">layers</span> Explosionsansicht</button>
      <button class="btn" id="t-cut"><span class="material-symbols-rounded">visibility_off</span> Gebäudeschnitt</button>
      <button class="btn" id="t-reset"><span class="material-symbols-rounded">restart_alt</span> Kamera zurücksetzen</button>
      <button class="btn" id="t-full"><span class="material-symbols-rounded">fullscreen</span> Vollbild</button>
    `;
    this.root.appendChild(left);

    const right = this.el('div', 'panel ui-corner ui-right');
    right.innerHTML = `
      <div class="section-label">Tageszeit</div>
      <div class="slider-wrap">
        <div class="slabel"><span id="time-label">12:00</span><b id="time-mode">Tag</b></div>
        <input type="range" id="time" min="0" max="1000" value="380" />
      </div>
      <div class="section-label">Stockwerke (einblenden)</div>
      <div class="row" id="floor-vis">
        <button class="btn btn-sm" data-floor="ground">EG</button>
        <button class="btn btn-sm" data-floor="upper">OG</button>
        <button class="btn btn-sm" data-floor="attic">TD</button>
        <button class="btn btn-sm" data-floor="roof">Dach</button>
      </div>
      <div class="section-label">Etage begehen</div>
      <div class="row" id="floor-go">
        <button class="btn btn-sm" data-go="ground">EG</button>
        <button class="btn btn-sm" data-go="upper">OG</button>
        <button class="btn btn-sm" data-go="attic">TD</button>
      </div>
      <div class="section-label">Smart Home</div>
      <div class="toggle" id="t-lights"><span>Beleuchtung</span><span class="sw"></span></div>
      <div class="section-label">Energie &amp; KI</div>
      <button class="btn btn-primary block" id="t-ai"><span class="material-symbols-rounded">smart_toy</span> KI-Kontrollpanel</button>
      <div class="energy" id="energy" style="margin-top:12px;"></div>
    `;
    this.root.appendChild(right);

    this.bind();
    this.buildEnergy();
  }

  bind() {
    this.root.querySelectorAll('[data-mode]').forEach(b => {
      b.onclick = () => { this.setMode(b.dataset.mode); };
    });
    document.getElementById('t-explode').onclick = () => {
      this.state.set('exploded', !this.state.get('exploded'));
    };
    document.getElementById('t-cut').onclick = () => {
      this.state.set('cutaway', !this.state.get('cutaway'));
    };
    document.getElementById('t-reset').onclick = () => { this.ctrl.reset(); };
    document.getElementById('t-full').onclick = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    };
    document.getElementById('t-lights').onclick = () => {
      this.state.set('lightsOn', !this.state.get('lightsOn'));
    };
    document.getElementById('t-ai').onclick = () => {
      const open = !this.state.get('aiPanelOpen');
      this.state.set('aiPanelOpen', open);
      const panel = document.getElementById('ai-panel');
      panel.classList.toggle('hidden', !open);
      if (open) this.cp.render();
    };

    const time = document.getElementById('time');
    time.oninput = (e) => { this.state.set('timeOfDay', +e.target.value / 1000); };

    this.root.querySelectorAll('#floor-vis [data-floor]').forEach(b => {
      b.onclick = () => {
        const k = b.dataset.floor;
        const fv = Object.assign({}, this.state.get('floorVisible'));
        fv[k] = !fv[k];
        this.state.set('floorVisible', fv);
      };
    });
    this.root.querySelectorAll('#floor-go [data-go]').forEach(b => {
      b.onclick = () => {
        this.state.set('activeFloor', b.dataset.go);
        this.state.set('walkFloor', b.dataset.go);
      };
    });
  }

  setMode(mode) {
    this.state.set('cameraMode', mode);
    this.ctrl.setMode(mode);
  }

  buildEnergy() {
    const e = document.getElementById('energy');
    const stat = (id, icon, label) => `
      <div class="stat">
        <div class="k"><span class="material-symbols-rounded">${icon}</span></div>
        <div class="v">
          <div class="top"><b id="${id}-v">0</b><span id="${id}-l">${label}</span></div>
          <div class="bar"><div id="${id}-b" style="width:0%"></div></div>
        </div>
      </div>`;
    e.innerHTML = stat('solar', 'solar_power', 'Solar') + stat('batt', 'battery_full', 'Batterie') +
      stat('cons', 'bolt', 'Verbrauch') + stat('auto', 'eco', 'Autarkie');
  }

  updateEnergy() {
    const ai = this.state.get('ai');
    const set = (id, v, b, max = 100) => {
      const ve = document.getElementById(id + '-v');
      const be = document.getElementById(id + '-b');
      if (ve) ve.textContent = v;
      if (be) be.style.width = Math.max(0, Math.min(100, b / max * 100)) + '%';
    };
    set('solar', ai.solarPower.toFixed(1) + ' kW', ai.solarPower, 12);
    set('batt', ai.battery.toFixed(0) + ' %', ai.battery);
    set('cons', ai.consumption.toFixed(1) + ' kW', ai.consumption, 12);
    set('auto', ai.autonomy + ' %', ai.autonomy);
    const sb = document.getElementById('solar-b');
    if (sb) sb.style.background = 'var(--accent)';
    const bb = document.getElementById('batt-b');
    if (bb) bb.style.background = 'var(--green)';
    const cb = document.getElementById('cons-b');
    if (cb) cb.style.background = 'var(--blue)';
    const ab = document.getElementById('auto-b');
    if (ab) ab.style.background = 'var(--green)';
  }

  sync() {
    const s = this.state.data;
    this.root.querySelectorAll('[data-mode]').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === s.cameraMode);
    });
    document.getElementById('t-explode').classList.toggle('active', s.exploded);
    document.getElementById('t-cut').classList.toggle('active', s.cutaway);
    document.getElementById('t-lights').classList.toggle('on', s.lightsOn);
    this.root.querySelectorAll('#floor-vis [data-floor]').forEach(b => {
      b.classList.toggle('active', s.floorVisible[b.dataset.floor]);
    });
    this.root.querySelectorAll('#floor-go [data-go]').forEach(b => {
      b.classList.toggle('active', b.dataset.go === s.activeFloor);
    });
    const time = document.getElementById('time');
    if (time && +time.value !== Math.round(s.timeOfDay * 1000)) time.value = Math.round(s.timeOfDay * 1000);
    const clock = Math.floor(s.timeOfDay * 24);
    const mins = Math.floor((s.timeOfDay * 24 - clock) * 60);
    document.getElementById('time-label').textContent =
      String(clock).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
    const mode = s.timeOfDay < 0.25 || s.timeOfDay > 0.78 ? 'Nacht' :
      (s.timeOfDay < 0.4 || s.timeOfDay > 0.7) ? 'Dämmerung' : 'Tag';
    document.getElementById('time-mode').textContent = mode;
  }
}
