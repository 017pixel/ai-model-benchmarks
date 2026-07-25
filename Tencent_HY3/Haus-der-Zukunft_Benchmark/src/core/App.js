import * as THREE from 'three';
import { State } from './State.js';
import { SceneManager } from './SceneManager.js';
import { Lighting } from './Lighting.js';
import { House } from '../house/House.js';
import { buildEnvironment } from '../environment/Environment.js';
import { LocalAI } from '../systems/LocalAI.js';
import { CameraController } from '../camera/CameraController.js';
import { InteractionManager } from '../interaction/InteractionManager.js';
import { UI } from '../ui/UI.js';
import { ControlPanel } from '../ui/ControlPanel.js';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

export class App {
  constructor() {
    this.state = new State();
    this.canvas = document.getElementById('scene');
    this.loadingEl = document.getElementById('loading');
    this.fillEl = document.getElementById('loading-fill');
    this.statusEl = document.getElementById('loading-status');
    this.clock = new THREE.Clock();
  }

  async setProgress(p, text) {
    this.fillEl.style.width = p + '%';
    if (text) this.statusEl.textContent = text;
    await wait(120);
  }

  async init() {
    await this.setProgress(6, 'Initialisiere Renderer …');
    this.sm = new SceneManager(this.canvas, this.state);

    await this.setProgress(16, 'Baue Außenumgebung …');
    this.env = buildEnvironment(this.sm.scene, this.state);

    await this.setProgress(30, 'Errichte Hausstruktur …');
    this.lighting = new Lighting(this.sm.scene, this.sm);
    this.house = new House(this.sm.scene, this.state, this.lighting);

    await this.setProgress(55, 'Möblierung & Räume …');
    this.house.buildRooms();
    this.house.applyState();

    await this.setProgress(72, 'Technik & Beleuchtung …');
    this.localAI = new LocalAI(this.state);

    await this.setProgress(84, 'Kamera & Interaktion …');
    this.ctrl = new CameraController(this.sm.camera, this.canvas, this.house, this.state, this.sm);
    this.interaction = new InteractionManager(this.sm.camera, this.canvas, this.house, this.state, this.ctrl);
    this.cp = new ControlPanel(this.state, document.getElementById('ai-panel'));
    this.ui = new UI(this.state, this.house, this.ctrl, this.cp);

    await this.setProgress(94, 'Optimiere Performance …');
    this.house.root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = o.castShadow !== false;
        o.receiveShadow = true;
        if (o.geometry) o.geometry.computeBoundingSphere();
      }
    });

    await this.setProgress(100, 'Bereit.');
    await wait(350);
    this.loadingEl.classList.add('fade');
    setTimeout(() => this.loadingEl.classList.add('hidden'), 800);

    this.state.on('exploded', () => this.house.setExploded(this.state.get('exploded')));
    this.state.on('cutaway', () => this.house.setCutaway(this.state.get('cutaway')));
    this.state.on('floorVisible', () => this.house.setFloorVisibility());
    this.state.on('walkFloor', (f) => this.ctrl.goFloor(f));
    this.state.on('cameraMode', (m) => {
      if (m === 'walk') this.ctrl.setMode('walk');
    });

    this.loop();
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(0.05, this.clock.getDelta());

    const res = this.lighting.update(this.state.get('timeOfDay'), this.state.get('lightsOn'));
    this.house.update(dt);
    this.ctrl.update(dt);
    this.localAI.tick(dt);

    if (this.env && this.env.userData.outdoorLight) {
      const nightish = res.nightish;
      this.env.userData.outdoorLight.intensity = nightish ? 1.4 : 0;
      this.env.userData.outdoorBulb.material.emissiveIntensity = nightish ? 1.2 : 0;
    }

    this.ui.updateEnergy();
    this.cp.update();
    this.updateOverlay();

    this.sm.render();
  }

  updateOverlay() {
    const mode = this.state.get('cameraMode');
    const cross = document.getElementById('crosshair');
    const hint = document.getElementById('hint');
    if (mode === 'walk') {
      if (this.ctrl.locked) {
        cross.classList.remove('hidden');
        hint.classList.remove('hidden');
        hint.textContent = 'WASD bewegen · Maus drehen · Shift rennen · ESC freigeben';
      } else {
        cross.classList.add('hidden');
        hint.classList.remove('hidden');
        hint.textContent = 'Klicken zum Umsehen';
      }
    } else {
      cross.classList.add('hidden');
      hint.classList.add('hidden');
    }
  }
}
