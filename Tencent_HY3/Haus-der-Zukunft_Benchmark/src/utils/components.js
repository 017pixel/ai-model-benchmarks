import * as THREE from 'three';
import { materials } from './materials.js';
import { COLORS } from './constants.js';

let M;
function mat(name) {
  if (!M) M = materials();
  return M[name];
}

export function box(parent, w, h, d, x, y, z, material, name) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  if (name) m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

export function cyl(parent, rt, rb, h, x, y, z, material, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

function tag(mesh, info) {
  if (info) mesh.userData = Object.assign(mesh.userData, info);
  return mesh;
}

export function registerInteractive(group, mesh, data) {
  if (!group.userData.interactive) group.userData.interactive = [];
  group.userData.interactive.push(mesh);
  mesh.userData.interactive = data;
  return mesh;
}

/* ---------------- Architecture ---------------- */

export function slab(parent, w, d, x, y, z, material = 'slab') {
  return box(parent, w, 0.2, d, x, y, z, mat(material));
}

export function wallSegment(parent, w, h, d, x, y, z, material = 'wall') {
  return box(parent, w, h, d, x, y, z, mat(material));
}

export function ceilingLight(parent, x, y, z, color = 0xfff1d6) {
  const g = new THREE.Group();
  const housing = box(g, 0.5, 0.06, 0.5, 0, 0, 0, mat('techPanel'));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.4 }));
  bulb.position.y = -0.04;
  g.add(bulb);
  const light = new THREE.PointLight(color, 0, 6, 2);
  light.position.y = -0.05;
  g.add(light);
  g.position.set(x, y, z);
  g.userData.light = light;
  g.userData.bulb = bulb;
  if (parent) parent.add(g);
  return g;
}

export function windowUnit(parent, w, h, x, y, z, rotY = 0, openable = true) {
  const g = new THREE.Group();
  const frame = mat('black');
  const ft = 0.06;
  box(g, w, ft, ft, 0, h / 2, 0, frame);
  box(g, w, ft, ft, 0, -h / 2, 0, frame);
  box(g, ft, h, ft, -w / 2, 0, 0, frame);
  box(g, ft, h, ft, w / 2, 0, 0, frame);
  const glassG = new THREE.Group();
  const glass = box(glassG, w - 2 * ft, h - 2 * ft, 0.02, 0, 0, 0, mat('glass'));
  glassG.position.z = 0;
  g.add(glassG);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.userData.glassGroup = glassG;
  g.userData.openable = openable;
  if (parent) parent.add(g);
  return g;
}

export function doorUnit(parent, w, h, x, y, z, rotY = 0, info) {
  const g = new THREE.Group();
  const ft = 0.08;
  const frameMat = mat('black');
  box(g, w + 2 * ft, ft, ft, 0, h / 2 + ft / 2, 0, frameMat);
  box(g, w + 2 * ft, ft, ft, 0, -ft / 2, 0, frameMat);
  box(g, ft, h + ft, ft, -w / 2 - ft / 2, h / 2, 0, frameMat);
  box(g, ft, h + ft, ft, w / 2 + ft / 2, h / 2, 0, frameMat);

  const pivot = new THREE.Group();
  const panelMat = mat('wood');
  const panel = box(pivot, w - 0.02, h - 0.04, 0.05, 0, -h / 2 + 0.02, 0, panelMat);
  const handle = cyl(pivot, 0.025, 0.025, 0.06, w / 2 - 0.12, -h / 2 + 0.5, 0.05, mat('metal'), 10);
  pivot.position.set(-w / 2, 0, 0);
  g.add(pivot);

  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.userData.pivot = pivot;
  g.userData.open = false;
  g.userData.baseRot = rotY;
  if (info) g.userData.info = info;
  if (parent) parent.add(g);
  return g;
}

