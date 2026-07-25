import * as THREE from 'three';
import { materials } from '../utils/materials.js';
import { COLORS, HOUSE } from '../utils/constants.js';
import {
  box, sofa, beanbag, rug, table, chair, bed, nightstand, shelf, bookshelfFill,
  plant, tv, pendantLight, wallSconce, ceilingLight, kitchenIsland, cabinet,
  monitor, workstation, serverRack, batteryBank, inverter, ventDuct, wallOutlet,
  wallSegment
} from '../utils/components.js';

function reg(house, obj, data) {
  house.registerInteractive(obj, data);
}

function addCeil(house, lighting, parent, x, y, z, max = 1.4) {
  const g = ceilingLight(parent, x, y, z);
  g.userData.light.userData.max = max;
  lighting.registerInterior(g);
  reg(house, g, { type: 'light', title: 'Deckenleuchte', desc: 'Intelligente Deckenbeleuchtung, gesteuert von der lokalen Haus-KI.' });
  return g;
}

function addSconce(house, lighting, parent, x, y, z, ry) {
  const g = wallSconce(parent, x, y, z, ry);
  g.userData.light.userData.max = 0.8;
  lighting.registerInterior(g);
  reg(house, g, { type: 'light', title: 'Wandleuchte', desc: 'Dezente Wandbeleuchtung, warm und indirekt.' });
  return g;
}

function addPendant(house, lighting, parent, x, y, z, title = 'Pendelleuchte') {
  const g = pendantLight(parent, x, y, z);
  g.userData.light.userData.max = 1.6;
  lighting.registerInterior(g);
  reg(house, g, { type: 'light', title, desc: 'Pendelleuchte über dem Esstisch / Arbeitsbereich.' });
  return g;
}

/* ============== GROUND FLOOR ============== */
export function buildGroundFloor(g, house, lighting) {
  const W = HOUSE.W, D = HOUSE.D;

  addCeil(house, lighting, g, 4, 2.95, -3, 1.2);
  addCeil(house, lighting, g, -4, 2.95, -3, 1.4);
  addCeil(house, lighting, g, -4, 2.95, 3, 1.4);
  addCeil(house, lighting, g, 4, 2.95, 3, 1.2);

  rug(g, 5, 4, -4, 0.02, 3, COLORS.carpet);
  rug(g, 4.5, 3.5, 4, 0.02, 3, 0x8a6f8a);

  plant(g, -7.2, 0, -5, 1.1);
  plant(g, 7.2, 0, 5, 0.9);
  plant(g, -7.4, 0, 5, 0.8);

  cabinet(g, 1.4, 2.4, 0.5, -7.4, 0, -5.2, 0);
  box(g, 1.6, 0.45, 0.5, -7.0, 0.22, -4.6, materials().wood);
  box(g, 1.4, 0.4, 0.4, 6.6, 0.2, -5.2, materials().wood);
  box(g, 1.2, 0.5, 0.45, 6.4, 0.25, -3.8, materials().black);
  box(g, 1.0, 1.2, 0.06, 5.6, 1.4, -5.85, materials().whiteEmissive);
  const entryDisplay = box(g, 0.4, 0.25, 0.04, 5.6, 1.7, -5.84, materials().screen.clone());
  entryDisplay.material.emissiveIntensity = 0.6;
  reg(house, entryDisplay, { type: 'smarthome', title: 'Smart-Home-Display', desc: 'Dezente Anzeige für Licht, Temperatur und Sicherheit im Eingangsbereich.' });

  kitchenIsland(g, 3.0, 1.4, -4.5, 0, -2.5);
  cabinet(g, 2.0, 0.9, 0.7, -7.4, 0, -2.0, 0);
  box(g, 0.7, 0.7, 0.7, -7.4, 0.55, -1.0, materials().black);
  box(g, 0.7, 1.4, 0.7, -7.4, 0.9, 0.4, materials().whiteEmissive);
  table(g, 2.4, 1.0, 0.74, -4.0, 0, -1.2, 0, 'wood');
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    chair(g, -4.0 + Math.cos(ang) * 1.3, 0, -1.2 + Math.sin(ang) * 0.9, ang + Math.PI);
  }
  addPendant(house, lighting, g, -4.0, 2.9, -1.2, 'Essbereich-Pendelleuchte');

  sofa(g, 3.2, -4.0, 0, 3.2, 0, Math.PI, false);
  beanbag(g, -5.5, 0, 4.5);
  beanbag(g, -6.5, 0, 3.0);
  const tvObj = tv(g, 2.6, 1.5, -7.85, 1.6, 3.0, Math.PI / 2);
  reg(house, tvObj, {
    type: 'tv', title: 'Fernseher', desc: 'Großer Fernseher mit Soundsystem und indirekter Beleuchtung.',
    onClick: (o) => { const s = o.userData.screen; s.material.emissiveIntensity = s.material.emissiveIntensity > 0.1 ? 0 : 1.4; o.userData.on = !o.userData.on; }
  });
  box(g, 3.0, 0.4, 0.3, -4.0, 0.2, 4.8, materials().wood);
  bookshelfFill(g, 2.0, 2.4, 0.4, -7.6, 0, 1.5, Math.PI / 2);

  bed(g, 2.0, 4.0, 0, 4.0, Math.PI);
  nightstand(g, 2.7, 0, 3.1);
  nightstand(g, 5.3, 0, 3.1);
  cabinet(g, 2.2, 2.4, 0.6, 7.5, 0, 4.8, Math.PI / 2);
  box(g, 0.3, 0.1, 0.3, 4.0, 0.5, 5.4, materials().black);
  box(g, 0.3, 0.1, 0.3, 4.6, 0.5, 5.4, materials().black);
  box(g, 1.6, 0.5, 0.6, 6.8, 0.25, 1.0, materials().wood);
  for (let i = 0; i < 3; i++) box(g, 0.2, 0.03, 0.2, 6.4 + i * 0.4, 0.52, 1.0, materials().ledGreen);
  box(g, 1.2, 0.1, 0.6, 6.8, 0.1, 3.5, materials().metal);
  box(g, 0.3, 0.15, 0.2, 6.4, 0.18, 3.5, materials().black);
  box(g, 0.5, 0.08, 0.3, 4.0, 0.05, 5.6, materials().fabricDark);

  for (let i = 0; i < 5; i++) wallOutlet(g, -7.9, 0.4 + i * 0.5, -2 + i * 0.5, Math.PI / 2);
}

