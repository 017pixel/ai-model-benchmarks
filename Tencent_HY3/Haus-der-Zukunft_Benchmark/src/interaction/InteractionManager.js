import * as THREE from 'three';

export class InteractionManager {
  constructor(camera, dom, house, state, cameraCtrl) {
    this.camera = camera;
    this.dom = dom;
    this.house = house;
    this.state = state;
    this.ctrl = cameraCtrl;
    this.ray = new THREE.Raycaster();
    this.panel = document.getElementById('info-panel');
    this.hovered = null;

    this.onClick = (e) => this.handleClick(e);
    this.dom.addEventListener('click', this.onClick);
    this.dom.addEventListener('pointermove', (e) => this.handleHover(e));
  }

  getInteractive(obj) {
    let o = obj;
    while (o) {
      if (o.userData && o.userData.interactive) return o;
      o = o.parent;
    }
    return null;
  }

  isVisible(o) {
    let p = o;
    while (p) {
      if (p.visible === false) return false;
      p = p.parent;
    }
    return true;
  }

  raycastAt(ndc) {
    this.ray.setFromCamera(ndc, this.camera);
    const hits = this.ray.intersectObjects(this.house.interactive, true);
    for (const h of hits) {
      const io = this.getInteractive(h.object);
      if (io && this.isVisible(io)) return io;
    }
    return null;
  }

  handleClick(e) {
    if (this.state.get('cameraMode') === 'walk' && !this.ctrl.locked) return;
    let ndc;
    if (this.state.get('cameraMode') === 'walk') {
      ndc = new THREE.Vector2(0, 0);
    } else {
      const rect = this.dom.getBoundingClientRect();
      ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    }
    const io = this.raycastAt(ndc);
    if (io) this.select(io);
    else this.hidePanel();
  }

  handleHover(e) {
    if (this.state.get('cameraMode') === 'walk') return;
    const rect = this.dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const io = this.raycastAt(ndc);
    this.dom.style.cursor = io ? 'pointer' : 'default';
  }

  select(io) {
    const data = io.userData.interactive;
    this.applyAction(io, data, false);
    this.showPanel(io, data);
  }

  applyAction(io, data, fromButton) {
    const ai = this.state.get('ai');
    const compute = this.state.get('compute');
    switch (data.type) {
      case 'door':
        io.userData.open = !io.userData.open;
        break;
      case 'window': {
        io.userData.open = !io.userData.open;
        if (io.userData.blind) io.userData.blind.visible = io.userData.open ? false : io.userData.blind.visible;
        break;
      }
      case 'light':
        this.state.set('lightsOn', !this.state.get('lightsOn'));
        break;
      case 'tv':
      case 'display':
        if (data.onClick) data.onClick(io);
        break;
      case 'smarthome':
      case 'server':
      case 'battery':
      case 'inverter':
      case 'hvac':
      case 'solar':
        if (data.onClick) data.onClick(io);
        break;
    }
  }