export function stair(parent, x, y, z, steps, w, run, rise, rotY = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < steps; i++) {
    const sw = run;
    const sy = rise;
    box(g, w, sy + 0.02, sw, 0, i * rise + sy / 2, -i * run - sw / 2, mat('wood'));
    box(g, w, 0.04, sw, 0, i * rise + sy + 0.02, -i * run - sw / 2, mat('black'));
  }
  const totalH = steps * rise;
  const totalRun = steps * run;
  const railMat = mat('black');
  const postN = Math.floor(totalRun / 0.5);
  for (let i = 0; i <= postN; i++) {
    const zz = -i * 0.5;
    cyl(g, 0.02, 0.02, 0.9, -w / 2 + 0.06, totalH * (i / postN) + 0.45, zz, railMat, 8);
    cyl(g, 0.02, 0.02, 0.9, w / 2 - 0.06, totalH * (i / postN) + 0.45, zz, railMat, 8);
  }
  box(g, 0.03, 0.04, totalRun, -w / 2 + 0.06, totalH + 0.46, -totalRun / 2, railMat);
  box(g, 0.03, 0.04, totalRun, w / 2 - 0.06, totalH + 0.46, -totalRun / 2, railMat);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

/* ---------------- Furniture ---------------- */

export function sofa(parent, w, x, y, z, rotY = 0, dark = false) {
  const g = new THREE.Group();
  const fm = mat(dark ? 'fabricDark' : 'fabric');
  box(g, w, 0.35, 0.95, 0, 0.32, 0, fm);
  box(g, w, 0.5, 0.2, 0, 0.6, -0.37, fm);
  box(g, w, 0.2, 0.9, 0, 0.18, 0, fm);
  box(g, 0.2, 0.45, 0.95, -w / 2 + 0.1, 0.45, 0, fm);
  box(g, 0.2, 0.45, 0.95, w / 2 - 0.1, 0.45, 0, fm);
  for (let i = -1; i <= 1; i++) {
    box(g, 0.55, 0.18, 0.55, i * (w / 3.2), 0.52, 0.05, mat('accent'));
  }
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

export function beanbag(parent, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('fabric'));
  m.scale.set(1, 0.7, 1);
  m.position.y = 0.05;
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

export function rug(parent, w, d, x, y, z, color = COLORS.carpet) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d),
    new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  m.position.set(x, y, z);
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

