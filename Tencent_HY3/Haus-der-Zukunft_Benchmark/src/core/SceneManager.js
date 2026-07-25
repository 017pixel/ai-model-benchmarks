import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export class SceneManager {
  constructor(canvas, state) {
    this.state = state;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fc0e8);
    this.scene.fog = new THREE.Fog(0x9fc0e8, 60, 160);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
    this.camera.position.set(20, 14, 24);
    this.camera.lookAt(0, 2, 0);

    this.sky = this.buildSky();
    this.scene.add(this.sky);

    window.addEventListener('resize', () => this.onResize());
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(300, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color(0x4a78c4) },
        bottom: { value: new THREE.Color(0xdfe9f2) },
        offset: { value: 30 },
        exponent: { value: 0.7 }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 bottom; uniform float offset; uniform float exponent;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos + vec3(0.0, offset, 0.0)).y;
          float t = pow(max(h, 0.0), exponent);
          gl_FragColor = vec4(mix(bottom, top, t), 1.0);
        }`
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.mat = mat;
    return mesh;
  }

  setSky(top, bottom) {
    this.sky.userData.mat.uniforms.top.value.set(top);
    this.sky.userData.mat.uniforms.bottom.value.set(bottom);
    this.scene.fog.color.set(bottom);
    this.scene.background.set(bottom);
  }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
