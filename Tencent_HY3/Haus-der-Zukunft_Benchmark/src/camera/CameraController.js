import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLAYER, HOUSE } from '../utils/constants.js';

const FLOOR_BASE = { ground: 0, upper: HOUSE.UPPER_Y, attic: HOUSE.ATTIC_Y };

export class CameraController {
  constructor(camera, dom, house, state, sm) {
    this.camera = camera;
    this.dom = dom;
    this.house = house;
    this.state = state;
    this.sm = sm;

    this.mode = 'exterior';
    this.orbit = new OrbitControls(camera, dom);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.maxPolarAngle = Math.PI / 2.05;
    this.orbit.minDistance = 6;
    this.orbit.maxDistance = 70;
    this.orbit.target.set(0, 2, 0);

    this.yaw = 0.6;
    this.pitch = -0.1;
    this.pos = new THREE.Vector3(20, 14, 24);
    this.floorY = 0;
    this.walkY = PLAYER.height;
    this.locked = false;

    this.keys = {};
    this.sens = 0.0022;

    this.onKeyDown = (e) => { this.keys[e.code] = true; };
    this.onKeyUp = (e) => { this.keys[e.code] = false; };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.onMouseMove = (e) => this.handleMouse(e);
    this.onClick = () => { if (this.mode === 'walk' && !this.locked) this.dom.requestPointerLock(); };
    this.onLock = () => { this.locked = true; };
    this.onUnlock = () => { this.locked = false; };
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
    });
    this.dom.addEventListener('click', this.onClick);
    document.addEventListener('mousemove', this.onMouseMove);
  }

  setMode(mode) {
    const prev = this.mode;
    this.mode = mode;
    if (mode === 'walk') {
      this.orbit.enabled = false;
      const wf = this.state.get('walkFloor') || 'ground';
      const f = FLOOR_BASE[wf];
      this.floorY = f;
      this.pos.set(3, f + PLAYER.height, 2);
      this.yaw = 0.6; this.pitch = -0.05;
    } else {
      this.orbit.enabled = true;
      if (document.pointerLockElement) document.exitPointerLock();
      this.locked = false;
      if (prev === 'walk') {
        this.orbit.target.set(0, 2, 0);
        this.camera.position.set(20, 14, 24);
        this.camera.quaternion.identity();
        this.orbit.update();
      }
    }
  }

  handleMouse(e) {
    if (this.mode !== 'walk' || !this.locked) return;
    this.yaw -= e.movementX * this.sens;
    this.pitch -= e.movementY * this.sens;
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));
  }

  collide(x, z, floorY) {
    const r = PLAYER.radius;
    for (const c of this.house.colliders) {
      if (c.yMax < floorY - 1.7 || c.yMin > floorY + 0.6) continue;
      if (x > c.box.min.x - r && x < c.box.max.x + r &&
          z > c.box.min.z - r && z < c.box.max.z + r) return true;
    }
    return false;
  }

  update(dt) {
    if (this.mode === 'walk') {
      const speed = (this.keys['ShiftLeft'] ? PLAYER.sprint : PLAYER.speed) * dt;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      let dx = 0, dz = 0;
      if (this.keys['KeyW']) { dx += fx; dz += fz; }
      if (this.keys['KeyS']) { dx -= fx; dz -= fz; }
      if (this.keys['KeyD']) { dx += rx; dz += rz; }
      if (this.keys['KeyA']) { dx -= rx; dz -= rz; }
      const len = Math.hypot(dx, dz);
      if (len > 0) { dx = dx / len * speed; dz = dz / len * speed; }

      const nx = this.pos.x + dx;
      if (!this.collide(nx, this.pos.z, this.floorY)) this.pos.x = nx;
      const nz = this.pos.z + dz;
      if (!this.collide(this.pos.x, nz, this.floorY)) this.pos.z = nz;

      const wf = this.state.get('walkFloor');
      let target = FLOOR_BASE[wf];
      for (const t of this.house.stairTriggers) {
        if (this.pos.x > t.box.min.x && this.pos.x < t.box.max.x &&
            this.pos.z > t.box.min.z && this.pos.z < t.box.max.z) {
          target = t.y;
          this.state.set('walkFloor', t.toFloor);
        }
      }
      this.floorY += (target - this.floorY) * Math.min(1, dt * 3);

      this.camera.position.set(this.pos.x, this.floorY + PLAYER.height, this.pos.z);
      const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
      this.camera.quaternion.setFromEuler(euler);
    } else {
      this.orbit.update();
    }
  }

  reset() {
    this.mode = 'exterior';
    this.orbit.enabled = true;
    this.state.set('cameraMode', 'exterior');
    this.orbit.target.set(0, 2, 0);
    this.camera.position.set(20, 14, 24);
    this.camera.quaternion.identity();
    this.orbit.update();
    if (document.pointerLockElement) document.exitPointerLock();
    this.locked = false;
  }

  goFloor(floor) {
    if (this.mode !== 'walk') return;
    const f = FLOOR_BASE[floor] || 0;
    this.floorY = f;
    this.pos.set(3, f + PLAYER.height, 2);
  }
}