export function table(parent, w, d, h, x, y, z, rotY = 0, wood = 'wood') {
  const g = new THREE.Group();
  box(g, w, 0.06, d, 0, h, 0, mat(wood));
  const lw = 0.07;
  box(g, lw, h, lw, -w / 2 + 0.1, h / 2, -d / 2 + 0.1, mat('black'));
  box(g, lw, h, lw, w / 2 - 0.1, h / 2, -d / 2 + 0.1, mat('black'));
  box(g, lw, h, lw, -w / 2 + 0.1, h / 2, d / 2 - 0.1, mat('black'));
  box(g, lw, h, lw, w / 2 - 0.1, h / 2, d / 2 - 0.1, mat('black'));
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

export function chair(parent, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  const fm = mat('black');
  box(g, 0.45, 0.06, 0.45, 0, 0.46, 0, fm);
  box(g, 0.45, 0.45, 0.05, 0, 0.68, -0.2, fm);
  box(g, 0.04, 0.46, 0.04, -0.18, 0.23, -0.18, mat('metal'));
  box(g, 0.04, 0.46, 0.04, 0.18, 0.23, -0.18, mat('metal'));
  box(g, 0.04, 0.46, 0.04, -0.18, 0.23, 0.18, mat('metal'));
  box(g, 0.04, 0.46, 0.04, 0.18, 0.23, 0.18, mat('metal'));
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

export function bed(parent, w, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  box(g, w, 0.3, 2.1, 0, 0.25, 0, mat('wood'));
  box(g, w - 0.1, 0.18, 2.0, 0, 0.55, 0.05, mat('fabric'));
  box(g, w - 0.1, 0.12, 0.6, 0, 0.62, -0.7, mat('whiteEmissive'));
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

export function nightstand(parent, x, y, z) {
  const g = new THREE.Group();
  box(g, 0.5, 0.45, 0.4, 0, 0.22, 0, mat('wood'));
  box(g, 0.4, 0.02, 0.3, 0, 0.46, 0, mat('black'));
  cyl(g, 0.02, 0.02, 0.04, 0.12, 0.48, 0, mat('metal'), 8);
  if (parent) parent.add(g);
  g.position.set(x, y, z);
  return g;
}

export function shelf(parent, w, h, d, x, y, z, rotY = 0, shelves = 4) {
  const g = new THREE.Group();
  box(g, w, h, 0.04, 0, h / 2, -d / 2 + 0.02, mat('wood'));
  box(g, 0.04, h, d, -w / 2 + 0.02, h / 2, 0, mat('wood'));
  box(g, 0.04, h, d, w / 2 - 0.02, h / 2, 0, mat('wood'));
  for (let i = 0; i <= shelves; i++) {
    box(g, w - 0.06, 0.03, d - 0.04, 0, (i / shelves) * h, 0, mat('woodDark'));
  }
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

export function bookshelfFill(parent, w, h, d, x, y, z, rotY = 0) {
  const g = shelf(parent, w, h, d, x, y, z, rotY, 4);
  const bookColors = [0x8a3b32, 0x2f5d6e, 0x4a6b2f, 0xb89b5e, 0x33373d, 0x6e4a6e];
  for (let s = 0; s < 4; s++) {
    let bx = -w / 2 + 0.12;
    const shelfY = (s / 4) * h + 0.25;
    while (bx < w / 2 - 0.12) {
      const bw = 0.04 + Math.random() * 0.06;
      const bh = 0.22 + Math.random() * 0.1;
      const bm = new THREE.MeshStandardMaterial({ color: bookColors[Math.floor(Math.random() * bookColors.length)], roughness: 0.9 });
      box(g, bw, bh, d - 0.18, bx + bw / 2, shelfY + bh / 2, 0, bm);
      bx += bw + 0.012;
    }
  }
  return g;
}

export function plant(parent, x, y, z, scale = 1) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.13 * scale, 0.3 * scale, 14), mat('stone'));
  pot.position.y = 0.15 * scale; pot.castShadow = true; pot.receiveShadow = true;
  g.add(pot);
  const stemMat = mat('leafDark');
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16 * scale, 8, 6), mat(i % 2 ? 'leaf' : 'leafDark'));
    leaf.scale.set(1, 0.35, 0.6);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.12 * scale, 0.35 * scale + Math.random() * 0.4 * scale, Math.sin(a) * 0.12 * scale);
    leaf.rotation.set(Math.random(), a, Math.random() * 0.5);
    leaf.castShadow = true;
    g.add(leaf);
  }
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.2 * scale, 8, 6), mat('leaf'));
  top.scale.set(1, 0.4, 1);
  top.position.y = 0.85 * scale;
  g.add(top);
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}

export function tv(parent, w, h, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  box(g, w + 0.06, h + 0.06, 0.06, 0, 0, 0, mat('black'));
  const screen = box(g, w, h, 0.02, 0, 0, 0.02, mat('screen').clone());
  g.userData.screen = screen;
  g.userData.on = false;
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

export function pendantLight(parent, x, y, z) {
  const g = new THREE.Group();
  const cord = cyl(g, 0.01, 0.01, 0.6, 0, 0.3, 0, mat('black'), 6);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.18, 18, 1, true),
    new THREE.MeshStandardMaterial({ color: COLORS.matteBlack, roughness: 0.5, side: THREE.DoubleSide }));
  shade.position.y = -0.02;
  g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xfff1d6, emissiveIntensity: 1.6 }));
  bulb.position.y = -0.08;
  g.add(bulb);
  const light = new THREE.PointLight(0xfff1d6, 0, 7, 2);
  light.position.y = -0.1;
  g.add(light);
  g.position.set(x, y, z);
  g.userData.light = light;
  g.userData.bulb = bulb;
  if (parent) parent.add(g);
  return g;
}

export function wallSconce(parent, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  box(g, 0.06, 0.32, 0.1, 0, 0, 0, mat('black'));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xfff1d6, emissiveIntensity: 1.4 }));
  bulb.position.z = 0.07;
  g.add(bulb);
  const light = new THREE.PointLight(0xfff1d6, 0, 4, 2);
  light.position.z = 0.1;
  g.add(light);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.userData.light = light;
  g.userData.bulb = bulb;
  if (parent) parent.add(g);
  return g;
}

