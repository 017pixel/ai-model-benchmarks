import * as THREE from 'three';
import { GAME_CONFIG } from './config';
import type { VoxelWorld } from './world';

export type EntityKind = 'zombie' | 'brute' | 'rival';

export interface EntityHit {
  entity: CombatEntity;
  distance: number;
  point: THREE.Vector3;
}

function box(
  size: [number, number, number],
  color: number,
  position: [number, number, number],
): THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial> {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.baseColor = color;
  return mesh;
}

function createNameplate(name: string, accent: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;
  context.fillStyle = 'rgba(18, 20, 18, .82)';
  context.fillRect(8, 8, 240, 44);
  context.strokeStyle = accent;
  context.lineWidth = 3;
  context.strokeRect(8, 8, 240, 44);
  context.fillStyle = '#f4f0df';
  context.font = '700 22px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(name, 128, 30);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.position.set(0, 2.85, 0);
  sprite.scale.set(2.2, 0.55, 1);
  sprite.renderOrder = 8;
  return sprite;
}

export class CombatEntity {
  readonly group = new THREE.Group();
  readonly maxHealth: number;
  health: number;
  readonly name: string;
  readonly kind: EntityKind;
  private readonly leftArm: THREE.Mesh;
  private readonly rightArm: THREE.Mesh;
  private readonly leftLeg: THREE.Mesh;
  private readonly rightLeg: THREE.Mesh;
  private attackTimer = 0;
  private hurtTimer = 0;
  private deathTimer = 0;
  private walkTime = 0;
  private wanderAngle = 0;
  private wanderTimer = 0;
  private knockback = new THREE.Vector3();

  constructor(kind: EntityKind, name: string, position: THREE.Vector3) {
    this.kind = kind;
    this.name = name;
    this.maxHealth = kind === 'brute' ? 28 : kind === 'rival' ? 24 : 18;
    this.health = this.maxHealth;
    this.group.position.copy(position);
    this.group.name = name;

    const skin = kind === 'rival' ? 0xb98b6b : kind === 'brute' ? 0x597550 : 0x6f9661;
    const shirt = kind === 'rival' ? 0x3e5870 : kind === 'brute' ? 0x5b3a31 : 0x496d6b;
    const legs = kind === 'rival' ? 0x2a343c : 0x36384c;
    const eye = kind === 'rival' ? 0xd8d3b8 : 0xb7d16e;

    const body = box([0.75, 0.9, 0.4], shirt, [0, 1.35, 0]);
    const head = box([0.68, 0.68, 0.68], skin, [0, 2.13, 0]);
    const eyeLeft = box([0.12, 0.08, 0.02], eye, [-0.17, 2.2, -0.35]);
    const eyeRight = box([0.12, 0.08, 0.02], eye, [0.17, 2.2, -0.35]);
    this.leftArm = box([0.25, 0.95, 0.3], skin, [-0.51, 1.34, 0]);
    this.rightArm = box([0.25, 0.95, 0.3], skin, [0.51, 1.34, 0]);
    this.leftLeg = box([0.31, 0.9, 0.34], legs, [-0.2, 0.47, 0]);
    this.rightLeg = box([0.31, 0.9, 0.34], legs, [0.2, 0.47, 0]);

    if (kind !== 'rival') {
      this.leftArm.rotation.x = -Math.PI / 2;
      this.rightArm.rotation.x = -Math.PI / 2;
      this.leftArm.position.z = -0.38;
      this.rightArm.position.z = -0.38;
    } else {
      const sword = box([0.12, 0.85, 0.16], 0x9ba5a2, [0.51, 0.7, -0.3]);
      sword.rotation.x = -0.32;
      this.group.add(sword);
    }

    const accent = kind === 'rival' ? '#c99950' : kind === 'brute' ? '#9c6049' : '#728f5a';
    this.group.add(body, head, eyeLeft, eyeRight, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
    this.group.add(createNameplate(name, accent));
    this.group.scale.setScalar(kind === 'brute' ? 1.12 : 0.9);
    this.group.traverse((object) => {
      object.userData.combatEntity = this;
    });
  }

  update(
    delta: number,
    playerPosition: THREE.Vector3,
    world: VoxelWorld,
    damagePlayer: (amount: number, source: string) => void,
  ): boolean {
    this.attackTimer = Math.max(0, this.attackTimer - delta);
    this.hurtTimer = Math.max(0, this.hurtTimer - delta);

    if (this.health <= 0) {
      this.deathTimer += delta;
      this.group.rotation.z = Math.min(Math.PI / 2, this.deathTimer * 2.8);
      this.group.scale.multiplyScalar(Math.max(0.92, 1 - delta * 0.7));
      return this.deathTimer < 1.4;
    }

    const offset = playerPosition.clone().sub(this.group.position);
    offset.y = 0;
    const distance = offset.length();
    let moving = false;

    if (distance < GAME_CONFIG.mobs.aggroRange) {
      const direction = offset.normalize();
      const speed = this.kind === 'rival' ? 2.7 : this.kind === 'brute' ? 1.65 : 2.05;
      if (distance > GAME_CONFIG.combat.enemyReach) {
        const next = this.group.position.clone().addScaledVector(direction, speed * delta);
        const surface = world.getSurfaceHeight(next.x, next.z) + 0.5;
        if (Math.abs(surface - this.group.position.y) < 1.25) {
          this.group.position.x = next.x;
          this.group.position.z = next.z;
          this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, surface, delta * 10);
        }
        moving = true;
      } else if (this.attackTimer <= 0) {
        this.attackTimer = this.kind === 'rival' ? 0.9 : 1.15;
        this.rightArm.rotation.x = -2.1;
        damagePlayer(
          this.kind === 'rival' ? GAME_CONFIG.combat.rivalDamage : GAME_CONFIG.combat.monsterDamage,
          this.name,
        );
      }
      this.group.rotation.y = Math.atan2(direction.x, direction.z) + Math.PI;
    } else {
      this.wanderTimer -= delta;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 2 + Math.random() * 3;
        this.wanderAngle += (Math.random() - 0.5) * 2.2;
      }
      if (this.wanderTimer > 1) {
        const direction = new THREE.Vector3(Math.sin(this.wanderAngle), 0, Math.cos(this.wanderAngle));
        const next = this.group.position.clone().addScaledVector(direction, delta * 0.55);
        const surface = world.getSurfaceHeight(next.x, next.z) + 0.5;
        if (Math.abs(surface - this.group.position.y) < 1) {
          this.group.position.x = next.x;
          this.group.position.z = next.z;
          this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, surface, delta * 8);
          this.group.rotation.y = this.wanderAngle + Math.PI;
          moving = true;
        }
      }
    }

    if (this.knockback.lengthSq() > 0.001) {
      this.group.position.addScaledVector(this.knockback, delta);
      this.knockback.multiplyScalar(Math.max(0, 1 - delta * 8));
    }

    if (moving) this.walkTime += delta * (this.kind === 'rival' ? 9 : 7);
    const swing = moving ? Math.sin(this.walkTime) * 0.65 : 0;
    this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, swing, delta * 12);
    this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, -swing, delta * 12);
    const baseArm = this.kind === 'rival' ? 0 : -Math.PI / 2;
    this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, baseArm - swing * 0.65, delta * 10);
    this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, baseArm + swing * 0.65, delta * 7);

    if (this.hurtTimer > 0) {
      this.group.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshLambertMaterial) {
          object.material.emissive.setHex(0x7d1717);
        }
      });
    } else {
      this.group.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshLambertMaterial) {
          object.material.emissive.setHex(0x000000);
        }
      });
    }
    return true;
  }

  damage(amount: number, from: THREE.Vector3): boolean {
    if (this.health <= 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.hurtTimer = 0.2;
    const direction = this.group.position.clone().sub(from).setY(0).normalize();
    this.knockback.copy(direction.multiplyScalar(4));
    return this.health <= 0;
  }
}

