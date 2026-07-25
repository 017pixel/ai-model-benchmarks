import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game';
import { CollisionWorld, type SurfaceType } from '../physics/CollisionWorld';
import { seededRandom } from '../utils/math';

interface BuildingSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  material: keyof City['materials'];
  roofStyle: 'utility' | 'garden' | 'scaffold' | 'billboard';
}

interface BoxOptions {
  collide?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  surface?: SurfaceType;
  vaultable?: boolean;
  climbable?: boolean;
}

const buildings: BuildingSpec[] = [
  { x: -90, z: -92, w: 30, d: 27, h: 22, material: 'brickRed', roofStyle: 'utility' },
  { x: -88, z: -72, w: 25, d: 11, h: 14, material: 'sandstone', roofStyle: 'billboard' },
  { x: -41, z: -89, w: 24, d: 29, h: 31, material: 'concreteDark', roofStyle: 'scaffold' },
  { x: -19, z: -91, w: 15, d: 25, h: 17, material: 'brickBrown', roofStyle: 'utility' },
  { x: 24, z: -91, w: 31, d: 25, h: 25, material: 'sandstone', roofStyle: 'garden' },
  { x: 47, z: -86, w: 11, d: 31, h: 13, material: 'concreteBlue', roofStyle: 'utility' },
  { x: 86, z: -90, w: 32, d: 30, h: 36, material: 'concreteDark', roofStyle: 'billboard' },
  { x: -92, z: -34, w: 28, d: 32, h: 16, material: 'concreteBlue', roofStyle: 'garden' },
  { x: -89, z: -13, w: 27, d: 9, h: 9, material: 'brickRed', roofStyle: 'utility' },
  { x: -40, z: -36, w: 26, d: 25, h: 20, material: 'sandstone', roofStyle: 'billboard' },
  { x: -18, z: -34, w: 13, d: 27, h: 12, material: 'brickBrown', roofStyle: 'scaffold' },
  { x: 28, z: -34, w: 36, d: 31, h: 18, material: 'brickRed', roofStyle: 'utility' },
  { x: 90, z: -33, w: 33, d: 32, h: 24, material: 'sandstone', roofStyle: 'garden' },
  { x: -91, z: 29, w: 30, d: 34, h: 29, material: 'concreteDark', roofStyle: 'scaffold' },
  { x: -35, z: 25, w: 38, d: 28, h: 15, material: 'brickBrown', roofStyle: 'billboard' },
  { x: 88, z: 27, w: 34, d: 30, h: 18, material: 'concreteBlue', roofStyle: 'utility' },
  { x: -88, z: 87, w: 34, d: 32, h: 19, material: 'sandstone', roofStyle: 'utility' },
  { x: -35, z: 87, w: 37, d: 31, h: 26, material: 'brickRed', roofStyle: 'garden' },
  { x: 25, z: 88, w: 31, d: 32, h: 15, material: 'concreteDark', roofStyle: 'scaffold' },
  { x: 46, z: 89, w: 10, d: 29, h: 10, material: 'sandstone', roofStyle: 'utility' },
  { x: 88, z: 88, w: 34, d: 33, h: 32, material: 'brickBrown', roofStyle: 'billboard' },
];

export class City {
  readonly group = new THREE.Group();
  readonly collision = new CollisionWorld();
  readonly spawn = new THREE.Vector3(15, 0.31, 18);
  private readonly random = seededRandom(4172);
  private readonly windowTransforms: THREE.Matrix4[] = [];
  private readonly boxGeometries = new Map<string, THREE.BoxGeometry>();