export function kitchenIsland(parent, w, d, x, y, z) {
  const g = new THREE.Group();
  box(g, w, 0.9, d, 0, 0.45, 0, mat('whiteEmissive'));
  box(g, w + 0.04, 0.08, d + 0.04, 0, 0.92, 0, mat('stone'));
  for (let i = -1; i <= 1; i++) {
    box(g, 0.5, 0.4, 0.02, i * (w / 3.2), 0.3, -d / 2 + 0.01, mat('black'));
    cyl(g, 0.02, 0.02, 0.04, i * (w / 3.2), 0.72, -d / 2 + 0.02, mat('metal'), 8);
  }
  box(g, 0.5, 0.04, 0.3, w / 2 - 0.4, 0.7, 0, mat('metalDark'));
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}

export function cabinet(parent, w, h, d, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  box(g, w, h, d, 0, h / 2, 0, mat('whiteEmissive'));
  for (let i = -1; i <= 1; i += 2) {
    cyl(g, 0.015, 0.015, 0.05, i * w / 4, h / 2, d / 2 + 0.01, mat('metal'), 8);
  }
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

/* ---------------- Workstation ---------------- */

export function monitor(parent, w, h, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  const screen = box(g, w, h, 0.03, 0, 0, 0, mat('screen').clone());
  g.userData.screen = screen;
  g.userData.on = false;
  const stand = box(g, 0.06, 0.22, 0.06, 0, -h / 2 - 0.11, 0, mat('metalDark'));
  box(g, 0.22, 0.02, 0.16, 0, -h / 2 - 0.22, 0, mat('metalDark'));
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

export function workstation(parent, x, y, z) {
  const g = new THREE.Group();
  const topY = 0.74;
  box(g, 1.8, 0.05, 0.8, 0, topY, 0, mat('wood'));
  const legMat = mat('metalDark');
  box(g, 0.06, topY, 0.06, -0.85, topY / 2, -0.35, legMat);
  box(g, 0.06, topY, 0.06, 0.85, topY / 2, -0.35, legMat);
  const lift = box(g, 0.12, topY - 0.05, 0.12, 0, (topY - 0.05) / 2, 0.3, mat('black'));
  g.userData.lift = lift;
  g.userData.baseTop = topY;
  g.userData.baseY = lift.position.y;
  g.userData.raised = false;

  const m1 = monitor(g, 0.62, 0.36, -0.5, topY + 0.4, -0.28, 0);
  const m2 = monitor(g, 0.62, 0.36, 0, topY + 0.4, -0.3, 0);
  const m3 = monitor(g, 0.62, 0.36, 0.5, topY + 0.4, -0.28, 0);
  g.userData.monitors = [m1, m2, m3];

  const mac = box(g, 0.22, 0.04, 0.22, -0.55, topY + 0.04, 0.18, mat('metal'));
  box(g, 0.34, 0.01, 0.24, -0.55, topY + 0.07, 0.18, mat('metal'));
  const kb = box(g, 0.4, 0.02, 0.13, 0.1, topY + 0.04, 0.18, mat('whiteEmissive'));
  const mouse = box(g, 0.05, 0.02, 0.08, 0.42, topY + 0.04, 0.2, mat('whiteEmissive'));
  const laptop = box(g, 0.32, 0.02, 0.22, 0.6, topY + 0.04, -0.05, mat('metal'));
  box(g, 0.32, 0.02, 0.22, 0.6, topY + 0.26, -0.18, mat('metal'));
  const speakerL = cyl(g, 0.06, 0.07, 0.22, -0.85, topY + 0.11, 0.25, mat('black'), 14);
  const speakerR = cyl(g, 0.06, 0.07, 0.22, 0.85, topY + 0.11, 0.25, mat('black'), 14);
  const mic = cyl(g, 0.02, 0.02, 0.3, 0.2, topY + 0.2, -0.2, mat('metal'), 8);
  const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), mat('black'));
  micHead.position.set(0.2, topY + 0.35, -0.2);
  g.add(micHead);

  const cableTray = box(g, 1.6, 0.04, 0.06, 0, topY - 0.08, 0.1, mat('tech'));
  g.add(cableTray);

  g.userData.allOn = () => {
    g.userData.monitors.forEach(m => (m.userData.on = !m.userData.on));
    return g.userData.monitors[0].userData.on;
  };

  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}

