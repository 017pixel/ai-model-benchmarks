import "./style.css";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  CanvasTexture,
  Clock,
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  PointLight,
  PMREMGenerator,
  Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { SSRPass } from "three/addons/postprocessing/SSRPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { Sky } from "three/addons/objects/Sky.js";
import { RENDERING, type QualityLevel, WORLD } from "./config";
import { Input } from "./input";
import { PlayerCar } from "./vehicle/PlayerCar";
import { City } from "./world/City";
import { WorldMaterials } from "./world/materials";

type NavigatorCapabilities = Navigator & { deviceMemory?: number; gpu?: unknown };

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required interface element is missing: ${selector}`);
  return element;
}

const canvas = requiredElement<HTMLCanvasElement>("#world");
const loader = requiredElement<HTMLElement>("#loader");
const progress = requiredElement<HTMLElement>("#load-progress");
const loadStatus = requiredElement<HTMLElement>("#load-status");
const speedLabel = requiredElement<HTMLElement>("#speed");
const gearLabel = requiredElement<HTMLElement>("#gear");
const clockLabel = requiredElement<HTMLElement>("#clock");
const districtLabel = requiredElement<HTMLElement>("#district");
const qualityLabel = requiredElement<HTMLElement>("#quality-label");
const minimap = document.querySelector<HTMLElement>(".minimap__grid");

function loading(percent: number, status: string): Promise<void> {
  progress.style.width = `${percent}%`;
  loadStatus.textContent = status;
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function chooseQuality(): QualityLevel {
  const override = new URLSearchParams(location.search).get("quality")?.toUpperCase();
  if (override === "ULTRA" || override === "HIGH" || override === "BALANCED") return override;
  const capabilities = navigator as NavigatorCapabilities;
  const mobile = matchMedia("(pointer: coarse)").matches || innerWidth < 760;
  if (mobile || (capabilities.deviceMemory ?? 8) <= 4) return "BALANCED";
  if ((capabilities.deviceMemory ?? 8) >= 8 && devicePixelRatio <= 2.5) return "ULTRA";
  return "HIGH";
}

function makeCloudTexture(): CanvasTexture {
  const cloudCanvas = document.createElement("canvas");
  cloudCanvas.width = 512;
  cloudCanvas.height = 192;
  const context = cloudCanvas.getContext("2d");
  if (!context) throw new Error("Cloud texture generation failed");
  context.fillStyle = "rgba(255, 241, 218, 0.14)";
  const circles = [
    [96, 116, 59], [149, 91, 75], [218, 110, 88], [285, 82, 71], [354, 112, 82], [420, 121, 52],
  ];
  circles.forEach(([x, y, radius]) => context.arc(x, y, radius, 0, Math.PI * 2));
  context.fill();
  const texture = new CanvasTexture(cloudCanvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function addAtmosphere(scene: Scene, sunDirection: Vector3): Sprite[] {
  const sky = new Sky();
  sky.scale.setScalar(10000);
  sky.material.uniforms.turbidity.value = 7.2;
  sky.material.uniforms.rayleigh.value = 1.8;
  sky.material.uniforms.mieCoefficient.value = 0.0065;
  sky.material.uniforms.mieDirectionalG.value = 0.86;
  sky.material.uniforms.sunPosition.value.copy(sunDirection);
  scene.add(sky);

  const cloudTexture = makeCloudTexture();
  const clouds: Sprite[] = [];
  for (let index = 0; index < 16; index++) {
    const material = new SpriteMaterial({
      map: cloudTexture,
      color: index % 3 === 0 ? 0xd6c4ae : 0xf0e2d0,
      transparent: true,
      opacity: 0.16 + (index % 4) * 0.025,
      depthWrite: false,
      fog: true,
    });
    const cloud = new Sprite(material);
    const angle = (index / 16) * Math.PI * 2;
    const radius = 290 + (index % 5) * 39;
    cloud.position.set(Math.cos(angle) * radius, 82 + (index % 4) * 17, Math.sin(angle) * radius);
    cloud.scale.set(115 + (index % 3) * 38, 38 + (index % 2) * 11, 1);
    scene.add(cloud);
    clouds.push(cloud);
  }
  return clouds;
}

function setupEnvironment(scene: Scene, renderer: WebGLRenderer, sunDirection: Vector3): void {
  const environmentScene = new Scene();
  const environmentSky = new Sky();
  environmentSky.scale.setScalar(10000);
  environmentSky.material.uniforms.turbidity.value = 7.2;
  environmentSky.material.uniforms.rayleigh.value = 1.8;
  environmentSky.material.uniforms.mieCoefficient.value = 0.0065;
  environmentSky.material.uniforms.mieDirectionalG.value = 0.86;
  environmentSky.material.uniforms.sunPosition.value.copy(sunDirection);
  environmentScene.add(environmentSky);
  const pmrem = new PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  const environment = pmrem.fromScene(environmentScene, 0.03);
  scene.environment = environment.texture;
  pmrem.dispose();
}

async function bootstrap(): Promise<void> {
  await loading(10, "Rendering-Pipeline wird initialisiert");
  let quality = chooseQuality();
  const postDisabled = new URLSearchParams(location.search).get("post") === "off";
  const renderer = new WebGLRenderer({ canvas, antialias: quality !== "ULTRA", powerPreference: "high-performance", alpha: false });
  const pixelRatio = quality === "ULTRA" ? Math.min(devicePixelRatio, RENDERING.maxPixelRatio) : quality === "HIGH" ? Math.min(devicePixelRatio, 1.4) : Math.min(devicePixelRatio, 1.05);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = RENDERING.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = 2;

  const scene = new Scene();
  scene.background = new Color(0x9da6a8);
  scene.fog = new FogExp2(0xa8a6a0, RENDERING.fogDensity);
  const camera = new PerspectiveCamera(55, innerWidth / innerHeight, 0.08, 850);
  camera.position.set(-23, 5, 121);

  const sunDirection = new Vector3().setFromSphericalCoords(1, MathUtils.degToRad(76), MathUtils.degToRad(236));
  const clouds = addAtmosphere(scene, sunDirection);
  setupEnvironment(scene, renderer, sunDirection);
  scene.add(new HemisphereLight(0xc9d7de, 0x5b4437, 1.7));
  scene.add(new AmbientLight(0x9b887a, 0.28));
  const sun = new DirectionalLight(0xffd0a1, 4);
  sun.position.copy(sunDirection).multiplyScalar(235);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality === "BALANCED" ? 2048 : RENDERING.shadowMapSize, quality === "BALANCED" ? 2048 : RENDERING.shadowMapSize);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 510;
  sun.shadow.camera.left = -105;
  sun.shadow.camera.right = 105;
  sun.shadow.camera.top = 105;
  sun.shadow.camera.bottom = -105;
  sun.shadow.bias = -0.00012;
  sun.shadow.normalBias = 0.045;
  scene.add(sun);

  await loading(30, "PBR-Oberflächen werden synthetisiert");
  const materials = new WorldMaterials(renderer.capabilities.getMaxAnisotropy());
  await loading(46, "Metropole wird prozedural aufgebaut");
  const city = new City(scene, materials);
  const player = new PlayerCar(scene);
  const input = new Input();

  const headlight = new PointLight(0xd9edff, 26, 19, 2);
  headlight.position.set(0, 0.86, -2.55);
  player.model.root.add(headlight);

  await loading(78, "Screen-Space-Beleuchtung wird kompiliert");
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(pixelRatio);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.updateGtaoMaterial({
    radius: quality === "BALANCED" ? 1.25 : 2.15,
    distanceExponent: 1.3,
    thickness: 1.15,
    distanceFallOff: 0.9,
    scale: 1.05,
    samples: quality === "ULTRA" ? 16 : 8,
  });
  gtao.updatePdMaterial({ radius: 4, rings: quality === "ULTRA" ? 3 : 2, samples: quality === "ULTRA" ? 16 : 8 });
  gtao.enabled = !postDisabled;
  composer.addPass(gtao);

  const reflectiveMeshes: Mesh[] = [];
  player.model.root.traverse((object) => { if (object instanceof Mesh) reflectiveMeshes.push(object); });
  reflectiveMeshes.push(...city.reflectiveMeshes);
  const ssr = new SSRPass({
    renderer,
    scene,
    camera,
    width: innerWidth,
    height: innerHeight,
    selects: reflectiveMeshes,
    groundReflector: null,
  });
  ssr.opacity = 0.52;
  ssr.maxDistance = 42;
  ssr.thickness = 0.028;
  ssr.blur = true;
  ssr.resolutionScale = quality === "ULTRA" ? 0.62 : 0.45;
  ssr.enabled = !postDisabled && quality !== "BALANCED";
  composer.addPass(ssr);

  const bloom = new UnrealBloomPass(new Vector2(innerWidth, innerHeight), 0.14, 0.42, 1.08);
  bloom.enabled = !postDisabled;
  composer.addPass(bloom);
  if (quality === "ULTRA") composer.addPass(new SMAAPass());
  composer.addPass(new OutputPass());

  const setQualityLabel = () => {
    qualityLabel.textContent = postDisabled ? `${quality} · DIRECT · WEBGL2` : `${quality} · GTAO${ssr.enabled ? " · SSR" : ""} · WEBGL2`;
  };
  setQualityLabel();

  await loading(100, "Pacifica ist bereit");
  loader.classList.add("is-hidden");
  window.setTimeout(() => document.querySelector("#hint")?.classList.add("is-hidden"), 8500);

  const clock = new Clock();
  let elapsed = 0;
  let frameCounter = 0;
  let frameTime = 0;

  const updateHud = () => {
    const kilometersPerHour = Math.round(Math.abs(player.speed) * 3.6);
    speedLabel.textContent = kilometersPerHour.toString().padStart(3, "0");
    const gear = player.speed < -0.5 ? "R" : player.speed < 0.5 ? "N" : `D${Math.min(6, Math.max(1, Math.ceil(kilometersPerHour / 32)))}`;
    gearLabel.textContent = gear;
    const minute = 42 + Math.floor(elapsed / 12);
    clockLabel.textContent = `${18 + Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")}`;
    districtLabel.textContent = player.position.z < WORLD.coastZ + 30 ? "PORT PACIFICA" : Math.abs(player.position.x) < 48 && Math.abs(player.position.z) < 70 ? "CIVIC CENTER" : player.position.x > 65 && player.position.z > 50 ? "JUNIPER PARK" : "MARINA DISTRICT";
    if (minimap) minimap.style.transform = `rotate(${player.heading}rad)`;
  };

  const animate = () => {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    elapsed += delta;
    player.update(delta, input, (position) => city.collides(position));
    player.updateCamera(camera, delta);
    sun.target.position.copy(player.position);
    sun.position.copy(player.position).addScaledVector(sunDirection, 235);
    city.update(delta, elapsed);
    clouds.forEach((cloud, index) => {
      cloud.position.x += delta * (0.55 + index * 0.012);
      if (cloud.position.x > 460) cloud.position.x = -460;
    });
    composer.render(delta);
    updateHud();

    frameCounter++;
    frameTime += delta;
    if (frameCounter >= 150) {
      const fps = frameCounter / frameTime;
      if (fps < RENDERING.targetFps && quality !== "BALANCED") {
        quality = quality === "ULTRA" ? "HIGH" : "BALANCED";
        ssr.enabled = !postDisabled && quality !== "BALANCED";
        renderer.setPixelRatio(quality === "HIGH" ? Math.min(devicePixelRatio, 1.35) : 1);
        composer.setPixelRatio(quality === "HIGH" ? Math.min(devicePixelRatio, 1.35) : 1);
        setQualityLabel();
      }
      frameCounter = 0;
      frameTime = 0;
    }
  };

  const resize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  };
  window.addEventListener("resize", resize, { passive: true });
  animate();
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  loadStatus.textContent = error instanceof Error ? `Rendering-Fehler: ${error.message}` : "Rendering konnte nicht gestartet werden";
  progress.style.width = "100%";
});
