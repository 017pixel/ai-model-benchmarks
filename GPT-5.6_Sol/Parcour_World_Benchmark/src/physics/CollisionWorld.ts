import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game';

export type SurfaceType = 'concrete' | 'metal' | 'wood' | 'ground';

export interface StaticCollider {
  id: number;
  min: THREE.Vector3;
  max: THREE.Vector3;
  surface: SurfaceType;
  vaultable: boolean;
  climbable: boolean;
}

export interface Rail {
  start: THREE.Vector3;
  end: THREE.Vector3;
  height: number;
}

export interface Ramp {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  lowY: number;
  highY: number;
  axis: 'x' | 'z';
  rising: 1 | -1;
}

export interface MoveResult {
  grounded: boolean;
  landed: boolean;
  hitCeiling: boolean;
  wallNormal: THREE.Vector3 | null;
  groundSurface: SurfaceType;
  slope: Ramp | null;
}

const queryPadding = 1.5;

export class CollisionWorld {
  readonly colliders: StaticCollider[] = [];
  readonly rails: Rail[] = [];
  readonly ramps: Ramp[] = [];
  private readonly grid = new Map<string, StaticCollider[]>();
  private nextId = 0;

  addBox(
    center: THREE.Vector3,
    size: THREE.Vector3,
    options: Partial<Pick<StaticCollider, 'surface' | 'vaultable' | 'climbable'>> = {},
  ): StaticCollider {
    const half = size.clone().multiplyScalar(0.5);
    const collider: StaticCollider = {
      id: this.nextId++,
      min: center.clone().sub(half),
      max: center.clone().add(half),
      surface: options.surface ?? 'concrete',
      vaultable: options.vaultable ?? false,
      climbable: options.climbable ?? true,
    };
    this.colliders.push(collider);
    this.insert(collider);
    return collider;
  }

  addRail(start: THREE.Vector3, end: THREE.Vector3, height = 0): void {
    this.rails.push({ start: start.clone(), end: end.clone(), height });
  }

  addRamp(ramp: Ramp): void {
    this.ramps.push(ramp);
  }

