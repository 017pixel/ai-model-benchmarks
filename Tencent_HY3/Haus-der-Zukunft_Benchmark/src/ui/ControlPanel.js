export class ControlPanel {
  constructor(state, dom) {
    this.state = state;
    this.dom = dom;
    this.lastRender = 0;
  }

  render() {
    const s = this.state.data;
    const ai = s.ai, c = s.compute;
    let html = `
      <div class="ai-head">
        <span class="dot"></span>
        <h2>Lokale Haus-KI</h2>
        <span class="close material-symbols-rounded" id="ai-close">close</span>
      </div>
      <div class="ip-desc" style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;">
        Vollständig lokal: Verarbeitung, Speicherung und Steuerung bleiben im Haus. Keine privaten Daten verlassen das Haus.
      </div>
      <div class="ai-grid">
        ${this.card('Solar', ai.solarPower.toFixed(2), 'kW', 'Aktuelle Erzeugung')}
        ${this.card('Verbrauch', ai.consumption.toFixed(2), 'kW', 'Hauslast')}
        ${this.card('Batterie', ai.battery.toFixed(0), '%', 'Ladezustand')}
        ${this.card('Serverlast', ai.serverLoad, '%', 'Lokale KI')}
        ${this.card('Innen', ai.indoorTemp, '°C', 'Temperatur')}
        ${this.card('Außen', ai.outdoorTemp, '°C', 'Wetter')}
        ${this.card('Luft', ai.airQuality, '%', 'Qualität')}
        ${this.card('Autarkie', ai.autonomy, '%', 'Energie')}
      </div>

      <div class="subhead">Status</div>
      <div class="compute-row"><span>Netzwerk</span><b>${ai.network}</b></div>
      <div class="compute-row"><span>Sicherheit</span><b>${ai.security}</b></div>
      <div class="compute-row"><span>Wasserverbrauch</span><b>${(ai.consumption * 12).toFixed(0)} L/h</b></div>
      <div class="compute-row"><span>Raumbelegung</span><b>${this.occupancy()}</b></div>

      <div class="subhead">Freigabe von Rechenleistung</div>
      <div class="toggle ${c.enabled ? 'on' : ''}" id="compute-toggle">
        <span>Externe Rechenleistung</span><span class="sw"></span>
      </div>
      <div class="slider-wrap" style="margin-top:10px;">
        <div class="slabel"><span>Max. Auslastung</span><b id="maxload-val">${c.maxLoad}%</b></div>
        <input type="range" id="maxload" min="20" max="90" value="${c.maxLoad}" />
      </div>
      <div style="margin-top:10px;">
        ${this.computeRow('Freigegeben', c.enabled ? c.share.toFixed(0) + ' %' : '—')}
        ${this.computeRow('Zusatz-Verbrauch', c.enabled ? c.power.toFixed(2) + ' kW' : '—')}
        ${this.computeRow('Aktive Aufträge', c.enabled ? c.jobs : '—')}
        ${this.computeRow('Server-Temperatur', c.enabled ? c.temp.toFixed(1) + ' °C' : '—')}
        ${this.computeRow('Zeitfenster', c.window)}
        ${this.computeRow('Vergütung', c.enabled ? c.payout.toFixed(2) + ' €' : '0.00 €')}
      </div>
      ${c.enabled ? `<button class="btn btn-danger block" id="compute-stop" style="margin-top:10px;">Sofort stoppen</button>` : ''}
      <div class="iso-badge"><span class="material-symbols-rounded">shield</span> Technisch isoliert: Kein Zugriff auf private Daten, das lokale Netzwerk oder die Haussteuerung.</div>
    `;
    this.dom.innerHTML = html;
    this.bind();
  }

  card(label, value, unit, sub) {
    return `<div class="ai-card"><div class="c-label">${label}</div><div class="c-value">${value}<small> ${unit}</small></div><div class="c-sub">${sub}</div></div>`;
  }
  computeRow(k, v) { return `<div class="compute-row"><span>${k}</span><b>${v}</b></div>`; }
  occupancy() {
    const t = this.state.get('timeOfDay');
    if (t > 0.78 || t < 0.25) return 'Schlafzimmer, Wohnzimmer';
    if (t > 0.5) return 'Arbeitsbereich, Küche';
    return 'Wohnzimmer, Küche';
  }

  bind() {
    const close = document.getElementById('ai-close');
    if (close) close.onclick = () => { this.state.set('aiPanelOpen', false); this.dom.classList.add('hidden'); };
    const tg = document.getElementById('compute-toggle');
    if (tg) tg.onclick = () => {
      const c = this.state.get('compute');
      c.enabled = !c.enabled;
      this.state.emit('*');
      this.render();
    };
    const ml = document.getElementById('maxload');
    if (ml) ml.oninput = (e) => {
      this.state.get('compute').maxLoad = +e.target.value;
      document.getElementById('maxload-val').textContent = e.target.value + '%';
    };
    const stop = document.getElementById('compute-stop');
    if (stop) stop.onclick = () => {
      this.state.get('compute').enabled = false;
      this.state.emit('*');
      this.render();
    };
  }

  update() {
    if (this.dom.classList.contains('hidden')) return;
    const now = performance.now();
    if (now - this.lastRender < 600) return;
    this.lastRender = now;
    const ai = this.state.get('ai'), c = this.state.get('compute');
    const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
    set('#ai-panel .ai-grid', '');
    const cards = [
      this.card('Solar', ai.solarPower.toFixed(2), 'kW', 'Aktuelle Erzeugung'),
      this.card('Verbrauch', ai.consumption.toFixed(2), 'kW', 'Hauslast'),
      this.card('Batterie', ai.battery.toFixed(0), '%', 'Ladezustand'),
      this.card('Serverlast', ai.serverLoad, '%', 'Lokale KI'),
      this.card('Innen', ai.indoorTemp, '°C', 'Temperatur'),
      this.card('Außen', ai.outdoorTemp, '°C', 'Wetter'),
      this.card('Luft', ai.airQuality, '%', 'Qualität'),
      this.card('Autarkie', ai.autonomy, '%', 'Energie')
    ].join('');
    const grid = this.dom.querySelector('.ai-grid');
    if (grid) grid.innerHTML = cards;
    set('.compute-row:nth-child(1) b', ai.network);
    set('.compute-row:nth-child(2) b', ai.security);
    set('.compute-row:nth-child(3) b', (ai.consumption * 12).toFixed(0) + ' L/h');
    set('.compute-row:nth-child(4) b', this.occupancy());
  }
}
