import { BLOCKS, CONFIG, type BlockType } from './config';
import { fbm, hash2, noise2 } from './noise';

export class World {
  readonly seed: number;
  readonly changes: Map<string, BlockType | null>;

  constructor(seed: number, changes: Record<string, BlockType | null> = {}) {
    this.seed = seed;
    this.changes = new Map(Object.entries(changes));
  }

  key(x: number, y: number): string {
    return `${x},${y}`;
  }

  surfaceAt(x: number): number {
    if (x >= CONFIG.villageLeft && x <= CONFIG.villageRight) return CONFIG.surfaceBase;
    const broad = noise2(x * 0.018, 0, this.seed) * 9;
    const detail = noise2(x * 0.075, 4, this.seed + 91) * 4;
    return Math.floor(CONFIG.surfaceBase - 4 + broad + detail);
  }

  get(x: number, y: number): BlockType | null {
    const key = this.key(x, y);
    if (this.changes.has(key)) return this.changes.get(key) ?? null;
    return this.generate(x, y);
  }

  set(x: number, y: number, block: BlockType | null): void {
    const generated = this.generate(x, y);
    const key = this.key(x, y);
    if (generated === block) this.changes.delete(key);
    else this.changes.set(key, block);
  }

  isSolid(x: number, y: number): boolean {
    const block = this.get(x, y);
    return block !== null && block !== 'torch' && block !== 'leaves';
  }

  serialize(): Record<string, BlockType | null> {
    return Object.fromEntries(this.changes);
  }

  private generate(x: number, y: number): BlockType | null {
    if (y >= CONFIG.worldBottom) return 'bedrock';
    const village = this.villageBlock(x, y);
    if (village !== undefined) return village;

    const surface = this.surfaceAt(x);
    if (y < surface) {
      if (this.isTree(x, surface)) {
        const trunkHeight = 4 + Math.floor(hash2(x, 0, this.seed + 72) * 3);
        if (y >= surface - trunkHeight && y < surface) return 'wood';
        if (y >= surface - trunkHeight - 2 && y <= surface - trunkHeight + 1 && Math.abs(x - x) <= 2) return 'leaves';
      }
      for (let tx = x - 2; tx <= x + 2; tx += 1) {
        if (!this.isTree(tx, this.surfaceAt(tx))) continue;
        const top = this.surfaceAt(tx) - 4 - Math.floor(hash2(tx, 0, this.seed + 72) * 3);
        const dx = Math.abs(x - tx);
        const dy = Math.abs(y - top);
        if (dx + dy <= 3 && dy <= 2) return 'leaves';
      }
      return null;
    }

    if (y === surface) return 'grass';
    if (y < surface + 5) return 'dirt';

    const cave = fbm(x * 0.065, y * 0.07, this.seed + 411, 3);
    const worm = Math.abs(noise2(x * 0.024, y * 0.024, this.seed + 987) - 0.5);
    if (y > surface + 5 && (cave > 0.68 || worm < 0.035)) return null;

    const ore = hash2(x, y, this.seed + 227);
    const patch = noise2(x * 0.22, y * 0.22, this.seed + 331);
    if (y > 72 && patch > 0.78 && ore > 0.42) return 'crystal';
    if (y > 34 && patch > 0.72 && ore > 0.36) return 'copper';
    if (y > 25 && patch < 0.22 && ore > 0.38) return 'coal';
    return 'stone';
  }

  private isTree(x: number, surface: number): boolean {
    if (x > CONFIG.villageLeft - 3 && x < CONFIG.villageRight + 3) return false;
    return hash2(x, surface, this.seed + 55) > 0.87 && hash2(x - 1, this.surfaceAt(x - 1), this.seed + 55) <= 0.87;
  }

  private villageBlock(x: number, y: number): BlockType | null | undefined {
    if (x < CONFIG.villageLeft || x > CONFIG.villageRight) return undefined;
    const ground = CONFIG.surfaceBase;
    if (y === ground) return 'grass';
    if (y > ground && y < ground + 5) return 'dirt';
    if (y >= ground + 5) return undefined;

    const houseCenters = [-11, 10];
    for (const center of houseCenters) {
      const left = center - 4;
      const right = center + 4;
      const top = ground - 7;
      if (x < left || x > right || y < top || y >= ground) continue;
      const wall = x === left || x === right || y === top || y === ground - 1;
      const roof = y === top && x >= left - 1 && x <= right + 1;
      if (roof) return 'wood';
      if (wall) {
        if (y >= ground - 3 && (x === center || x === center + 1)) return null;
        return 'plank';
      }
      if ((x === center - 2 || x === center + 2) && y === ground - 4) return 'torch';
      return null;
    }

    if (x >= -3 && x <= 3 && y === ground - 1) return 'plank';
    if ((x === -3 || x === 3) && y >= ground - 4 && y < ground - 1) return 'wood';
    if (y === ground - 4 && x >= -3 && x <= 3) return 'plank';
    return null;
  }
}

export function isBreakable(block: BlockType): boolean {
  return BLOCKS[block].hardness < 100;
}