  private insert(collider: StaticCollider): void {
    const size = GAME_CONFIG.world.spatialCellSize;
    const minX = Math.floor(collider.min.x / size);
    const maxX = Math.floor(collider.max.x / size);
    const minZ = Math.floor(collider.min.z / size);
    const maxZ = Math.floor(collider.max.z / size);
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const key = `${x}:${z}`;
        const bucket = this.grid.get(key) ?? [];
        if (!this.grid.has(key)) this.grid.set(key, bucket);
        bucket.push(collider);
      }
    }
  }

  query(x: number, z: number, radius = queryPadding): StaticCollider[] {
    const size = GAME_CONFIG.world.spatialCellSize;
    const minX = Math.floor((x - radius) / size);
    const maxX = Math.floor((x + radius) / size);
    const minZ = Math.floor((z - radius) / size);
    const maxZ = Math.floor((z + radius) / size);
    const found = new Map<number, StaticCollider>();
    for (let gx = minX; gx <= maxX; gx++) {
      for (let gz = minZ; gz <= maxZ; gz++) {
        for (const collider of this.grid.get(`${gx}:${gz}`) ?? []) found.set(collider.id, collider);
      }
    }
    return [...found.values()];
  }

  move(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    dt: number,
    radius: number,
    height: number,
  ): MoveResult {
    const result: MoveResult = {
      grounded: false,
      landed: false,
      hitCeiling: false,
      wallNormal: null,
      groundSurface: 'ground',
      slope: null,
    };
    const distance = velocity.length() * dt;
    const steps = Math.max(1, Math.ceil(distance / 0.35));
    const stepDt = dt / steps;

    for (let step = 0; step < steps; step++) {
      const nearby = this.query(position.x, position.z, radius + 0.8);
      this.moveHorizontalAxis(position, velocity, nearby, radius, height, stepDt, 'x', result);
      this.moveHorizontalAxis(position, velocity, nearby, radius, height, stepDt, 'z', result);

      const oldY = position.y;
      const nextY = oldY + velocity.y * stepDt;
      if (velocity.y <= 0) {
        const floor = this.getFloor(position.x, position.z, oldY + 0.15, nearby, radius);
        if (floor && nextY <= floor.y && oldY >= floor.y - 0.12) {
          position.y = floor.y;
          result.landed ||= velocity.y < -2;
          result.grounded = true;
          result.groundSurface = floor.surface;
          result.slope = floor.ramp;
          velocity.y = 0;
        } else {
          position.y = nextY;
        }
      } else {
        let ceiling = Infinity;
        for (const box of nearby) {
          if (!this.overlapsXZ(position.x, position.z, radius, box)) continue;
          if (oldY + height <= box.min.y + 0.05 && nextY + height >= box.min.y) {
            ceiling = Math.min(ceiling, box.min.y);
          }
        }
        if (ceiling < Infinity) {
          position.y = ceiling - height - 0.01;
          velocity.y = Math.min(0, velocity.y);
          result.hitCeiling = true;
        } else {
          position.y = nextY;
        }
      }
    }

    if (!result.grounded && velocity.y <= 0.5) {
      const floor = this.getFloor(position.x, position.z, position.y + 0.08, undefined, radius);
      if (floor && position.y - floor.y <= 0.08) {
        position.y = floor.y;
        velocity.y = 0;
        result.grounded = true;
        result.groundSurface = floor.surface;
        result.slope = floor.ramp;
      }
    }
    return result;
  }

  private moveHorizontalAxis(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    colliders: StaticCollider[],
    radius: number,
    height: number,
    dt: number,
    axis: 'x' | 'z',
    result: MoveResult,
  ): void {
    const next = position[axis] + velocity[axis] * dt;
    for (const box of colliders) {
      if (position.y + height <= box.min.y + 0.04 || position.y >= box.max.y - 0.04) continue;
      const otherAxis = axis === 'x' ? 'z' : 'x';
      if (position[otherAxis] + radius <= box.min[otherAxis] || position[otherAxis] - radius >= box.max[otherAxis]) continue;
      if (next + radius > box.min[axis] && next - radius < box.max[axis]) {
        const normal = new THREE.Vector3();
        if (velocity[axis] > 0) {
          position[axis] = box.min[axis] - radius - 0.001;
          normal[axis] = -1;
        } else if (velocity[axis] < 0) {
          position[axis] = box.max[axis] + radius + 0.001;
          normal[axis] = 1;
        }
        if (Math.abs(velocity[axis]) > 0.01) result.wallNormal = normal;
        velocity[axis] = 0;
        return;
      }
    }
    position[axis] = next;
  }

  private overlapsXZ(x: number, z: number, radius: number, box: StaticCollider): boolean {
    return x + radius > box.min.x && x - radius < box.max.x && z + radius > box.min.z && z - radius < box.max.z;
  }

  getFloor(
    x: number,
    z: number,
    maxY: number,
    colliders = this.query(x, z),
    radius = 0.25,
  ): { y: number; surface: SurfaceType; ramp: Ramp | null } | null {
    let bestY = -Infinity;
    let surface: SurfaceType = 'ground';
    let activeRamp: Ramp | null = null;
    for (const box of colliders) {
      if (!this.overlapsXZ(x, z, radius, box)) continue;
      if (box.max.y <= maxY && box.max.y > bestY) {
        bestY = box.max.y;
        surface = box.surface;
        activeRamp = null;
      }
    }
    for (const ramp of this.ramps) {
      if (x < ramp.minX || x > ramp.maxX || z < ramp.minZ || z > ramp.maxZ) continue;
      const span = ramp.axis === 'x' ? ramp.maxX - ramp.minX : ramp.maxZ - ramp.minZ;
      const coord = ramp.axis === 'x' ? x - ramp.minX : z - ramp.minZ;
      const t = ramp.rising === 1 ? coord / span : 1 - coord / span;
      const y = THREE.MathUtils.lerp(ramp.lowY, ramp.highY, t);
      if (y <= maxY && y > bestY) {
        bestY = y;
        surface = 'concrete';
        activeRamp = ramp;
      }
    }
    return bestY > -Infinity ? { y: bestY, surface, ramp: activeRamp } : null;
  }

  findWall(position: THREE.Vector3, direction: THREE.Vector3, distance: number, height: number): { collider: StaticCollider; normal: THREE.Vector3 } | null {
    let nearest = distance;
    let hit: { collider: StaticCollider; normal: THREE.Vector3 } | null = null;
    for (const box of this.query(position.x, position.z, distance + 1)) {
      if (position.y + height * 0.75 < box.min.y || position.y + height * 0.25 > box.max.y) continue;
      const ray = new THREE.Ray(position.clone().add(new THREE.Vector3(0, height * 0.5, 0)), direction.clone().normalize());
      const target = new THREE.Vector3();
      if (!ray.intersectBox(new THREE.Box3(box.min, box.max), target)) continue;
      const hitDistance = target.distanceTo(ray.origin);
      if (hitDistance >= nearest) continue;
      nearest = hitDistance;
      const normal = new THREE.Vector3();
      const epsilon = 0.02;
      if (Math.abs(target.x - box.min.x) < epsilon) normal.set(-1, 0, 0);
      else if (Math.abs(target.x - box.max.x) < epsilon) normal.set(1, 0, 0);
      else if (Math.abs(target.z - box.min.z) < epsilon) normal.set(0, 0, -1);
      else normal.set(0, 0, 1);
      hit = { collider: box, normal };
    }
    return hit;
  }

  findGrindRail(position: THREE.Vector3, maxDistance = 0.75): { rail: Rail; point: THREE.Vector3; t: number } | null {
    let closest: { rail: Rail; point: THREE.Vector3; t: number } | null = null;
    let nearest = maxDistance;
    for (const rail of this.rails) {
      const start = rail.start.clone();
      const end = rail.end.clone();
      start.y += rail.height;
      end.y += rail.height;
      const segment = end.clone().sub(start);
      const t = THREE.MathUtils.clamp(position.clone().sub(start).dot(segment) / segment.lengthSq(), 0, 1);
      const point = start.addScaledVector(segment, t);
      const distance = point.distanceTo(position);
      if (distance < nearest) {
        nearest = distance;
        closest = { rail, point, t };
      }
    }
    return closest;
  }
}
