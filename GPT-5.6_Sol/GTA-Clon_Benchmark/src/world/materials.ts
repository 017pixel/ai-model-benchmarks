import {
  CanvasTexture,
  Color,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  MirroredRepeatWrapping,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from "three";

type SurfaceMaps = {
  albedo: CanvasTexture;
  normal: CanvasTexture;
  roughness: CanvasTexture;
  ao: CanvasTexture;
};

function seededNoise(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D textures are unavailable");
  return [canvas, context];
}

function makeSurface(
  base: [number, number, number],
  variation: number,
  roughnessBase: number,
  seed: number,
  cracks = false,
): SurfaceMaps {
  const size = 512;
  const random = seededNoise(seed);
  const [albedoCanvas, albedoContext] = canvasTexture(size);
  const [normalCanvas, normalContext] = canvasTexture(size);
  const [roughnessCanvas, roughnessContext] = canvasTexture(size);
  const [aoCanvas, aoContext] = canvasTexture(size);
  const albedo = albedoContext.createImageData(size, size);
  const normal = normalContext.createImageData(size, size);
  const roughness = roughnessContext.createImageData(size, size);
  const ao = aoContext.createImageData(size, size);
  const field = new Float32Array(size * size);

  for (let index = 0; index < field.length; index++) {
    const fine = random() - 0.5;
    const broad = Math.sin((index % size) * 0.061) * Math.cos(Math.floor(index / size) * 0.047) * 0.18;
    field[index] = fine * 0.72 + broad;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const pixel = y * size + x;
      const offset = pixel * 4;
      const height = field[pixel];
      const value = height * variation;
      albedo.data[offset] = base[0] + value;
      albedo.data[offset + 1] = base[1] + value;
      albedo.data[offset + 2] = base[2] + value;
      albedo.data[offset + 3] = 255;

      const left = field[y * size + Math.max(0, x - 1)];
      const right = field[y * size + Math.min(size - 1, x + 1)];
      const up = field[Math.max(0, y - 1) * size + x];
      const down = field[Math.min(size - 1, y + 1) * size + x];
      normal.data[offset] = 128 + (left - right) * 55;
      normal.data[offset + 1] = 128 + (up - down) * 55;
      normal.data[offset + 2] = 246;
      normal.data[offset + 3] = 255;

      const rough = Math.max(0, Math.min(255, roughnessBase * 255 + height * 26));
      roughness.data[offset] = rough;
      roughness.data[offset + 1] = rough;
      roughness.data[offset + 2] = rough;
      roughness.data[offset + 3] = 255;

      const occlusion = Math.max(168, Math.min(255, 236 + height * 38));
      ao.data[offset] = occlusion;
      ao.data[offset + 1] = occlusion;
      ao.data[offset + 2] = occlusion;
      ao.data[offset + 3] = 255;
    }
  }

  albedoContext.putImageData(albedo, 0, 0);
  normalContext.putImageData(normal, 0, 0);
  roughnessContext.putImageData(roughness, 0, 0);
  aoContext.putImageData(ao, 0, 0);

  if (cracks) {
    albedoContext.strokeStyle = "rgba(22, 24, 25, 0.45)";
    albedoContext.lineWidth = 1.2;
    normalContext.strokeStyle = "rgb(84, 118, 238)";
    normalContext.lineWidth = 1;
    for (let crack = 0; crack < 24; crack++) {
      let x = random() * size;
      let y = random() * size;
      albedoContext.beginPath();
      normalContext.beginPath();
      albedoContext.moveTo(x, y);
      normalContext.moveTo(x, y);
      for (let segment = 0; segment < 5; segment++) {
        x += (random() - 0.5) * 38;
        y += random() * 18 + 4;
        albedoContext.lineTo(x, y);
        normalContext.lineTo(x, y);
      }
      albedoContext.stroke();
      normalContext.stroke();
    }
  }

  const maps = {
    albedo: new CanvasTexture(albedoCanvas),
    normal: new CanvasTexture(normalCanvas),
    roughness: new CanvasTexture(roughnessCanvas),
    ao: new CanvasTexture(aoCanvas),
  };
  maps.albedo.colorSpace = SRGBColorSpace;
  return maps;
}