/* ---------------- Technical systems ---------------- */

export function serverRack(parent, x, y, z, rotY = 0, id = 'rack') {
  const g = new THREE.Group();
  const W = 0.6, H = 2.0, D = 1.0;
  box(g, W, H, D, 0, H / 2, 0, mat('tech'));
  const leds = [];
  const units = 10;
  for (let i = 0; i < units; i++) {
    const uy = 0.15 + i * (H - 0.3) / units;
    box(g, W - 0.06, (H - 0.3) / units - 0.04, 0.04, 0, uy, D / 2 + 0.001, mat('techPanel'));
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01),
      i % 3 === 0 ? mat('ledGreen') : (i % 3 === 1 ? mat('ledAmber') : mat('ledRed')));
    led.position.set(-W / 2 + 0.1, uy + 0.02, D / 2 + 0.01);
    g.add(led);
    leds.push(led);
    const vent = box(g, W - 0.2, 0.02, 0.02, 0.12, uy + 0.02, D / 2 + 0.01, mat('metalDark'));
  }
  g.userData.leds = leds;
  g.userData.id = id;
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

export function batteryBank(parent, x, y, z, rotY = 0, id = 'batt') {
  const g = new THREE.Group();
  const W = 1.2, H = 1.4, D = 0.6;
  box(g, W, H, D, 0, H / 2, 0, mat('techPanel'));
  for (let i = 0; i < 3; i++) {
    box(g, W - 0.1, H / 3 - 0.06, 0.04, 0, H / 6 + i * H / 3, D / 2 + 0.001, mat('tech'));
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.01), mat('ledGreen'));
    led.position.set(W / 2 - 0.12, H / 6 + i * H / 3, D / 2 + 0.01);
    g.add(led);
  }
  g.userData.id = id;
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

export function inverter(parent, x, y, z, rotY = 0, id = 'inv') {
  const g = new THREE.Group();
  const W = 0.5, H = 0.8, D = 0.3;
  box(g, W, H, D, 0, H / 2, 0, mat('whiteEmissive'));
  box(g, W - 0.06, H - 0.06, 0.04, 0, H / 2, D / 2 + 0.001, mat('techPanel'));
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.01), mat('ledGreen'));
  led.position.set(W / 2 - 0.1, H / 2 + 0.15, D / 2 + 0.01);
  g.add(led);
  g.userData.id = id;
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

export function solarPanel(parent, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  const W = 1.0, L = 1.7;
  const frame = box(g, W, 0.04, L, 0, 0, 0, mat('metal'));
  const cells = box(g, W - 0.06, 0.02, L - 0.06, 0, 0.03, 0, mat('solarCell'));
  g.userData.surface = cells;
  for (let i = -1; i <= 1; i++) {
    box(g, W - 0.04, 0.01, 0.02, 0, 0.045, (i * L) / 3, mat('metal'));
    box(g, 0.02, 0.01, L - 0.04, (i * W) / 3, 0.045, 0, mat('metal'));
  }
  const legMat = mat('metal');
  cyl(g, 0.02, 0.02, 0.3, -W / 2 + 0.1, -0.17, -L / 2 + 0.1, legMat, 8);
  cyl(g, 0.02, 0.02, 0.3, W / 2 - 0.1, -0.17, -L / 2 + 0.1, legMat, 8);
  cyl(g, 0.02, 0.02, 0.3, -W / 2 + 0.1, -0.17, L / 2 - 0.1, legMat, 8);
  cyl(g, 0.02, 0.02, 0.3, W / 2 - 0.1, -0.17, L / 2 - 0.1, legMat, 8);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}

export function ventDuct(parent, x, y, z, len, rotY = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, len, 14),
    mat('metalDark'));
  m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.castShadow = true;
  if (parent) parent.add(m);
  return m;
}

export function wallOutlet(parent, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  box(g, 0.05, 0.12, 0.08, 0, 0, 0, mat('whiteEmissive'));
  box(g, 0.02, 0.04, 0.02, 0, 0.02, 0.04, mat('black'));
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (parent) parent.add(g);
  return g;
}