export class EntityManager {
  readonly group = new THREE.Group();
  readonly entities: CombatEntity[] = [];

  constructor(private readonly scene: THREE.Scene, private readonly world: VoxelWorld) {
    this.group.name = 'Creatures';
    this.scene.add(this.group);
    this.spawnInitialEntities();
  }

  private spawnInitialEntities(): void {
    const spawnPoints: Array<[number, number, EntityKind, string]> = [
      [-9, -7, 'zombie', 'WANDERER'],
      [10, -6, 'brute', 'HUSK'],
      [-12, 8, 'zombie', 'ROTTEN'],
      [8, 11, 'brute', 'CRUSHER'],
      [14, 3, 'zombie', 'DUSKWALKER'],
      [-7, 12, 'rival', 'RAIDER 01'],
      [12, -12, 'rival', 'RAIDER 02'],
    ];

    for (const [x, z, kind, name] of spawnPoints) {
      const y = this.world.getSurfaceHeight(x, z) + 0.5;
      const entity = new CombatEntity(kind, name, new THREE.Vector3(x, y, z));
      this.entities.push(entity);
      this.group.add(entity.group);
    }
  }

  update(
    delta: number,
    playerPosition: THREE.Vector3,
    damagePlayer: (amount: number, source: string) => void,
  ): void {
    for (let index = this.entities.length - 1; index >= 0; index -= 1) {
      const entity = this.entities[index];
      const alive = entity.update(delta, playerPosition, this.world, damagePlayer);
      if (!alive) {
        this.group.remove(entity.group);
        this.entities.splice(index, 1);
      }
    }
  }

  raycast(raycaster: THREE.Raycaster): EntityHit | null {
    const hits = raycaster.intersectObject(this.group, true);
    for (const hit of hits) {
      const entity = hit.object.userData.combatEntity as CombatEntity | undefined;
      if (entity && entity.health > 0) return { entity, distance: hit.distance, point: hit.point };
    }
    return null;
  }
}