/* ============== UPPER FLOOR ============== */
export function buildUpperFloor(u, house, lighting) {
  const W = HOUSE.W, D = HOUSE.D;
  addCeil(house, lighting, u, 4, 5.95, -3, 1.0);
  addCeil(house, lighting, u, -4, 5.95, 3, 1.2);
  addSconce(house, lighting, u, 5.8, 4.2, -5.8, 0);
  addSconce(house, lighting, u, 6.8, 4.2, -5.8, 0);

  const upperPanel = box(u, 0.4, 0.6, 0.04, 5.6, 4.2, -5.84, materials().screen.clone());
  upperPanel.material.emissiveIntensity = 0.5;
  reg(house, upperPanel, {
    type: 'smarthome', title: 'Smart-Home-Bedienfeld', desc: 'Zentrales Bedienfeld im Verbindungsraum für Licht, Klima und Sicherheit.'
  });

  rug(u, 7, 5, -3, 3.22, 2, 0x8a6f5a);
  sofa(u, 3.0, 3.0, 3.22, 1.5, 0, 0, true);
  beanbag(u, 1.5, 3.22, 0.5);
  beanbag(u, 2.5, 3.22, -1.0, 1);
  bookshelfFill(u, 4.0, 2.4, 0.4, -7.6, 3.2, -1.5, Math.PI / 2);
  plant(u, 6.5, 3.2, 4.5, 1.0);
  plant(u, -6.5, 3.2, 4.0, 0.9);

  const ws = workstation(u, -5.5, 3.2, 2.5);
  ws.rotation.y = -Math.PI / 2;
  reg(house, ws, {
    type: 'display', title: 'Arbeitsplatz (Standing Desk)', desc: 'Elektrisch höhenverstellbarer Schreibtisch mit drei Displays, Mac Studio, Dockingstation und sauberem Kabelmanagement. Klicken schaltet Displays und höhenverstellt den Tisch.',
    onClick: (o) => {
      o.userData.raised = !o.userData.raised;
      const d = o.userData.raised ? 0.32 : 0;
      o.userData.lift.position.y = o.userData.baseY + d;
      o.userData.monitors.forEach(m => m.position.y += d);
      const on = o.userData.allOn();
      o.userData.monitors.forEach(m => { m.userData.screen.material.emissiveIntensity = on ? 1.3 : 0; });
    }
  });

  addPendant(house, lighting, u, -5.5, 5.9, 2.5, 'Arbeitsplatz-Leuchte');

  box(u, 0.1, 2.0, 3.0, -7.85, 4.2, 4.5, materials().fabricDark);
  plant(u, 6.8, 3.2, -4.0, 0.8);
}

