import * as THREE from 'three';
import { materials } from '../utils/materials.js';
import { COLORS } from '../utils/constants.js';
import { HOUSE } from '../utils/constants.js';
import {
  box, slab, wallSegment, windowUnit, doorUnit, stair, solarPanel,
  ventDuct, wallOutlet, ceilingLight, pendantLight, wallSconce
} from '../utils/components.js';
import { buildGroundFloor, buildUpperFloor, buildTechAttic } from './Rooms.js';

export class House {
  constructor(scene, state, lighting) {
    this.scene = scene;
    this.state = state;
    this.lighting = lighting;
    this.root = new THREE.Group();
    scene.add(this.root);

    this.groups = { ground: new THREE.Group(), upper: new THREE.Group(), attic: new THREE.Group(), roof: new THREE.Group() };
    for (const k of Object.keys(this.groups)) {
      this.groups[k].userData.floorKey = k;
      this.root.add(this.groups[k]);
    }

    this.colliders = [];
    this.interactive = [];
    this.animated = [];
    this.stairTriggers = [];
    this.hideInCutaway = [];
    this.interiorLights = [];

    this.buildShell();
    this.buildStairs();
    this.buildSolar();
    this.applyState();
  }

  buildRooms() {
    buildGroundFloor(this.groups.ground, this, this.lighting);
    buildUpperFloor(this.groups.upper, this, this.lighting);
    buildTechAttic(this.groups.attic, this, this.lighting);
    this.applyState();
  }