  metricsFor(type, io) {
    const ai = this.state.get('ai');
    const c = this.state.get('compute');
    if (type === 'solar') return [
      ['Aktuelle Leistung', ai.solarPower.toFixed(2) + ' kW'],
      ['Modul-Neigung', '38°'],
      ['Ausrichtung', 'Süd'],
      ['Tagesertrag (gesch.)', (ai.solarPower * 5).toFixed(1) + ' kWh']
    ];
    if (type === 'server') return [
      ['Serverauslastung', ai.serverLoad + ' %'],
      ['Netzwerk', ai.network],
      ['Temperatur (gesch.)', (34 + ai.serverLoad * 0.15).toFixed(1) + ' °C']
    ];
    if (type === 'battery') return [
      ['Ladezustand', ai.battery.toFixed(0) + ' %'],
      ['Kapazität', '2 × 10 kWh'],
      ['Status', ai.battery > 50 ? 'Geladen' : 'Lädt / entlädt']
    ];
    if (type === 'hvac') return [
      ['Außentemperatur', ai.outdoorTemp + ' °C'],
      ['Serverlast', ai.serverLoad + ' %'],
      ['Modus', ai.serverLoad > 50 ? 'Aktive Kühlung' : 'Natürliche Lüftung']
    ];
    if (type === 'inverter') return [
      ['Solareinspeisung', ai.solarPower.toFixed(2) + ' kW'],
      ['Hausverbrauch', ai.consumption.toFixed(2) + ' kW'],
      ['Batterie', ai.battery.toFixed(0) + ' %']
    ];
    if (type === 'smarthome') return [
      ['Licht', this.state.get('lightsOn') ? 'An' : 'Aus'],
      ['Innentemperatur', ai.indoorTemp + ' °C'],
      ['Luftqualität', ai.airQuality + ' %'],
      ['Sicherheit', ai.security]
    ];
    if (type === 'compute') return [];
    return [];
  }

  actionLabel(data) {
    if (data.type === 'door') return 'Tür öffnen / schließen';
    if (data.type === 'window') return 'Fenster öffnen / schließen';
    if (data.type === 'light') return this.state.get('lightsOn') ? 'Licht aus' : 'Licht an';
    if (data.type === 'tv') return 'Fernseher ein / aus';
    if (data.type === 'display') return 'Displays + Tisch';
    if (data.type === 'server' || data.type === 'battery') return 'Status aktualisieren';
    return null;
  }

  showPanel(io, data) {
    const metrics = this.metricsFor(data.type, io);
    const label = this.actionLabel(data);
    let html = `<div class="ip-close material-symbols-rounded" id="ip-close">close</div>`;
    html += `<div class="ip-cat"><span class="badge"><span class="material-symbols-rounded">${this.catIcon(data.type)}</span>${this.catLabel(data.type)}</span></div>`;
    html += `<div class="ip-title">${data.title}</div>`;
    html += `<div class="ip-desc">${data.desc}</div>`;
    if (metrics.length) {
      html += metrics.map(m => `<div class="ip-metric"><span>${m[0]}</span><b>${m[1]}</b></div>`).join('');
    }
    if (label) {
      html += `<div class="ip-actions"><button class="btn btn-primary btn-sm" id="ip-action"><span class="material-symbols-rounded">${this.actionIcon(data)}</span>${label}</button></div>`;
    }
    this.panel.innerHTML = html;
    this.panel.classList.remove('hidden');
    document.getElementById('ip-close').onclick = () => this.hidePanel();
    const ab = document.getElementById('ip-action');
    if (ab) ab.onclick = () => {
      this.applyAction(io, data, true);
      this.showPanel(io, data);
    };
  }

  catIcon(type) {
    const map = {
      door: 'door_front', window: 'window', light: 'lightbulb', tv: 'tv',
      display: 'desktop_mac', smarthome: 'smart_display', server: 'dns',
      battery: 'battery_charging_full', inverter: 'electric_bolt', hvac: 'ac_unit',
      solar: 'solar_power'
    };
    return map[type] || 'memory';
  }

  actionIcon(data) {
    if (data.type === 'door') return 'door_front';
    if (data.type === 'window') return 'window';
    if (data.type === 'light') return 'lightbulb';
    if (data.type === 'tv') return 'tv';
    if (data.type === 'display') return 'desktop_mac';
    return 'sync';
  }

  catLabel(type) {
    const map = {
      door: 'Tür', window: 'Fenster', light: 'Beleuchtung', tv: 'Unterhaltung',
      display: 'Arbeitsplatz', smarthome: 'Smart Home', server: 'Server',
      battery: 'Energiespeicher', inverter: 'Wechselrichter', hvac: 'Klima',
      solar: 'Solarenergie'
    };
    return map[type] || 'System';
  }

  hidePanel() {
    this.panel.classList.add('hidden');
  }
}