/* ============== TECH ATTIC ============== */
export function buildTechAttic(a, house, lighting) {
  const W = HOUSE.W, D = HOUSE.D;

  addCeil(house, lighting, a, 0, 8.05, 0, 1.0);

  const ledFloor = [];
  const rackPositions = [
    [-6, -3.5], [-4.2, -3.5], [-2.4, -3.5],
    [-6, 0.5], [-4.2, 0.5], [-2.4, 0.5],
    [2.5, -3.5], [4.3, -3.5], [6.1, -3.5],
    [2.5, 0.5], [4.3, 0.5], [6.1, 0.5]
  ];
  rackPositions.forEach((p, i) => {
    const rack = serverRack(a, p[0], 6.2, p[1], 0, 'rack-' + i);
    reg(house, rack, {
      type: 'server', title: `Server-Rack ${i + 1}`, desc: `19"-Rack mit lokaler KI, Netzwerkspeicher, Switches, Firewall und Backup. Status-LEDs zeigen Auslastung.`,
      onClick: (o) => { house.state.patch('ai.serverLoad', 30 + Math.round(Math.random() * 50)); }
    });
    ledFloor.push(rack);
  });

  const batt1 = batteryBank(a, -6.5, 6.2, 0, 0, 'batt-1');
  reg(house, batt1, {
    type: 'battery', title: 'Solarbatterie 1', desc: 'Lithium-Speicher für selbst erzeugten Solarstrom. Ladezustand wird im KI-Panel angezeigt.',
    onClick: (o) => { house.state.patch('ai.battery', Math.max(10, Math.min(100, house.state.get('ai').battery + 8))); }
  });
  const batt2 = batteryBank(a, -5.0, 6.2, 0, 0, 'batt-2');
  reg(house, batt2, {
    type: 'battery', title: 'Solarbatterie 2', desc: 'Zweiter Batteriespeicher für Lastspitzen und Notstrom.',
    onClick: (o) => { house.state.patch('ai.battery', Math.max(10, Math.min(100, house.state.get('ai').battery + 8))); }
  });

  const inv1 = inverter(a, 6.5, 6.2, 3.5, 0, 'inv-1');
  reg(house, inv1, { type: 'inverter', title: 'Wechselrichter', desc: 'Wandelt Solar-DC in hausinternen Wechselstrom und steuert Einspeisung.' });
  const inv2 = inverter(a, 6.5, 6.2, 2.0, 0, 'inv-2');

  ventDuct(a, -1.5, 7.5, 0, 8, 0);
  ventDuct(a, 1.5, 7.5, 0, 8, 0);
  box(a, 2.0, 0.6, 1.4, 0, 6.5, 4.5, materials().tech);
  box(a, 0.3, 0.3, 0.3, 0, 6.9, 4.5, materials().metalDark);
  box(a, 1.6, 0.5, 0.8, 0, 6.45, -5.0, materials().techPanel);
  for (let i = 0; i < 3; i++) box(a, 0.1, 0.3, 0.1, -0.4 + i * 0.4, 6.7, -5.0, materials().ledGreen);

  box(a, 0.2, 0.2, 6.0, -7.6, 7.2, 0, materials().metalDark);
  box(a, 0.2, 0.2, 6.0, 7.6, 7.2, 0, materials().metalDark);

  const atticWin1 = box(a, 0.8, 0.8, 0.06, -7.8, 7.2, -3, materials().glass);
  reg(house, atticWin1, { type: 'window', title: 'Dachboden-Lüftungsfenster', desc: 'Automatisch gesteuertes Fenster zur natürlichen Kühlung der Server.' });
  const atticWin2 = box(a, 0.8, 0.8, 0.06, 7.8, 7.2, 3, materials().glass);

  const klima = box(a, 1.2, 0.5, 0.5, 7.5, 6.55, -5.0, materials().whiteEmissive);
  reg(house, klima, { type: 'hvac', title: 'Klimaanlage', desc: 'Kühlt den Technikraum. Wählt automatisch zwischen natürlicher Lüftung und aktiver Kühlung je nach Serverlast und Außentemperatur.' });
}