  readonly materials = {
    asphalt: new THREE.MeshStandardMaterial({ color: '#242b2b', roughness: 0.94, metalness: 0.02 }),
    concrete: new THREE.MeshStandardMaterial({ color: '#85877e', roughness: 0.9, metalness: 0.01 }),
    concreteLight: new THREE.MeshStandardMaterial({ color: '#a7a89d', roughness: 0.88 }),
    concreteDark: new THREE.MeshStandardMaterial({ color: '#4d5757', roughness: 0.84 }),
    concreteBlue: new THREE.MeshStandardMaterial({ color: '#627579', roughness: 0.8 }),
    sandstone: new THREE.MeshStandardMaterial({ color: '#a58e70', roughness: 0.86 }),
    brickRed: new THREE.MeshStandardMaterial({ color: '#86564a', roughness: 0.91 }),
    brickBrown: new THREE.MeshStandardMaterial({ color: '#665044', roughness: 0.92 }),
    metal: new THREE.MeshStandardMaterial({ color: '#435052', roughness: 0.42, metalness: 0.78 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: '#202829', roughness: 0.36, metalness: 0.82 }),
    orange: new THREE.MeshStandardMaterial({ color: '#d26732', roughness: 0.6, metalness: 0.12 }),
    teal: new THREE.MeshStandardMaterial({ color: '#25706d', roughness: 0.65, metalness: 0.15 }),
    wood: new THREE.MeshStandardMaterial({ color: '#765f42', roughness: 0.9 }),
    foliage: new THREE.MeshStandardMaterial({ color: '#385d4b', roughness: 0.92 }),
    glass: new THREE.MeshStandardMaterial({ color: '#172b31', roughness: 0.26, metalness: 0.28 }),
    paint: new THREE.MeshStandardMaterial({ color: '#d7d2bd', roughness: 0.72 }),
  };

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.createGroundAndRoads();
    this.createBuildings();
    this.createParkourDistrict();
    this.createStreetLife();
    this.createWindows();
  }

  private box(
    position: THREE.Vector3,
    size: THREE.Vector3,
    material: THREE.Material,
    options: BoxOptions = {},
  ): THREE.Mesh {
    const geometryKey = `${size.x.toFixed(3)}:${size.y.toFixed(3)}:${size.z.toFixed(3)}`;
    let geometry = this.boxGeometries.get(geometryKey);
    if (!geometry) {
      geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      this.boxGeometries.set(geometryKey, geometry);
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = options.castShadow ?? size.y > 0.5;
    mesh.receiveShadow = options.receiveShadow ?? true;
    this.group.add(mesh);
    if (options.collide ?? true) {
      this.collision.addBox(position, size, {
        surface: options.surface,
        vaultable: options.vaultable,
        climbable: options.climbable,
      });
    }
    return mesh;
  }

  private createGroundAndRoads(): void {
    const size = GAME_CONFIG.world.size;
    this.box(new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(size, 0.6, size), this.materials.concrete, {
      surface: 'ground',
      castShadow: false,
    });

    for (const coordinate of [-62, 0, 62]) {
      this.box(new THREE.Vector3(coordinate, 0.015, 0), new THREE.Vector3(14, 0.03, size), this.materials.asphalt, { collide: false, castShadow: false });
      this.box(new THREE.Vector3(0, 0.018, coordinate), new THREE.Vector3(size, 0.035, 14), this.materials.asphalt, { collide: false, castShadow: false });
      for (let offset = -102; offset <= 102; offset += 9) {
        this.box(new THREE.Vector3(coordinate, 0.04, offset), new THREE.Vector3(0.16, 0.025, 4.5), this.materials.paint, { collide: false, castShadow: false });
        this.box(new THREE.Vector3(offset, 0.042, coordinate), new THREE.Vector3(4.5, 0.025, 0.16), this.materials.paint, { collide: false, castShadow: false });
      }
    }

    for (const x of [-69.7, -54.3, -7.7, 7.7, 54.3, 69.7]) {
      this.box(new THREE.Vector3(x, 0.13, 0), new THREE.Vector3(1.3, 0.25, size), this.materials.concreteLight, { surface: 'concrete', castShadow: false });
    }
    for (const z of [-69.7, -54.3, -7.7, 7.7, 54.3, 69.7]) {
      this.box(new THREE.Vector3(0, 0.135, z), new THREE.Vector3(size, 0.25, 1.3), this.materials.concreteLight, { surface: 'concrete', castShadow: false });
    }

    for (const x of [-62, 0, 62]) {
      for (const z of [-62, 0, 62]) this.createCrosswalk(x, z);
    }
  }

  private createCrosswalk(x: number, z: number): void {
    for (let i = -3; i <= 3; i++) {
      this.box(new THREE.Vector3(x + i * 1.45, 0.048, z - 5), new THREE.Vector3(0.72, 0.025, 3), this.materials.paint, { collide: false, castShadow: false });
      this.box(new THREE.Vector3(x - 5, 0.05, z + i * 1.45), new THREE.Vector3(3, 0.025, 0.72), this.materials.paint, { collide: false, castShadow: false });
    }
  }

  private createBuildings(): void {
    buildings.forEach((spec, index) => {
      this.box(
        new THREE.Vector3(spec.x, spec.h * 0.5 + 0.25, spec.z),
        new THREE.Vector3(spec.w, spec.h, spec.d),
        this.materials[spec.material],
        { surface: 'concrete' },
      );
      this.addBuildingDetails(spec, index);
    });
  }

  private addBuildingDetails(spec: BuildingSpec, index: number): void {
    const floors = Math.max(2, Math.floor(spec.h / 3.2));
    const colsFront = Math.max(2, Math.floor(spec.w / 4));
    const colsSide = Math.max(2, Math.floor(spec.d / 4));
    const matrix = new THREE.Matrix4();
    for (let floor = 0; floor < floors; floor++) {
      const y = 2.25 + floor * 3.15;
      for (let col = 0; col < colsFront; col++) {
        const x = spec.x - spec.w * 0.5 + ((col + 0.5) * spec.w) / colsFront;
        matrix.compose(new THREE.Vector3(x, y, spec.z + spec.d * 0.5 + 0.012), new THREE.Quaternion(), new THREE.Vector3(1.35, 1.45, 0.08));
        this.windowTransforms.push(matrix.clone());
        matrix.compose(new THREE.Vector3(x, y, spec.z - spec.d * 0.5 - 0.012), new THREE.Quaternion(), new THREE.Vector3(1.35, 1.45, 0.08));
        this.windowTransforms.push(matrix.clone());
      }
      for (let col = 0; col < colsSide; col++) {
        const z = spec.z - spec.d * 0.5 + ((col + 0.5) * spec.d) / colsSide;
        matrix.compose(
          new THREE.Vector3(spec.x + spec.w * 0.5 + 0.012, y, z),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 0.5),
          new THREE.Vector3(1.35, 1.45, 0.08),
        );
        this.windowTransforms.push(matrix.clone());
      }
    }

    const roofY = spec.h + 0.25;
    this.addParapets(spec.x, spec.z, spec.w, spec.d, roofY);
    if (spec.roofStyle === 'utility') {
      this.createAC(spec.x - 3, roofY + 0.65, spec.z + 2);
      this.createAC(spec.x + 2.5, roofY + 0.65, spec.z - 2.5);
      this.addPipeRun(spec.x, roofY + 0.8, spec.z, Math.min(8, spec.w - 3), index % 2 === 0 ? 'x' : 'z');
    } else if (spec.roofStyle === 'garden') {
      for (let i = -1; i <= 1; i++) this.createPlanter(spec.x + i * 3, roofY + 0.35, spec.z);
    } else if (spec.roofStyle === 'scaffold') {
      this.createScaffold(spec.x + spec.w * 0.5 + 1.1, spec.z, roofY, Math.min(12, spec.h));
    } else {
      this.createBillboard(spec.x, roofY + 3.3, spec.z, Math.min(spec.w - 4, 11), index % 2 === 0);
    }

    if (index % 3 === 0) this.createFireEscape(spec);
  }

  private addParapets(x: number, z: number, width: number, depth: number, roofY: number): void {
    const h = 0.65;
    this.box(new THREE.Vector3(x, roofY + h * 0.5, z - depth * 0.5 + 0.18), new THREE.Vector3(width, h, 0.36), this.materials.concreteDark, { surface: 'concrete', vaultable: true });
    this.box(new THREE.Vector3(x, roofY + h * 0.5, z + depth * 0.5 - 0.18), new THREE.Vector3(width, h, 0.36), this.materials.concreteDark, { surface: 'concrete', vaultable: true });
    this.box(new THREE.Vector3(x - width * 0.5 + 0.18, roofY + h * 0.5, z), new THREE.Vector3(0.36, h, depth), this.materials.concreteDark, { surface: 'concrete', vaultable: true });
    this.box(new THREE.Vector3(x + width * 0.5 - 0.18, roofY + h * 0.5, z), new THREE.Vector3(0.36, h, depth), this.materials.concreteDark, { surface: 'concrete', vaultable: true });
  }

  private createWindows(): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.InstancedMesh(geometry, this.materials.glass, this.windowTransforms.length);
    this.windowTransforms.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    this.group.add(mesh);
  }

  private createParkourDistrict(): void {
    // Central training plaza: a readable loop from street level to the rooftops.
    this.createContainer(17, 1.25, 31, 'x', this.materials.orange);
    this.createContainer(25, 2.5, 31, 'z', this.materials.teal);
    this.createContainer(25, 4.9, 38, 'x', this.materials.darkMetal);
    this.createDumpster(12, 0.8, 26);
    this.createCrateStack(9, 23, 3);
    this.createRamp(14, 20, 6, 3.2, 'x', 1);
    this.createStairs(34, 17, 8, 'z', 1);
    this.createLowWalls();
    this.createRailCourse();
    this.createConstructionYard();
    this.createRooftopBridges();
    this.createParkingLot();
    this.createAlleyRoute();
  }

  private createContainer(x: number, y: number, z: number, axis: 'x' | 'z', material: THREE.Material): void {
    const size = axis === 'x' ? new THREE.Vector3(7.2, 2.45, 2.6) : new THREE.Vector3(2.6, 2.45, 7.2);
    this.box(new THREE.Vector3(x, y, z), size, material, { surface: 'metal' });
    for (let i = -2; i <= 2; i++) {
      const ribPosition = axis === 'x' ? new THREE.Vector3(x + i * 1.25, y, z + size.z * 0.505) : new THREE.Vector3(x + size.x * 0.505, y, z + i * 1.25);
      const ribSize = axis === 'x' ? new THREE.Vector3(0.08, 2.2, 0.08) : new THREE.Vector3(0.08, 2.2, 0.08);
      this.box(ribPosition, ribSize, this.materials.darkMetal, { collide: false });
    }
  }

  private createDumpster(x: number, y: number, z: number): void {
    this.box(new THREE.Vector3(x, y, z), new THREE.Vector3(2.6, 1.5, 1.4), this.materials.teal, { surface: 'metal', vaultable: true });
    const lid = this.box(new THREE.Vector3(x, y + 0.83, z), new THREE.Vector3(2.75, 0.12, 1.55), this.materials.darkMetal, { surface: 'metal', vaultable: true });
    lid.rotation.z = -0.03;
  }

  private createCrateStack(x: number, z: number, levels: number): void {
    for (let level = 0; level < levels; level++) {
      for (let i = 0; i < levels - level; i++) {
        this.box(new THREE.Vector3(x + i * 1.25, 0.62 + level * 1.22, z), new THREE.Vector3(1.15, 1.15, 1.15), this.materials.wood, { surface: 'wood', vaultable: level === 0 });
      }
    }
  }

  private createLowWalls(): void {
    const walls = [
      [17, 15, 8, 0.9, 0.5],
      [24, 13, 0.55, 1.25, 7],
      [37, 38, 9, 1.55, 0.55],
      [43, 26, 0.55, 2.1, 8],
      [17, 47, 8, 1.15, 0.55],
    ];
    for (const [x, z, w, h, d] of walls) {
      this.box(new THREE.Vector3(x, h * 0.5, z), new THREE.Vector3(w, h, d), this.materials.concreteDark, { vaultable: h < 1.4 });
    }
  }

  private createRailCourse(): void {
    this.createRail(new THREE.Vector3(9, 1.05, 12), new THREE.Vector3(22, 1.05, 12));
    this.createRail(new THREE.Vector3(32, 1.4, 45), new THREE.Vector3(45, 2.4, 45));
    this.createRail(new THREE.Vector3(11, 3.0, 42), new THREE.Vector3(20, 5.0, 42));
    this.createRail(new THREE.Vector3(45, 1.1, 18), new THREE.Vector3(45, 1.1, 29));
  }

  private createRail(start: THREE.Vector3, end: THREE.Vector3): void {
    const segment = end.clone().sub(start);
    const length = segment.length();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, length, 8), this.materials.metal);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), segment.clone().normalize());
    mesh.castShadow = true;
    this.group.add(mesh);
    const postCount = Math.max(2, Math.floor(length / 3));
    for (let i = 0; i <= postCount; i++) {
      const p = start.clone().lerp(end, i / postCount);
      const postHeight = Math.max(0.45, p.y);
      this.box(new THREE.Vector3(p.x, postHeight * 0.5, p.z), new THREE.Vector3(0.1, postHeight, 0.1), this.materials.metal, { collide: false });
    }
    this.collision.addRail(start, end);
  }

  private createRamp(x: number, z: number, length: number, height: number, axis: 'x' | 'z', rising: 1 | -1): void {
    const width = 3.2;
    const halfLength = length * 0.5;
    const halfWidth = width * 0.5;
    const geometry = new THREE.BufferGeometry();
    const vertices = axis === 'x'
      ? new Float32Array([
          -halfLength, 0, -halfWidth, halfLength, 0, -halfWidth, halfLength, height, -halfWidth,
          -halfLength, 0, halfWidth, halfLength, height, halfWidth, halfLength, 0, halfWidth,
          -halfLength, 0, -halfWidth, halfLength, height, -halfWidth, -halfLength, 0, halfWidth,
          -halfLength, 0, halfWidth, halfLength, height, -halfWidth, halfLength, height, halfWidth,
          halfLength, 0, -halfWidth, halfLength, 0, halfWidth, halfLength, height, halfWidth,
          halfLength, 0, -halfWidth, halfLength, height, halfWidth, halfLength, height, -halfWidth,
        ])
      : new Float32Array([
          -halfWidth, 0, -halfLength, -halfWidth, height, halfLength, -halfWidth, 0, halfLength,
          halfWidth, 0, -halfLength, halfWidth, 0, halfLength, halfWidth, height, halfLength,
          -halfWidth, 0, -halfLength, halfWidth, 0, -halfLength, halfWidth, height, halfLength,
          -halfWidth, 0, -halfLength, halfWidth, height, halfLength, -halfWidth, height, halfLength,
          -halfWidth, height, halfLength, halfWidth, height, halfLength, halfWidth, 0, halfLength,
          -halfWidth, height, halfLength, halfWidth, 0, halfLength, -halfWidth, 0, halfLength,
        ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, this.materials.concreteDark);
    mesh.position.set(x, 0.02, z);
    if (rising === -1) mesh.rotation.y = Math.PI;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.collision.addRamp({
      minX: x - (axis === 'x' ? halfLength : halfWidth),
      maxX: x + (axis === 'x' ? halfLength : halfWidth),
      minZ: z - (axis === 'z' ? halfLength : halfWidth),
      maxZ: z + (axis === 'z' ? halfLength : halfWidth),
      lowY: 0,
      highY: height,
      axis,
      rising,
    });
  }

  private createStairs(x: number, z: number, count: number, axis: 'x' | 'z', direction: 1 | -1): void {
    for (let i = 0; i < count; i++) {
      const h = (i + 1) * 0.34;
      const position = new THREE.Vector3(x, h * 0.5, z);
      position[axis] += direction * i * 0.48;
      const size = axis === 'x' ? new THREE.Vector3(0.52, h, 3.2) : new THREE.Vector3(3.2, h, 0.52);
      this.box(position, size, this.materials.concreteLight, { surface: 'concrete' });
    }
  }

  private createConstructionYard(): void {
    this.createScaffold(17, 81, 12, 10);
    this.createContainer(31, 1.25, 83, 'z', this.materials.orange);
    this.createContainer(35, 1.25, 88, 'x', this.materials.teal);
    this.createCrateStack(12, 89, 4);
    for (let i = 0; i < 5; i++) {
      this.box(new THREE.Vector3(42 + i * 1.4, 0.7, 77), new THREE.Vector3(1.1, 1.4, 1.1), this.materials.wood, { surface: 'wood', vaultable: true });
    }
  }

  private createScaffold(x: number, z: number, maxY: number, height: number): void {
    const levels = Math.max(2, Math.floor(height / 2.6));
    for (let level = 0; level <= levels; level++) {
      const y = Math.min(maxY, level * 2.6);
      this.box(new THREE.Vector3(x, y, z), new THREE.Vector3(4.6, 0.16, 2.2), this.materials.metal, { surface: 'metal' });
      for (const px of [-2.15, 2.15]) {
        for (const pz of [-0.95, 0.95]) {
          this.box(new THREE.Vector3(x + px, Math.min(maxY, height) * 0.5, z + pz), new THREE.Vector3(0.12, Math.min(maxY, height), 0.12), this.materials.metal, { collide: false });
        }
      }
    }
    this.createRail(new THREE.Vector3(x - 2.1, Math.min(maxY, height) + 0.75, z - 1), new THREE.Vector3(x + 2.1, Math.min(maxY, height) + 0.75, z - 1));
  }

  private createRooftopBridges(): void {
    this.box(new THREE.Vector3(-29.5, 14.3, -34), new THREE.Vector3(8, 0.45, 2.4), this.materials.metal, { surface: 'metal' });
    this.createRail(new THREE.Vector3(-33.5, 15.05, -35.1), new THREE.Vector3(-25.5, 15.05, -35.1));
    this.box(new THREE.Vector3(55.5, 13.65, -88), new THREE.Vector3(6.5, 0.42, 2), this.materials.metal, { surface: 'metal' });
    this.box(new THREE.Vector3(57.5, 10.65, 89), new THREE.Vector3(14, 0.4, 2.2), this.materials.metal, { surface: 'metal' });
  }

  private createParkingLot(): void {
    for (let i = 0; i < 7; i++) {
      this.box(new THREE.Vector3(12 + i * 5.2, 0.035, -18), new THREE.Vector3(0.12, 0.03, 8), this.materials.paint, { collide: false, castShadow: false });
    }
    for (let i = 0; i < 4; i++) this.createCar(15 + i * 8.5, -18 + (i % 2) * 5, i % 2 === 0 ? this.materials.teal : this.materials.orange);
  }

  private createCar(x: number, z: number, material: THREE.Material): void {
    this.box(new THREE.Vector3(x, 0.55, z), new THREE.Vector3(3.8, 0.85, 1.75), material, { surface: 'metal', vaultable: true });
    this.box(new THREE.Vector3(x + 0.2, 1.15, z), new THREE.Vector3(2.0, 0.62, 1.55), this.materials.glass, { surface: 'metal', vaultable: true });
  }

  private createAlleyRoute(): void {
    for (let i = 0; i < 5; i++) this.createAC(-57, 0.55 + i * 1.6, 20 + i * 5.5);
    this.createStairs(-52, 38, 10, 'z', 1);
    this.createRamp(-48, 45, 7, 3.6, 'z', 1);
    this.createRail(new THREE.Vector3(-54, 4.0, 49), new THREE.Vector3(-42, 4.0, 49));
    for (let i = 0; i < 4; i++) this.createDumpster(-51 + i * 3.5, 0.8, 16);
  }

  private createAC(x: number, y: number, z: number): void {
    this.box(new THREE.Vector3(x, y, z), new THREE.Vector3(1.8, 1.1, 1.35), this.materials.metal, { surface: 'metal', vaultable: true });
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 12), this.materials.darkMetal);
    fan.rotation.x = Math.PI * 0.5;
    fan.position.set(x, y, z + 0.7);
    this.group.add(fan);
  }

  private addPipeRun(x: number, y: number, z: number, length: number, axis: 'x' | 'z'): void {
    const geometry = new THREE.CylinderGeometry(0.16, 0.16, length, 10);
    const pipe = new THREE.Mesh(geometry, this.materials.metal);
    pipe.position.set(x, y, z);
    pipe.rotation[axis === 'x' ? 'z' : 'x'] = Math.PI * 0.5;
    pipe.castShadow = true;
    this.group.add(pipe);
  }

  private createPlanter(x: number, y: number, z: number): void {
    this.box(new THREE.Vector3(x, y, z), new THREE.Vector3(2.4, 0.7, 1.1), this.materials.concreteDark, { vaultable: true });
    for (let i = -1; i <= 1; i++) {
      const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), this.materials.foliage);
      shrub.position.set(x + i * 0.65, y + 0.65, z);
      shrub.castShadow = true;
      this.group.add(shrub);
    }
  }

  private createBillboard(x: number, y: number, z: number, width: number, rotate: boolean): void {
    const board = this.box(new THREE.Vector3(x, y, z), new THREE.Vector3(width, 3.5, 0.2), this.materials.orange, { collide: false });
    if (rotate) board.rotation.y = Math.PI * 0.5;
    for (const offset of [-width * 0.35, width * 0.35]) {
      this.box(new THREE.Vector3(x + (rotate ? 0 : offset), y - 2.4, z + (rotate ? offset : 0)), new THREE.Vector3(0.14, 2.8, 0.14), this.materials.metal, { collide: false });
    }
  }

  private createFireEscape(spec: BuildingSpec): void {
    const x = spec.x + spec.w * 0.5 + 0.8;
    const levels = Math.max(2, Math.floor(spec.h / 4));
    for (let i = 1; i < levels; i++) {
      const y = i * 4;
      this.box(new THREE.Vector3(x, y, spec.z), new THREE.Vector3(1.5, 0.16, 4.2), this.materials.metal, { surface: 'metal' });
      this.createRail(new THREE.Vector3(x + 0.75, y + 0.8, spec.z - 2), new THREE.Vector3(x + 0.75, y + 0.8, spec.z + 2));
    }
  }

  private createStreetLife(): void {
    for (const road of [-62, 0, 62]) {
      for (let i = -95; i <= 95; i += 22) {
        this.createStreetLamp(road + 8.8, i);
        this.createStreetLamp(i, road - 8.8);
      }
    }
    for (let i = 0; i < 24; i++) {
      const x = this.random() * 200 - 100;
      const z = this.random() * 200 - 100;
      if (Math.min(...[-62, 0, 62].map((road) => Math.abs(x - road))) < 9 && Math.min(...[-62, 0, 62].map((road) => Math.abs(z - road))) < 9) continue;
      this.box(new THREE.Vector3(x, 0.42, z), new THREE.Vector3(0.34, 0.84, 0.34), this.materials.orange, { vaultable: true });
    }
    this.createFence(-8.5, 79, 0, 22);
    this.createFence(54, 29, Math.PI * 0.5, 20);
  }

  private createStreetLamp(x: number, z: number): void {
    this.box(new THREE.Vector3(x, 2.7, z), new THREE.Vector3(0.13, 5.4, 0.13), this.materials.darkMetal, { collide: false });
    this.box(new THREE.Vector3(x, 5.35, z), new THREE.Vector3(0.8, 0.16, 0.28), this.materials.metal, { collide: false });
  }

  private createFence(x: number, z: number, rotation: number, length: number): void {
    const alongX = Math.abs(Math.cos(rotation)) > 0.5;
    for (let i = 0; i <= length; i += 2) {
      const px = x + (alongX ? i - length * 0.5 : 0);
      const pz = z + (alongX ? 0 : i - length * 0.5);
      this.box(new THREE.Vector3(px, 1, pz), new THREE.Vector3(0.1, 2, 0.1), this.materials.metal, { collide: false });
    }
    const railSize = alongX ? new THREE.Vector3(length, 0.08, 0.08) : new THREE.Vector3(0.08, 0.08, length);
    for (const y of [0.45, 1.2, 1.9]) this.box(new THREE.Vector3(x, y, z), railSize, this.materials.metal, { collide: false });
  }
}
