import {
  BoxGeometry,
  BufferAttribute,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  Vector3,
} from "three";
import { WORLD } from "../config";
import { createCarModel, TRAFFIC_COLORS } from "../vehicle/carModel";
import { WorldMaterials } from "./materials";

type Collider = { minX: number; maxX: number; minZ: number; maxZ: number };
type TrafficCar = { root: Group; axis: "x" | "z"; direction: number; speed: number; lane: number };

function createRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = Math.imul(value ^ (value >>> 15), 1 | value);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shadow(mesh: Mesh): Mesh {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class City {
  readonly root = new Group();
  readonly reflectiveMeshes: Mesh[] = [];
  private readonly random = createRandom(WORLD.seed);
  private readonly colliders: Collider[] = [];
  private readonly windowMatrices: Matrix4[] = [];
  private readonly windowColors: Color[] = [];
  private readonly traffic: TrafficCar[] = [];
  private readonly waterGeometry = new PlaneGeometry(740, 390, 72, 38);
  private readonly waterBase: Float32Array;
  private waterUpdateAccumulator = 0;

  constructor(scene: Scene, private readonly materials: WorldMaterials) {
    scene.add(this.root);
    this.buildGround();
    this.buildStreetGrid();
    this.buildDistricts();
    this.buildWindows();
    this.buildStreetFurniture();
    this.buildVegetation();
    this.buildCoast();
    this.buildBridge();
    this.buildTraffic();
    this.waterBase = new Float32Array((this.waterGeometry.attributes.position as BufferAttribute).array);
  }

  collides(position: Vector3): boolean {
    const radius = 1.08;
    return this.colliders.some((box) =>
      position.x + radius > box.minX &&
      position.x - radius < box.maxX &&
      position.z + radius > box.minZ &&
      position.z - radius < box.maxZ,
    );
  }

  update(delta: number, elapsed: number): void {
    const trafficLimit = WORLD.worldLimit + 12;
    for (const car of this.traffic) {
      if (car.axis === "x") {
        car.root.position.x += car.speed * car.direction * delta;
        car.root.position.z = car.lane;
        if (car.root.position.x > trafficLimit) car.root.position.x = -trafficLimit;
        if (car.root.position.x < -trafficLimit) car.root.position.x = trafficLimit;
      } else {
        car.root.position.z += car.speed * car.direction * delta;
        car.root.position.x = car.lane;
        if (car.root.position.z > trafficLimit) car.root.position.z = -trafficLimit;
        if (car.root.position.z < -trafficLimit) car.root.position.z = trafficLimit;
      }
    }

    this.waterUpdateAccumulator += delta;
    if (this.waterUpdateAccumulator < 1 / 24) return;
    this.waterUpdateAccumulator = 0;
    const positions = this.waterGeometry.attributes.position as BufferAttribute;
    for (let index = 0; index < positions.count; index++) {
      const x = this.waterBase[index * 3];
      const y = this.waterBase[index * 3 + 1];
      const wave = Math.sin(x * 0.041 + elapsed * 0.85) * 0.17 + Math.sin(y * 0.073 - elapsed * 1.17) * 0.11;
      positions.setZ(index, wave);
    }
    positions.needsUpdate = true;
    this.waterGeometry.computeVertexNormals();
  }

  private buildGround(): void {
    const ground = shadow(new Mesh(new PlaneGeometry(1200, 1200), this.materials.concreteDark));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.18;
    this.root.add(ground);
  }

  private buildStreetGrid(): void {
    const extent = WORLD.blockSize * WORLD.blocksPerAxis;
    const half = extent / 2;
    const roadCenters = Array.from({ length: WORLD.blocksPerAxis + 1 }, (_, index) => -half + index * WORLD.blockSize);
    for (const center of roadCenters) {
      const vertical = shadow(new Mesh(new BoxGeometry(WORLD.roadWidth, 0.18, extent + WORLD.roadWidth), this.materials.asphalt));
      vertical.position.set(center, -0.03, 0);
      this.root.add(vertical);
      this.reflectiveMeshes.push(vertical);
      const horizontal = shadow(new Mesh(new BoxGeometry(extent + WORLD.roadWidth, 0.18, WORLD.roadWidth), this.materials.asphalt));
      horizontal.position.set(0, -0.02, center);
      this.root.add(horizontal);
      this.reflectiveMeshes.push(horizontal);
    }

    const dashMatrices: Matrix4[] = [];
    const dash = new Object3D();
    for (const center of roadCenters) {
      for (let along = -half + 9; along < half; along += 10) {
        dash.position.set(center, 0.075, along);
        dash.scale.set(0.13, 0.025, 2.8);
        dash.rotation.set(0, 0, 0);
        dash.updateMatrix();
        dashMatrices.push(dash.matrix.clone());
        dash.position.set(along, 0.08, center);
        dash.scale.set(2.8, 0.025, 0.13);
        dash.updateMatrix();
        dashMatrices.push(dash.matrix.clone());
      }
    }
    const markings = new InstancedMesh(new BoxGeometry(1, 1, 1), this.materials.roadPaint, dashMatrices.length);
    dashMatrices.forEach((matrix, index) => markings.setMatrixAt(index, matrix));
    markings.receiveShadow = true;
    this.root.add(markings);

    const crosswalkMatrices: Matrix4[] = [];
    for (let xIndex = 1; xIndex < roadCenters.length - 1; xIndex++) {
      for (let zIndex = 1; zIndex < roadCenters.length - 1; zIndex++) {
        const x = roadCenters[xIndex];
        const z = roadCenters[zIndex];
        for (let stripe = -4; stripe <= 4; stripe += 2) {
          dash.position.set(x + stripe, 0.088, z - WORLD.roadWidth * 0.36);
          dash.scale.set(0.72, 0.025, 2.5);
          dash.updateMatrix();
          crosswalkMatrices.push(dash.matrix.clone());
          dash.position.set(x - WORLD.roadWidth * 0.36, 0.089, z + stripe);
          dash.scale.set(2.5, 0.025, 0.72);
          dash.updateMatrix();
          crosswalkMatrices.push(dash.matrix.clone());
        }
      }
    }
    const crosswalks = new InstancedMesh(new BoxGeometry(1, 1, 1), this.materials.roadPaint, crosswalkMatrices.length);
    crosswalkMatrices.forEach((matrix, index) => crosswalks.setMatrixAt(index, matrix));
    this.root.add(crosswalks);
  }

  private buildDistricts(): void {
    const half = (WORLD.blockSize * WORLD.blocksPerAxis) / 2;
    const lotSize = WORLD.blockSize - WORLD.roadWidth;
    for (let xIndex = 0; xIndex < WORLD.blocksPerAxis; xIndex++) {
      for (let zIndex = 0; zIndex < WORLD.blocksPerAxis; zIndex++) {
        const x = -half + WORLD.blockSize * (xIndex + 0.5);
        const z = -half + WORLD.blockSize * (zIndex + 0.5);
        const sidewalk = shadow(new Mesh(new BoxGeometry(lotSize, 0.34, lotSize), this.materials.sidewalk));
        sidewalk.position.set(x, 0.1, z);
        this.root.add(sidewalk);

        if (xIndex === 5 && zIndex === 5) {
          this.buildPark(x, z, lotSize);
        } else if (xIndex === 1 && zIndex === 4) {
          this.buildCourtyard(x, z, lotSize);
        } else {
          const skylineBias = 1 - Math.min(1, Math.hypot(x, z + 18) / 225);
          const height = 16 + this.random() * 32 + skylineBias * skylineBias * 55;
          const margin = 2.2 + this.random() * 2.6;
          this.buildBuilding(x, z, lotSize - margin * 2, lotSize - margin * 2, height, this.random());
        }
      }
    }
  }

  private buildBuilding(x: number, z: number, width: number, depth: number, height: number, style: number): void {
    const group = new Group();
    group.position.set(x, 0, z);
    const facade = style > 0.48 ? this.materials.facadeWarm : this.materials.facadeCool;
    const podiumHeight = Math.min(5.2, height * 0.18);
    const podium = shadow(new Mesh(new BoxGeometry(width + 1.1, podiumHeight, depth + 1.1), this.materials.concreteDark));
    podium.position.y = 0.27 + podiumHeight / 2;
    group.add(podium);

    const bodyHeight = height - podiumHeight;
    const body = shadow(new Mesh(new BoxGeometry(width, bodyHeight, depth), facade));
    body.position.y = podiumHeight + bodyHeight / 2;
    group.add(body);

    if (style > 0.66 && height > 35) {
      const upperHeight = bodyHeight * 0.32;
      body.scale.set(1, 1 - upperHeight / bodyHeight, 1);
      body.position.y -= upperHeight / 2;
      const upper = shadow(new Mesh(new BoxGeometry(width * 0.82, upperHeight, depth * 0.84), facade));
      upper.position.set((style - 0.83) * 3, height - upperHeight / 2, 0);
      group.add(upper);
    }

    const ledgeMaterial = style > 0.5 ? this.materials.concrete : this.materials.metal;
    for (const level of [podiumHeight, height * 0.58, height - 0.5]) {
      const ledge = shadow(new Mesh(new BoxGeometry(width + 0.65, 0.22, depth + 0.65), ledgeMaterial));
      ledge.position.y = level;
      group.add(ledge);
    }

    const roof = shadow(new Mesh(new BoxGeometry(width * 0.92, 0.55, depth * 0.92), this.materials.concreteDark));
    roof.position.y = height + 0.27;
    group.add(roof);
    const plantCount = height > 50 ? 3 : 2;
    for (let plant = 0; plant < plantCount; plant++) {
      const plantWidth = 1.4 + this.random() * 1.8;
      const equipment = shadow(new Mesh(new BoxGeometry(plantWidth, 1 + this.random(), 1.3 + this.random()), this.materials.metal));
      equipment.position.set((this.random() - 0.5) * width * 0.55, height + 0.9, (this.random() - 0.5) * depth * 0.5);
      group.add(equipment);
    }

    if (height > 62 && style > 0.58) {
      const antenna = shadow(new Mesh(new CylinderGeometry(0.08, 0.15, 8 + this.random() * 7, 8), this.materials.metal));
      antenna.position.y = height + 5;
      group.add(antenna);
    }

    if (style < 0.28) {
      const finGeometry = new BoxGeometry(0.18, Math.min(18, height * 0.55), 0.48);
      for (let side = -1; side <= 1; side += 2) {
        for (let offset = -width * 0.32; offset <= width * 0.32; offset += 3.2) {
          const fin = shadow(new Mesh(finGeometry, this.materials.metal));
          fin.position.set(offset, height * 0.53, side * (depth / 2 + 0.25));
          group.add(fin);
        }
      }
    }

    this.root.add(group);
    this.colliders.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 });
    this.addBuildingWindows(x, z, width, depth, height, podiumHeight);
  }

  private addBuildingWindows(x: number, z: number, width: number, depth: number, height: number, podiumHeight: number): void {
    const floors = Math.max(3, Math.floor((height - podiumHeight - 1) / 3.15));
    const acrossX = Math.max(2, Math.floor((width - 2) / 2.65));
    const acrossZ = Math.max(2, Math.floor((depth - 2) / 2.65));
    const object = new Object3D();
    const addWindow = (px: number, py: number, pz: number, rotationY: number) => {
      object.position.set(px, py, pz);
      object.rotation.set(0, rotationY, 0);
      object.updateMatrix();
      this.windowMatrices.push(object.matrix.clone());
      const lit = this.random() > 0.79;
      this.windowColors.push(new Color(lit ? (this.random() > 0.25 ? 0xffb66f : 0xcddfe2) : 0x39525a));
    };
    for (let floor = 0; floor < floors; floor++) {
      const y = podiumHeight + 1.55 + floor * 3.15;
      for (let column = 0; column < acrossX; column++) {
        const px = x - ((acrossX - 1) * 2.65) / 2 + column * 2.65;
        addWindow(px, y, z - depth / 2 - 0.035, 0);
        addWindow(px, y, z + depth / 2 + 0.035, Math.PI);
      }
      for (let column = 0; column < acrossZ; column++) {
        const pz = z - ((acrossZ - 1) * 2.65) / 2 + column * 2.65;
        addWindow(x - width / 2 - 0.035, y, pz, Math.PI / 2);
        addWindow(x + width / 2 + 0.035, y, pz, -Math.PI / 2);
      }
    }
  }

  private buildWindows(): void {
    const windows = new InstancedMesh(new BoxGeometry(1.54, 1.95, 0.095), this.materials.window, this.windowMatrices.length);
    this.windowMatrices.forEach((matrix, index) => {
      windows.setMatrixAt(index, matrix);
      windows.setColorAt(index, this.windowColors[index]);
    });
    windows.castShadow = false;
    windows.receiveShadow = true;
    windows.instanceMatrix.needsUpdate = true;
    if (windows.instanceColor) windows.instanceColor.needsUpdate = true;
    this.root.add(windows);
  }

  private buildCourtyard(x: number, z: number, lotSize: number): void {
    const wingWidth = lotSize * 0.34;
    const wingDepth = lotSize * 0.76;
    this.buildBuilding(x - lotSize * 0.28, z, wingWidth, wingDepth, 27, 0.74);
    this.buildBuilding(x + lotSize * 0.28, z, wingWidth, wingDepth, 32, 0.42);
    const courtyard = shadow(new Mesh(new BoxGeometry(lotSize * 0.34, 0.12, lotSize * 0.54), this.materials.concrete));
    courtyard.position.set(x, 0.34, z);
    this.root.add(courtyard);
  }

  private buildPark(x: number, z: number, lotSize: number): void {
    const lawnMaterial = new MeshStandardMaterial({ color: 0x445c3d, roughness: 1 });
    const lawn = shadow(new Mesh(new BoxGeometry(lotSize - 2.5, 0.22, lotSize - 2.5), lawnMaterial));
    lawn.position.set(x, 0.31, z);
    this.root.add(lawn);
    const basin = shadow(new Mesh(new CylinderGeometry(4.2, 4.6, 0.7, 48), this.materials.concrete));
    basin.position.set(x, 0.7, z);
    this.root.add(basin);
    const water = new Mesh(new CylinderGeometry(3.7, 3.7, 0.12, 48), this.materials.waterEdge);
    water.position.set(x, 1.1, z);
    this.root.add(water);
    const sculpture = shadow(new Mesh(new CylinderGeometry(0.4, 1.15, 5.8, 5), this.materials.metal));
    sculpture.position.set(x, 3.7, z);
    sculpture.rotation.z = 0.16;
    this.root.add(sculpture);
  }

  private buildStreetFurniture(): void {
    const half = (WORLD.blockSize * WORLD.blocksPerAxis) / 2;
    const postMatrices: Matrix4[] = [];
    const lampMatrices: Matrix4[] = [];
    const object = new Object3D();
    for (let index = 0; index < WORLD.blocksPerAxis + 1; index++) {
      const road = -half + index * WORLD.blockSize;
      for (let along = -half + 18; along < half; along += 28) {
        for (const side of [-1, 1]) {
          object.position.set(road + side * (WORLD.roadWidth / 2 + 0.8), 2.85, along);
          object.scale.set(0.09, 2.85, 0.09);
          object.updateMatrix();
          postMatrices.push(object.matrix.clone());
          object.position.y = 5.7;
          object.scale.set(0.25, 0.25, 0.25);
          object.updateMatrix();
          lampMatrices.push(object.matrix.clone());
        }
      }
    }
    const posts = new InstancedMesh(new CylinderGeometry(1, 1, 2, 10), this.materials.metal, postMatrices.length);
    postMatrices.forEach((matrix, index) => posts.setMatrixAt(index, matrix));
    posts.castShadow = true;
    this.root.add(posts);
    const lampMaterial = new MeshStandardMaterial({ color: 0xffd09b, emissive: 0xff9d47, emissiveIntensity: 2.6, roughness: 0.24 });
    const lamps = new InstancedMesh(new SphereGeometry(1, 12, 8), lampMaterial, lampMatrices.length);
    lampMatrices.forEach((matrix, index) => lamps.setMatrixAt(index, matrix));
    this.root.add(lamps);

    const signalMaterial = new MeshStandardMaterial({ color: 0x252b2b, metalness: 0.6, roughness: 0.35 });
    const red = new MeshStandardMaterial({ color: 0x6a1712, emissive: 0xff3c2b, emissiveIntensity: 1.8 });
    for (let xIndex = 1; xIndex < WORLD.blocksPerAxis; xIndex += 2) {
      for (let zIndex = 1; zIndex < WORLD.blocksPerAxis; zIndex += 2) {
        const x = -half + xIndex * WORLD.blockSize + 5;
        const z = -half + zIndex * WORLD.blockSize + 5;
        const housing = shadow(new Mesh(new BoxGeometry(0.48, 1.25, 0.42), signalMaterial));
        housing.position.set(x, 3.15, z);
        this.root.add(housing);
        const light = new Mesh(new SphereGeometry(0.13, 12, 8), red);
        light.position.set(x, 3.48, z - 0.22);
        this.root.add(light);
      }
    }
  }

  private buildVegetation(): void {
    const trunkMatrices: Matrix4[] = [];
    const crownMatrices: Matrix4[] = [];
    const crownColors: Color[] = [];
    const object = new Object3D();
    const half = (WORLD.blockSize * WORLD.blocksPerAxis) / 2;
    for (let index = 0; index < WORLD.treeCount; index++) {
      const vertical = this.random() > 0.5;
      const roadIndex = Math.floor(this.random() * WORLD.blocksPerAxis);
      const blockCenter = -half + WORLD.blockSize * (roadIndex + 0.5);
      const side = this.random() > 0.5 ? 1 : -1;
      let x = vertical ? blockCenter + side * (WORLD.blockSize - WORLD.roadWidth) * 0.42 : -half + this.random() * half * 2;
      let z = vertical ? -half + this.random() * half * 2 : blockCenter + side * (WORLD.blockSize - WORLD.roadWidth) * 0.42;
      if (Math.abs(x - 92) < 19 && Math.abs(z - 92) < 19) {
        x = 92 + (this.random() - 0.5) * 24;
        z = 92 + (this.random() - 0.5) * 24;
      }
      const height = 3.4 + this.random() * 2.3;
      object.position.set(x, height / 2 + 0.28, z);
      object.scale.set(0.18 + this.random() * 0.08, height / 2, 0.18 + this.random() * 0.08);
      object.rotation.set(0, this.random() * Math.PI, 0);
      object.updateMatrix();
      trunkMatrices.push(object.matrix.clone());
      for (let layer = 0; layer < 3; layer++) {
        object.position.set(x + (this.random() - 0.5) * 0.6, height + layer * 0.72, z + (this.random() - 0.5) * 0.6);
        const scale = 1.55 - layer * 0.24 + this.random() * 0.25;
        object.scale.set(scale, scale * 0.82, scale);
        object.rotation.set(this.random(), this.random() * Math.PI, this.random() * 0.25);
        object.updateMatrix();
        crownMatrices.push(object.matrix.clone());
        crownColors.push(new Color(layer % 2 === 0 ? 0x3f6041 : 0x60754a).multiplyScalar(0.82 + this.random() * 0.25));
      }
    }
    const trunks = new InstancedMesh(new CylinderGeometry(1, 1.3, 2, 9), this.materials.bark, trunkMatrices.length);
    trunkMatrices.forEach((matrix, index) => trunks.setMatrixAt(index, matrix));
    trunks.castShadow = true;
    this.root.add(trunks);
    const crowns = new InstancedMesh(new IcosahedronGeometry(1, 2), this.materials.foliage, crownMatrices.length);
    crownMatrices.forEach((matrix, index) => {
      crowns.setMatrixAt(index, matrix);
      crowns.setColorAt(index, crownColors[index]);
    });
    crowns.castShadow = true;
    crowns.receiveShadow = true;
    this.root.add(crowns);
  }

  private buildCoast(): void {
    const promenade = shadow(new Mesh(new BoxGeometry(390, 0.65, 17), this.materials.sidewalk));
    promenade.position.set(0, 0.12, WORLD.coastZ + 7);
    this.root.add(promenade);
    const seawall = shadow(new Mesh(new BoxGeometry(390, 4.8, 1.8), this.materials.concrete));
    seawall.position.set(0, -1.35, WORLD.coastZ - 1.2);
    this.root.add(seawall);
    const ocean = new Mesh(this.waterGeometry, this.materials.waterEdge);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, -0.38, WORLD.coastZ - 195);
    ocean.receiveShadow = true;
    this.root.add(ocean);
    this.reflectiveMeshes.push(ocean);
  }

  private buildBridge(): void {
    const bridgeLength = 88;
    const deck = shadow(new Mesh(new BoxGeometry(WORLD.roadWidth - 0.8, 1.35, bridgeLength), this.materials.asphalt));
    deck.position.set(23, 1.25, WORLD.coastZ - bridgeLength / 2 + 8);
    this.root.add(deck);
    for (const x of [23 - WORLD.roadWidth / 2, 23 + WORLD.roadWidth / 2]) {
      const barrier = shadow(new Mesh(new BoxGeometry(0.45, 1.4, bridgeLength), this.materials.concrete));
      barrier.position.set(x, 2.02, deck.position.z);
      this.root.add(barrier);
    }
    for (const z of [WORLD.coastZ - 14, WORLD.coastZ - 48, WORLD.coastZ - 78]) {
      for (const x of [19, 27]) {
        const pier = shadow(new Mesh(new CylinderGeometry(0.65, 0.85, 9, 12), this.materials.concrete));
        pier.position.set(x, -3.1, z);
        this.root.add(pier);
      }
    }
  }

  private buildTraffic(): void {
    const half = (WORLD.blockSize * WORLD.blocksPerAxis) / 2;
    const roads = Array.from({ length: WORLD.blocksPerAxis + 1 }, (_, index) => -half + index * WORLD.blockSize);
    for (let index = 0; index < WORLD.trafficCount; index++) {
      const model = createCarModel(TRAFFIC_COLORS[index % TRAFFIC_COLORS.length], false);
      const axis = this.random() > 0.5 ? "x" : "z";
      const direction = this.random() > 0.5 ? 1 : -1;
      const road = roads[Math.floor(this.random() * roads.length)];
      const lane = road + (direction > 0 ? -2.7 : 2.7);
      const along = -half + this.random() * half * 2;
      model.root.position.set(axis === "x" ? along : lane, 0.02, axis === "x" ? lane : along);
      model.root.rotation.y = axis === "x" ? (direction > 0 ? -Math.PI / 2 : Math.PI / 2) : (direction > 0 ? Math.PI : 0);
      model.root.scale.setScalar(0.92 + this.random() * 0.12);
      this.root.add(model.root);
      this.traffic.push({ root: model.root, axis, direction, speed: 7 + this.random() * 7, lane });
    }
  }
}
