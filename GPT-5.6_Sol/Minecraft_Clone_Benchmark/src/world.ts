import * as THREE from 'three';
import { BLOCKS, GAME_CONFIG, type BlockType } from './config';
import { createBlockMaterials } from './textures';

export interface BlockPosition {
  x: number;
  y: number;
  z: number;
}

export interface BlockHit extends BlockPosition {
  type: BlockType;
  normal: THREE.Vector3;
  distance: number;
}

const NEIGHBORS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
] as const;

export class VoxelWorld {
  readonly group = new THREE.Group();
  readonly meshes: THREE.InstancedMesh[] = [];
  private readonly blocks = new Map<string, BlockType>();
  private readonly instancePositions = new Map<string, BlockPosition[]>();
  private readonly materials = createBlockMaterials();
  private readonly geometry = new THREE.BoxGeometry(1, 1, 1);

  constructor(private readonly scene: THREE.Scene) {
    this.group.name = 'Voxel World';
    this.scene.add(this.group);
    this.generate();
    this.rebuild();
  }

  private key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  private noise(x: number, z: number): number {
    const seed = GAME_CONFIG.world.seed;
    const broad = Math.sin((x + seed) * 0.22) * 0.9 + Math.cos((z - seed) * 0.19) * 0.8;
    const detail = Math.sin((x + z) * 0.47) * 0.35 + Math.cos((x - z) * 0.31) * 0.3;
    return broad + detail;
  }

  private random(x: number, z: number, salt = 0): number {
    const value = Math.sin(x * 127.1 + z * 311.7 + (GAME_CONFIG.world.seed + salt) * 74.7) * 43758.5453;
    return value - Math.floor(value);
  }

  private generate(): void {
    const half = Math.floor(GAME_CONFIG.world.size / 2);

    for (let x = -half; x < half; x += 1) {
      for (let z = -half; z < half; z += 1) {
        const distance = Math.sqrt(x * x + z * z) / half;
        const edgeDrop = Math.max(0, distance - 0.72) * 7;
        const height = Math.max(2, Math.floor(GAME_CONFIG.world.baseHeight + this.noise(x, z) - edgeDrop));
        const sandy = height <= 3;

        for (let y = 0; y <= height; y += 1) {
          let type: BlockType = 'stone';
          if (y === height) type = sandy ? 'sand' : 'grass';
          else if (y >= height - 2) type = sandy ? 'sand' : 'dirt';
          this.blocks.set(this.key(x, y, z), type);
        }

        const awayFromSpawn = Math.abs(x) > 4 || Math.abs(z) > 4;
        if (!sandy && awayFromSpawn && this.random(x, z) < GAME_CONFIG.world.treeChance) {
          this.addTree(x, height + 1, z);
        }
      }
    }
  }

  private addTree(x: number, y: number, z: number): void {
    const trunkHeight = 3 + Math.floor(this.random(x, z, 8) * 2);
    for (let offset = 0; offset < trunkHeight; offset += 1) {
      this.blocks.set(this.key(x, y + offset, z), 'wood');
    }

    const crownY = y + trunkHeight - 1;
    for (let dx = -2; dx <= 2; dx += 1) {
      for (let dz = -2; dz <= 2; dz += 1) {
        for (let dy = 0; dy <= 2; dy += 1) {
          if (Math.abs(dx) + Math.abs(dz) + dy > 4) continue;
          if (dx === 0 && dz === 0 && dy === 0) continue;
          this.blocks.set(this.key(x + dx, crownY + dy, z + dz), 'leaves');
        }
      }
    }
    this.blocks.set(this.key(x, crownY + 3, z), 'leaves');
  }

  private isVisible(x: number, y: number, z: number): boolean {
    return NEIGHBORS.some(([dx, dy, dz]) => !this.hasBlock(x + dx, y + dy, z + dz));
  }

  rebuild(): void {
    for (const mesh of this.meshes) {
      this.group.remove(mesh);
      mesh.geometry.dispose();
    }
    this.meshes.length = 0;
    this.instancePositions.clear();

    const positionsByType = new Map<BlockType, BlockPosition[]>();
    for (const type of Object.keys(BLOCKS) as BlockType[]) positionsByType.set(type, []);

    for (const [key, type] of this.blocks) {
      const [x, y, z] = key.split(',').map(Number);
      if (this.isVisible(x, y, z)) positionsByType.get(type)!.push({ x, y, z });
    }

    const matrix = new THREE.Matrix4();
    for (const [type, positions] of positionsByType) {
      if (positions.length === 0) continue;
      const mesh = new THREE.InstancedMesh(this.geometry.clone(), this.materials[type], positions.length);
      mesh.name = `Blocks: ${type}`;
      mesh.userData.blockType = type;
      mesh.castShadow = type === 'wood' || type === 'leaves' || type === 'brick';
      mesh.receiveShadow = true;
      positions.forEach((position, index) => {
        matrix.makeTranslation(position.x, position.y, position.z);
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      this.instancePositions.set(mesh.uuid, positions);
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  getBlock(x: number, y: number, z: number): BlockType | undefined {
    return this.blocks.get(this.key(Math.round(x), Math.round(y), Math.round(z)));
  }

  hasBlock(x: number, y: number, z: number): boolean {
    return this.blocks.has(this.key(Math.round(x), Math.round(y), Math.round(z)));
  }

  setBlock(x: number, y: number, z: number, type: BlockType): void {
    this.blocks.set(this.key(Math.round(x), Math.round(y), Math.round(z)), type);
    this.rebuild();
  }

  removeBlock(x: number, y: number, z: number): BlockType | undefined {
    const key = this.key(Math.round(x), Math.round(y), Math.round(z));
    const type = this.blocks.get(key);
    if (type && y > 0) {
      this.blocks.delete(key);
      this.rebuild();
      return type;
    }
    return undefined;
  }

  getSurfaceHeight(x: number, z: number): number {
    const blockX = Math.round(x);
    const blockZ = Math.round(z);
    for (let y = GAME_CONFIG.world.maxTerrainHeight + 9; y >= 0; y -= 1) {
      const type = this.getBlock(blockX, y, blockZ);
      if (type && type !== 'leaves' && type !== 'wood') return y;
    }
    return 0;
  }

  resolveHit(intersection: THREE.Intersection): BlockHit | null {
    if (!(intersection.object instanceof THREE.InstancedMesh) || intersection.instanceId === undefined) return null;
    const positions = this.instancePositions.get(intersection.object.uuid);
    const position = positions?.[intersection.instanceId];
    const type = intersection.object.userData.blockType as BlockType | undefined;
    if (!position || !type || !intersection.face) return null;
    return {
      ...position,
      type,
      normal: intersection.face.normal.clone(),
      distance: intersection.distance,
    };
  }
}