  wall(parent, x1, z1, x2, z2, yB, h, opts = {}) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);
    const g = new THREE.Group();
    g.position.set((x1 + x2) / 2, yB, (z1 + z2) / 2);
    g.rotation.y = -angle;
    const t = HOUSE.WALL_T;
    const mat = opts.material || 'wall';

    const addBox = (lx, w, ly, hh, lz, m) => {
      const b = box(g, w, hh, t, lx, ly, lz, materials()[m]);
      this.maybeCollide(b);
      return b;
    };

    if (opts.style === 'solid') {
      addBox(0, len, h / 2, h, 0, mat);
    } else if (opts.style === 'glass') {
      const frame = materials().black;
      box(g, len, 0.08, t + 0.02, 0, h - 0.04, 0, frame);
      box(g, len, 0.08, t + 0.02, 0, 0.04, 0, frame);
      box(g, 0.06, h, t + 0.02, -len / 2 + 0.03, h / 2, 0, frame);
      box(g, 0.06, h, t + 0.02, len / 2 - 0.03, h / 2, 0, frame);
      const glass = box(g, len - 0.1, h - 0.16, 0.03, 0, h / 2, 0, materials().glass);
      glass.userData.glass = true;
    } else {
      const baseH = opts.baseH || 1.0;
      const topH = opts.topH || (h - 2.4 > 0 ? h - 2.4 : 0.6);
      addBox(0, len, baseH / 2, baseH, 0, mat);
      if (topH > 0) addBox(0, len, h - topH / 2, topH, 0, mat);
      const gh = h - baseH - topH;
      const glass = box(g, len - 0.1, gh, 0.03, 0, baseH + gh / 2, 0, materials().glass);
      box(g, len, 0.05, t + 0.02, 0, baseH, 0, materials().black);
    }

    if (opts.cutaway) this.hideInCutaway.push(g);
    parent.add(g);
    return g;
  }

  gapWall(parent, x1, z1, x2, z2, yB, h, gap, opts = {}) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);
    const g = new THREE.Group();
    g.position.set((x1 + x2) / 2, yB, (z1 + z2) / 2);
    g.rotation.y = -angle;
    const t = HOUSE.WALL_T;
    const mat = opts.material || 'wall';
    const gc = gap.center * len - len / 2;
    const gw = gap.width;
    const leftW = (gc - gw / 2) + len / 2;
    const rightW = (len / 2) - (gc + gw / 2);
    const addBox = (lx, w) => { const b = box(g, w, h, t, lx, h / 2, 0, materials()[mat]); this.maybeCollide(b); };

    if (!gap.full) {
      const baseH = opts.baseH || 1.0;
      const topH = opts.topH || (h - 2.4 > 0 ? h - 2.4 : 0.6);
      if (leftW > 0) { addBox(-len / 2 + leftW / 2, leftW); }
      if (rightW > 0) { addBox(len / 2 - rightW / 2, rightW); }
      if (leftW > 0) box(g, leftW, baseH, t, -len / 2 + leftW / 2, baseH / 2, 0, materials()[mat]);
      if (rightW > 0) box(g, rightW, baseH, t, len / 2 - rightW / 2, baseH / 2, 0, materials()[mat]);
      if (leftW > 0 && topH > 0) box(g, leftW, topH, t, -len / 2 + leftW / 2, h - topH / 2, 0, materials()[mat]);
      if (rightW > 0 && topH > 0) box(g, rightW, topH, t, len / 2 - rightW / 2, h - topH / 2, 0, materials()[mat]);
    } else {
      if (leftW > 0) addBox(-len / 2 + leftW / 2, leftW);
      if (rightW > 0) addBox(len / 2 - rightW / 2, rightW);
    }

    if (opts.cutaway) this.hideInCutaway.push(g);
    parent.add(g);
    return g;
  }

  maybeCollide(mesh) {
    mesh.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(mesh);
    this.colliders.push({ box: b, yMin: b.min.y, yMax: b.max.y });
  }

  buildShell() {
    const W = HOUSE.W, D = HOUSE.D;
    const g = this.groups.ground, u = this.groups.upper, a = this.groups.attic;

    slab(g, W, D, 0, -0.1, 0);
    slab(u, W, D, 0, 3.1, 0, 'floor');
    slab(a, W, D, 0, 6.1, 0, 'floorConcrete');

    const frontCut = true;
    const cutFront = false;

    g.userData.cutSide = 'front';
    u.userData.cutSide = 'front';
    a.userData.cutSide = 'front';

    this.wall(g, -W / 2, -D / 2, W / 2, -D / 2, 0, 3.0, { style: 'mixed', cutaway: true });
    this.wall(g, W / 2, -D / 2, W / 2, D / 2, 0, 3.0, { style: 'mixed', cutaway: true });
    this.wall(g, W / 2, D / 2, -W / 2, D / 2, 0, 3.0, { style: 'mixed', cutaway: true });
    this.wall(g, -W / 2, D / 2, -W / 2, -D / 2, 0, 3.0, { style: 'mixed', cutaway: true });

    this.gapWall(g, -0.6, -D / 2, 0.6, -D / 2, 0, 3.0, { center: 0.5, width: 0, full: true }, {});

    this.wall(u, -W / 2, -D / 2, W / 2, -D / 2, 3.2, 2.8, { style: 'mixed', cutaway: true });
    this.wall(u, W / 2, -D / 2, W / 2, D / 2, 3.2, 2.8, { style: 'mixed', cutaway: true });
    this.wall(u, W / 2, D / 2, -W / 2, D / 2, 3.2, 2.8, { style: 'mixed', cutaway: true });
    this.wall(u, -W / 2, D / 2, -W / 2, -D / 2, 3.2, 2.8, { style: 'mixed', cutaway: true });

    this.wall(a, -W / 2, -D / 2, W / 2, -D / 2, 6.2, 2.0, { style: 'solid', cutaway: true });
    this.wall(a, W / 2, -D / 2, W / 2, D / 2, 6.2, 2.0, { style: 'solid', cutaway: true });
    this.wall(a, W / 2, D / 2, -W / 2, D / 2, 6.2, 2.0, { style: 'solid', cutaway: true });
    this.wall(a, -W / 2, D / 2, -W / 2, -D / 2, 6.2, 2.0, { style: 'solid', cutaway: true });

    this.interiorWalls();
    this.buildDoorsAndWindows();
  }

  interiorWalls() {
    const g = this.groups.ground;
    const D = HOUSE.D, W = HOUSE.W;
    this.gapWall(g, 0, -1.5, 0, -D / 2, 0, 3.0, { center: 0.5, width: 2.2, full: true });
    this.gapWall(g, 0, 0, 0, D / 2, 0, 3.0, { center: 0.28, width: 1.1, full: true });
    this.gapWall(g, -W / 2, 0, 0, 0, 0, 3.0, { center: 0.5, width: 1.6, full: true });
    this.gapWall(g, 0, 0, W / 2, 0, 0, 3.0, { center: 0.5, width: 1.6, full: true });

    const u = this.groups.upper;
    this.wall(u, 0, -D / 2, 0, -1.0, 3.2, 2.8, { style: 'solid' });
    this.gapWall(u, 0, 0, 0, D / 2, 3.2, 2.8, { center: 0.5, width: 2.4, full: true });
    this.wall(u, -W / 2, 0, 0, 0, 3.2, 2.8, { style: 'solid' });

    const a = this.groups.attic;
    this.wall(a, -W / 2, 0, W / 2, 0, 6.2, 2.0, { style: 'solid' });
  }

  buildDoorsAndWindows() {
    const g = this.groups.ground, u = this.groups.upper;
    const D = HOUSE.D, W = HOUSE.W;

    const frontDoor = doorUnit(g, 1.1, 2.6, 0, 1.3, -D / 2 + 0.02, 0, {
      type: 'door', title: 'Haupteingang', desc: 'Moderne Eingangstür mit Smart-Lock, Bewegungs- und Temperatursensor. Automatisches Entriegeln über die lokale Haus-KI.', action: 'toggleDoor'
    });
    this.registerInteractive(frontDoor, { type: 'door', title: 'Haupteingang', desc: frontDoor.userData.info.desc });
    this.doors = this.doors || [];
    this.doors.push(frontDoor);
    this.setupDoor(frontDoor);

    const bedroomDoor = doorUnit(g, 1.0, 2.6, 0, 4.3, 1.5, Math.PI / 2, {
      type: 'door', title: 'Schlafzimmer-Tür', desc: 'Schallgedämmte Innentür zum Schlafzimmer mit automischer Verdunkelung und Temperaturregelung.', action: 'toggleDoor'
    });
    this.registerInteractive(bedroomDoor, { type: 'door', title: 'Schlafzimmer-Tür', desc: bedroomDoor.userData.info.desc });
    this.doors.push(bedroomDoor);
    this.setupDoor(bedroomDoor);

    const atticHatch = doorUnit(u, 1.0, 2.4, 0, 5.5, -D / 2 + 0.02, 0, {
      type: 'door', title: 'Zugang Technikdachboden', desc: 'Sicher integrierter, unscheinbarer Zugang zum Technikdachboden. Wird von der Haus-KI überwacht.'
    });
    this.registerInteractive(atticHatch, { type: 'door', title: 'Dachboden-Zugang', desc: atticHatch.userData.info.desc });
    this.doors.push(atticHatch);
    this.setupDoor(atticHatch);

    const makeWindow = (parent, w, h, x, y, z, ry, title, desc) => {
      const win = windowUnit(parent, w, h, x, y, z, ry, true);
      win.userData.blind = box(parent, w, h, 0.02, x, y, z + 0.03 * Math.sign(Math.cos(ry) || 1), materials().fabricDark);
      win.userData.blind.visible = false;
      this.registerInteractive(win, { type: 'window', title, desc, action: 'toggleWindow' });
      this.windows = this.windows || [];
      this.windows.push(win);
      this.setupWindow(win);
      return win;
    };

    makeWindow(g, 2.0, 1.4, -W / 2 + 0.02, 1.7, 2.5, Math.PI / 2, 'Wohnzimmer-Fenster', 'Großes Fenster mit automatischer Verdunkelung und Jalousiensteuerung.');
    makeWindow(g, 1.8, 1.4, W / 2 - 0.02, 1.7, -2.5, -Math.PI / 2, 'Küchen-Fenster', 'Helles Fenster zum Essbereich mit intelligenter Beleuchtungssteuerung.');
    makeWindow(g, 1.8, 1.4, W / 2 - 0.02, 1.7, 3.5, -Math.PI / 2, 'Schlafzimmer-Fenster', 'Verdunkelbares Fenster für ruhigen Schlaf.');

    const cornerWin1 = windowUnit(u, 4.0, 1.9, -W / 2 + 0.02, 4.6, 2.0, Math.PI / 2, true);
    this.registerInteractive(cornerWin1, { type: 'window', title: 'Eckfenster (Ost)', desc: 'Zusammenhängendes Eckfenster über zwei Außenwände mit viel Tageslicht.', action: 'toggleWindow' });
    this.setupWindow(cornerWin1);
    const cornerWin2 = windowUnit(u, 3.0, 1.9, -2.0, 4.6, D / 2 - 0.02, 0, true);
    this.registerInteractive(cornerWin2, { type: 'window', title: 'Eckfenster (Süd)', desc: 'Teil des durchgehenden Eckfensters am Arbeitsplatz.', action: 'toggleWindow' });
    this.setupWindow(cornerWin2);
  }

  buildStairs() {
    const g = this.groups.ground, u = this.groups.upper;
    const s1 = stair(g, 4.0, 0.0, -2.5, 14, 1.1, 0.22, 0.21, 0);
    this.stairTriggers.push({ box: new THREE.Box3(new THREE.Vector3(3.3, 0, -5.5), new THREE.Vector3(4.7, 3, -2.3)), toFloor: 'upper', y: HOUSE.UPPER_Y + 0.1 });

    const s2 = stair(u, 1.2, 3.2, -3.0, 12, 1.0, 0.23, 0.23, 0);
    this.stairTriggers.push({ box: new THREE.Box3(new THREE.Vector3(0.5, 3.2, -5.6), new THREE.Vector3(1.9, 6, -2.8)), toFloor: 'attic', y: HOUSE.ATTIC_Y + 0.1 });
  }

  setupDoor(d) {
    d.userData.open = false;
    this.animated.push((dt) => {
      const p = d.userData.pivot;
      const target = d.userData.open ? -1.2 : 0;
      p.rotation.y += (target - p.rotation.y) * Math.min(1, dt * 6);
    });
  }

  setupWindow(win) {
    win.userData.open = false;
    this.animated.push((dt) => {
      const gg = win.userData.glassGroup;
      if (!gg) return;
      const target = win.userData.open ? 0.45 : 0;
      gg.rotation.x += (target - gg.rotation.x) * Math.min(1, dt * 5);
    });
  }

  buildSolar() {
    const r = this.groups.roof;
    slab(r, HOUSE.W, HOUSE.D, 0, 8.35, 0, 'slab');
    box(r, HOUSE.W + 0.4, 0.12, HOUSE.D + 0.4, 0, 8.55, 0, materials().tech);
    box(r, HOUSE.W - 0.6, 0.05, 0.1, 0, 8.62, 0, materials().metal);

    const tilt = THREE.MathUtils.degToRad(38);
    const rows = 4, cols = 6;
    const pw = 1.0, pl = 1.7;
    const spacingX = 2.3, spacingZ = 2.4;
    const startX = -((cols - 1) * spacingX) / 2;
    const startZ = -((rows - 1) * spacingZ) / 2;
    this.solarPanels = [];
    for (let rI = 0; rI < rows; rI++) {
      for (let cI = 0; cI < cols; cI++) {
        const px = startX + cI * spacingX;
        const pz = startZ + rI * spacingZ;
        const p = solarPanel(r, px, 8.8, pz, 0);
        p.rotation.x = -tilt;
        p.position.y = 8.9 + Math.sin(tilt) * pl / 2;
        this.registerInteractive(p, {
          type: 'solar', title: 'Solarpanel',
          desc: `Photovoltaik-Modul ${rI * cols + cI + 1}. Neigung 38°, Ausrichtung Süd. Geschätzte Leistung ~320 Wp.`,
          action: 'selectSolar'
        });
        this.solarPanels.push(p);
      }
    }
    ventDuct(r, 0, 8.7, -3, 6, 0);
    box(r, 0.1, 0.1, 0.1, 2, 8.7, 2, materials().metal);
  }

  buildRooms() {
    buildGroundFloor(this.groups.ground, this, this.lighting);
    buildUpperFloor(this.groups.upper, this, this.lighting);
    buildTechAttic(this.groups.attic, this, this.lighting);
  }

  registerInteractive(obj, data) {
    obj.userData.interactive = data;
    this.interactive.push(obj);
  }

  setFloorVisibility() {
    for (const k of ['ground', 'upper', 'attic', 'roof']) {
      this.groups[k].visible = this.state.data.floorVisible[k];
    }
  }

  setExploded(exploded) {
    const off = exploded ? 1 : 0;
    const E = { ground: 0, upper: 2.4, attic: 5.0, roof: 7.8 };
    for (const k of ['ground', 'upper', 'attic', 'roof']) {
      const target = E[k] * off;
      this.groups[k].userData.targetY = target;
    }
  }

  setCutaway(on) {
    for (const g of this.hideInCutaway) {
      g.visible = !on;
    }
  }

  applyState() {
    this.setFloorVisibility();
    this.setExploded(this.state.data.exploded);
    this.setCutaway(this.state.data.cutaway);
  }

  update(dt) {
    for (const k of ['ground', 'upper', 'attic', 'roof']) {
      const grp = this.groups[k];
      const ty = grp.userData.targetY || 0;
      grp.position.y += (ty - grp.position.y) * Math.min(1, dt * 4);
    }
    for (const fn of this.animated) fn(dt);
  }

  findByType(type) {
    return this.interactive.filter(o => o.userData.interactive && o.userData.interactive.type === type);
  }
}
