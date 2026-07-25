import * as THREE from 'three';

const SKY_PRESETS = [
  { t: 0.0, top: 0x070a14, bottom: 0x11151f, sun: 0.0, sunColor: 0x3344aa, amb: 0.06, hemi: 0.08 },
  { t: 0.22, top: 0x4a5e8c, bottom: 0xe9a06a, sun: 0.6, sunColor: 0xffb066, amb: 0.18, hemi: 0.3 },
  { t: 0.35, top: 0x3f74c4, bottom: 0xcfe2f2, sun: 3.0, sunColor: 0xfff4e0, amb: 0.4, hemi: 0.7 },
  { t: 0.5, top: 0x2f66bf, bottom: 0xdfeefc, sun: 3.4, sunColor: 0xffffff, amb: 0.45, hemi: 0.8 },
  { t: 0.68, top: 0x3a5fa0, bottom: 0xd9b27e, sun: 1.4, sunColor: 0xffd28a, amb: 0.28, hemi: 0.5 },
  { t: 0.78, top: 0x202a44, bottom: 0xc8743c, sun: 0.4, sunColor: 0xff8a4a, amb: 0.14, hemi: 0.25 },
  { t: 0.9, top: 0x0a0e1a, bottom: 0x161a26, sun: 0.0, sunColor: 0x3344aa, amb: 0.07, hemi: 0.1 },
  { t: 1.0, top: 0x070a14, bottom: 0x11151f, sun: 0.0, sunColor: 0x3344aa, amb: 0.06, hemi: 0.08 }
];

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpHex(c1, c2, t) {
  const a = new THREE.Color(c1), b = new THREE.Color(c2);
  return a.lerp(b, t);
}
function sample(arr, t) {
  for (let i = 0; i < arr.length - 1; i++) {
    if (t >= arr[i].t && t <= arr[i + 1].t) {
      const f = (t - arr[i].t) / (arr[i + 1].t - arr[i].t);
      return {
        top: lerpHex(arr[i].top, arr[i + 1].top, f),
        bottom: lerpHex(arr[i].bottom, arr[i + 1].bottom, f),
        sun: lerp(arr[i].sun, arr[i + 1].sun, f),
        sunColor: lerpHex(arr[i].sunColor, arr[i + 1].sunColor, f),
        amb: lerp(arr[i].amb, arr[i + 1].amb, f),
        hemi: lerp(arr[i].hemi, arr[i + 1].hemi, f)
      };
    }
  }
  return arr[arr.length - 1];
}

export class Lighting {
  constructor(scene, sceneManager) {
    this.scene = scene;
    this.sm = sceneManager;

    this.sun = new THREE.DirectionalLight(0xffffff, 3.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 120;
    const s = 24;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbfd4ea, 0x6b6155, 0.7);
    this.scene.add(this.hemi);

    this.amb = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.amb);

    this.interiorLights = [];
    this.sample = null;
  }

  registerInterior(group) {
    this.interiorLights.push(group);
  }

  update(time, lightsOn, activeFloorVisible) {
    const s = sample(SKY_PRESETS, time);
    this.sample = s;
    const clock = time * 24;
    const elev = Math.sin(((clock - 6) / 12) * Math.PI);
    const az = ((clock - 6) / 12) * Math.PI;
    const r = 50;
    const ex = Math.max(elev, -0.2);
    this.sun.position.set(Math.cos(az) * r, ex * r + 8, Math.sin(az) * r * 0.6 + 10);
    this.sun.target.position.set(0, 0, 0);
    this.sun.intensity = s.sun;
    this.sun.color.copy(s.sunColor);
    this.hemi.intensity = s.hemi;
    this.amb.intensity = s.amb;
    this.sm.setSky(s.top.getHex(), s.bottom.getHex());

    const nightish = time < 0.25 || time > 0.78;
    const interiorOn = lightsOn || nightish;
    const interiorIntensity = interiorOn ? 1.0 : 0.0;
    for (const g of this.interiorLights) {
      const isBulb = g.userData.bulb;
      const light = g.userData.light;
      const target = interiorOn ? (g.userData.baseIntensity || 1) : 0;
      if (light) light.intensity = target * (light.userData.max || 1);
      if (g.userData.bulb) g.userData.bulb.material.emissiveIntensity = interiorOn ? 1.6 : 0.04;
      g.userData._on = interiorOn;
    }
    return { interiorOn, nightish };
  }
}
