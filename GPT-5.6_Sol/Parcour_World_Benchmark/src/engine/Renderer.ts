import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game';

export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(
    GAME_CONFIG.camera.baseFov,
    window.innerWidth / window.innerHeight,
    0.05,
    320,
  );
  readonly renderer: THREE.WebGLRenderer;

  constructor(container: HTMLElement) {
    this.scene.background = this.createSkybox();
    this.scene.fog = new THREE.Fog('#8aa0a0', GAME_CONFIG.world.fogNear, GAME_CONFIG.world.fogFar);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, GAME_CONFIG.renderer.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.prepend(this.renderer.domElement);

    const hemisphere = new THREE.HemisphereLight('#c2d2cb', '#3a3730', 2.15);
    this.scene.add(hemisphere);

    const sun = new THREE.DirectionalLight('#fff1d2', 3.4);
    sun.position.set(-72, 105, 46);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(GAME_CONFIG.renderer.shadowMapSize);
    sun.shadow.camera.left = -90;
    sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90;
    sun.shadow.camera.bottom = -90;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 230;
    sun.shadow.bias = -0.00025;
    sun.shadow.normalBias = 0.035;
    this.scene.add(sun);

    window.addEventListener('resize', this.resize);
  }

  private createSkybox(): THREE.CubeTexture {
    const colors = ['#839898', '#839898', '#aab7b1', '#5d625d', '#8b9f9f', '#8b9f9f'];
    const faces = colors.map((color) => {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas 2D context unavailable');
      context.fillStyle = color;
      context.fillRect(0, 0, 16, 16);
      return canvas;
    });
    const skybox = new THREE.CubeTexture(faces);
    skybox.colorSpace = THREE.SRGBColorSpace;
    skybox.needsUpdate = true;
    return skybox;
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private readonly resize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, GAME_CONFIG.renderer.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
  }
}