function configure(texture: Texture, repeat: number, anisotropy: number): Texture {
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = anisotropy;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

function makeFacadeTexture(seed: number, warm: boolean): CanvasTexture {
  const [canvas, context] = canvasTexture(1024);
  const random = seededNoise(seed);
  context.fillStyle = warm ? "#837668" : "#59676d";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < 1024; y += 32) {
    context.fillStyle = y % 64 === 0 ? "rgba(255,255,255,.025)" : "rgba(0,0,0,.028)";
    context.fillRect(0, y, 1024, 2);
  }
  for (let index = 0; index < 3200; index++) {
    const alpha = 0.012 + random() * 0.025;
    context.fillStyle = random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    const size = 1 + random() * 3;
    context.fillRect(random() * 1024, random() * 1024, size, size);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = MirroredRepeatWrapping;
  texture.repeat.set(2, 3);
  return texture;
}

export class WorldMaterials {
  readonly asphalt: MeshStandardMaterial;
  readonly sidewalk: MeshStandardMaterial;
  readonly concrete: MeshStandardMaterial;
  readonly concreteDark: MeshStandardMaterial;
  readonly glass: MeshPhysicalMaterial;
  readonly glassDark: MeshPhysicalMaterial;
  readonly metal: MeshStandardMaterial;
  readonly roadPaint: MeshStandardMaterial;
  readonly foliage: MeshStandardMaterial;
  readonly foliageLight: MeshStandardMaterial;
  readonly bark: MeshStandardMaterial;
  readonly window: MeshStandardMaterial;
  readonly facadeWarm: MeshStandardMaterial;
  readonly facadeCool: MeshStandardMaterial;
  readonly waterEdge: MeshPhysicalMaterial;

  constructor(maxAnisotropy: number) {
    const asphalt = makeSurface([48, 50, 49], 36, 0.83, 8451, true);
    const sidewalk = makeSurface([139, 134, 123], 28, 0.88, 4901, true);
    const concrete = makeSurface([124, 119, 107], 24, 0.78, 5532);
    const anisotropy = Math.min(12, maxAnisotropy);

    this.asphalt = new MeshStandardMaterial({
      map: configure(asphalt.albedo, 18, anisotropy),
      normalMap: configure(asphalt.normal, 18, anisotropy),
      roughnessMap: configure(asphalt.roughness, 18, anisotropy),
      aoMap: configure(asphalt.ao, 18, anisotropy),
      aoMapIntensity: 0.72,
      roughness: 0.92,
      metalness: 0.02,
    });
    this.sidewalk = new MeshStandardMaterial({
      map: configure(sidewalk.albedo, 8, anisotropy),
      normalMap: configure(sidewalk.normal, 8, anisotropy),
      roughnessMap: configure(sidewalk.roughness, 8, anisotropy),
      aoMap: configure(sidewalk.ao, 8, anisotropy),
      aoMapIntensity: 0.7,
      roughness: 0.95,
    });
    this.concrete = new MeshStandardMaterial({
      map: configure(concrete.albedo, 3, anisotropy),
      normalMap: configure(concrete.normal, 3, anisotropy),
      roughnessMap: configure(concrete.roughness, 3, anisotropy),
      aoMap: configure(concrete.ao, 3, anisotropy),
      aoMapIntensity: 0.62,
      roughness: 0.86,
    });
    this.concreteDark = this.concrete.clone();
    this.concreteDark.color = new Color(0x575a57);
    this.glass = new MeshPhysicalMaterial({
      color: 0x68818a,
      metalness: 0.18,
      roughness: 0.12,
      transmission: 0.08,
      clearcoat: 0.9,
      clearcoatRoughness: 0.16,
      envMapIntensity: 1.55,
    });
    this.glassDark = this.glass.clone();
    this.glassDark.color = new Color(0x1c2b31);
    this.glassDark.roughness = 0.06;
    this.metal = new MeshStandardMaterial({ color: 0x44494a, metalness: 0.88, roughness: 0.27 });
    this.roadPaint = new MeshStandardMaterial({ color: 0xd7cfb8, roughness: 0.62, metalness: 0.04 });
    this.foliage = new MeshStandardMaterial({ color: 0x334d37, roughness: 0.86 });
    this.foliageLight = new MeshStandardMaterial({ color: 0x55704a, roughness: 0.89 });
    this.bark = new MeshStandardMaterial({ color: 0x514035, roughness: 1 });
    this.window = new MeshStandardMaterial({
      color: 0x99b4b9,
      emissive: 0x422b1e,
      emissiveIntensity: 0.38,
      metalness: 0.28,
      roughness: 0.17,
      vertexColors: true,
    });
    this.facadeWarm = new MeshStandardMaterial({ map: makeFacadeTexture(871, true), roughness: 0.82, metalness: 0.03 });
    this.facadeCool = new MeshStandardMaterial({ map: makeFacadeTexture(991, false), roughness: 0.65, metalness: 0.08 });
    this.waterEdge = new MeshPhysicalMaterial({
      color: 0x48656d,
      roughness: 0.08,
      metalness: 0.15,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.8,
    });
  }
}
