import * as THREE from 'three';
import { BLOCKS, GAME_CONFIG, HOTBAR, type BlockType, type GameMode } from './config';
import { EntityManager, type CombatEntity } from './entities';
import { createCrackTextures } from './textures';
import { VoxelWorld, type BlockHit } from './world';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

interface TargetInfo {
  block: BlockHit | null;
  entity: { entity: CombatEntity; distance: number; point: THREE.Vector3 } | null;
}

export class Game {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(72, 1, 0.05, 140);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly world: VoxelWorld;
  private readonly entities: EntityManager;
  private readonly raycaster = new THREE.Raycaster();
  private readonly clock = new THREE.Clock();
  private readonly keys = new Set<string>();
  private readonly playerPosition = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private readonly particles: Particle[] = [];
  private crackMesh!: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
  private readonly crackTextures = createCrackTextures();
  private readonly hand = new THREE.Group();
  private readonly clouds = new THREE.Group();
  private readonly inventory = new Map<BlockType, number>();
  private mode: GameMode = 'survival';
  private selectedSlot = 0;
  private health: number = GAME_CONFIG.player.maxHealth;
  private yaw = 0;
  private pitch = 0;
  private grounded = false;
  private started = false;
  private paused = true;
  private mining = false;
  private miningKey = '';
  private miningProgress = 0;
  private attackCooldown = 0;
  private invulnerability = 0;
  private handSwing = 0;
  private walkTime = 0;
  private elapsed = 0;
  private touchMove = new THREE.Vector2();
  private touchLookId: number | null = null;
  private touchLookLast = new THREE.Vector2();
  private joystickId: number | null = null;
  private readonly isTouch = window.matchMedia('(pointer: coarse)').matches;
  private audioContext: AudioContext | null = null;

  private readonly hud = document.querySelector<HTMLElement>('#hud')!;
  private readonly startScreen = document.querySelector<HTMLElement>('#start-screen')!;
  private readonly pauseScreen = document.querySelector<HTMLElement>('#pause-screen')!;
  private readonly hearts = document.querySelector<HTMLElement>('#hearts')!;
  private readonly creativeStatus = document.querySelector<HTMLElement>('#creative-status')!;
  private readonly modeLabel = document.querySelector<HTMLElement>('#mode-label')!;
  private readonly modeButton = document.querySelector<HTMLButtonElement>('#mode-button')!;
  private readonly coordinates = document.querySelector<HTMLElement>('#coordinates')!;
  private readonly targetLabel = document.querySelector<HTMLElement>('#target-label')!;
  private readonly breakProgress = document.querySelector<HTMLElement>('#break-progress')!;
  private readonly hotbar = document.querySelector<HTMLElement>('#hotbar')!;
  private readonly toastStack = document.querySelector<HTMLElement>('#toast-stack')!;
  private readonly bossBar = document.querySelector<HTMLElement>('#boss-bar')!;
  private readonly bossName = document.querySelector<HTMLElement>('#boss-name')!;
  private readonly bossHealth = document.querySelector<HTMLElement>('#boss-health')!;
  private readonly bossHealthLabel = document.querySelector<HTMLElement>('#boss-health-label')!;

  constructor(private readonly container: HTMLDivElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    this.setupScene();
    this.world = new VoxelWorld(this.scene);
    this.entities = new EntityManager(this.scene, this.world);
    this.setupPlayer();
    this.setupUI();
    this.bindEvents();
    this.resize();
    this.animate();
  }

  private setupScene(): void {
    this.scene.background = new THREE.Color(0x87a9bf);
    this.scene.fog = new THREE.Fog(0x87a9bf, 23, 62);

    const hemisphere = new THREE.HemisphereLight(0xb7d1db, 0x4b5141, 1.75);
    this.scene.add(hemisphere);

    const sun = new THREE.DirectionalLight(0xffefc2, 2.35);
    sun.position.set(-24, 35, -18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150),
      new THREE.MeshLambertMaterial({ color: 0x4f8294, transparent: true, opacity: 0.82 }),
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = 2.15;
    ocean.receiveShadow = true;
    this.scene.add(ocean);

    const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xe8eee8 });
    const cloudGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cloudData = [
      [-18, 19, -22, 9, 1.2, 3], [8, 22, -28, 12, 1.1, 3], [24, 17, 5, 8, 1.3, 2.5], [-26, 21, 14, 11, 1, 3],
    ];
    cloudData.forEach(([x, y, z, sx, sy, sz]) => {
      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
      cloud.position.set(x, y, z);
      cloud.scale.set(sx, sy, sz);
      this.clouds.add(cloud);
    });
    this.scene.add(this.clouds);
  }

  private setupPlayer(): void {
    const spawnY = this.world.getSurfaceHeight(0, 0) + 0.51;
    this.playerPosition.set(0, spawnY, 0);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    const sleeve = new THREE.MeshLambertMaterial({ color: 0x405f6f });
    const skin = new THREE.MeshLambertMaterial({ color: 0xc79370 });
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.48, 0.2), sleeve);
    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.21), skin);
    arm.position.y = 0.12;
    fist.position.y = -0.22;
    this.hand.add(arm, fist);
    this.hand.position.set(0.58, -0.46, -0.78);
    this.hand.rotation.set(-0.28, -0.3, -0.1);
    this.camera.add(this.hand);

    const crackMaterial = new THREE.MeshBasicMaterial({
      map: this.crackTextures[0],
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.012, 1.012, 1.012), crackMaterial);
    this.crackMesh.visible = false;
    this.crackMesh.renderOrder = 3;
    this.scene.add(this.crackMesh);

    HOTBAR.forEach((type) => this.inventory.set(type, type === 'brick' ? 12 : 24));
    this.updateCamera();
  }

  private setupUI(): void {
    this.hotbar.innerHTML = '';
    HOTBAR.forEach((type, index) => {
      const button = document.createElement('button');
      button.className = 'hotbar-slot';
      button.dataset.slot = String(index);
      button.innerHTML = `<span class="slot-number">${index + 1}</span><i class="block-icon block-${type}"></i><small>${this.inventory.get(type)}</small>`;
      button.title = BLOCKS[type].label;
      button.addEventListener('click', () => this.selectSlot(index));
      this.hotbar.appendChild(button);
    });

    this.hearts.innerHTML = Array.from({ length: 10 }, () => '<i class="heart"><b></b></i>').join('');
    this.updateModeUI();
    this.updateHealthUI();
    this.updateHotbar();
  }

  private bindEvents(): void {
    document.querySelector('#play-button')?.addEventListener('click', () => this.start());
    document.querySelector('#resume-button')?.addEventListener('click', () => this.resume());
    document.querySelector('#reset-button')?.addEventListener('click', () => window.location.reload());
    this.modeButton.addEventListener('click', () => this.toggleMode());

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    document.addEventListener('mousemove', (event) => this.onMouseMove(event));
    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => this.keys.delete(event.code));
    this.renderer.domElement.addEventListener('mousedown', (event) => this.onPointerDown(event));
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.stopMining();
    });
    this.renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
    this.renderer.domElement.addEventListener('wheel', (event) => {
      if (!this.started) return;
      const direction = Math.sign(event.deltaY);
      this.selectSlot((this.selectedSlot + direction + HOTBAR.length) % HOTBAR.length);
    }, { passive: true });

    this.bindTouchControls();
  }

  private bindTouchControls(): void {
    const joystick = document.querySelector<HTMLElement>('#joystick')!;
    const knob = joystick.querySelector<HTMLElement>('i')!;
    const lookZone = document.querySelector<HTMLElement>('#look-zone')!;
    const jump = document.querySelector<HTMLButtonElement>('#mobile-jump')!;
    const breakButton = document.querySelector<HTMLButtonElement>('#mobile-break')!;
    const placeButton = document.querySelector<HTMLButtonElement>('#mobile-place')!;

    const updateStick = (event: PointerEvent) => {
      const bounds = joystick.getBoundingClientRect();
      const x = THREE.MathUtils.clamp((event.clientX - (bounds.left + bounds.width / 2)) / 42, -1, 1);
      const y = THREE.MathUtils.clamp((event.clientY - (bounds.top + bounds.height / 2)) / 42, -1, 1);
      this.touchMove.set(x, y);
      knob.style.transform = `translate(${x * 28}px, ${y * 28}px)`;
    };

    joystick.addEventListener('pointerdown', (event) => {
      this.joystickId = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      updateStick(event);
    });
    joystick.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.joystickId) updateStick(event);
    });
    const releaseStick = (event: PointerEvent) => {
      if (event.pointerId !== this.joystickId) return;
      this.joystickId = null;
      this.touchMove.set(0, 0);
      knob.style.transform = 'translate(0, 0)';
    };
    joystick.addEventListener('pointerup', releaseStick);
    joystick.addEventListener('pointercancel', releaseStick);

    lookZone.addEventListener('pointerdown', (event) => {
      this.touchLookId = event.pointerId;
      this.touchLookLast.set(event.clientX, event.clientY);
      lookZone.setPointerCapture(event.pointerId);
    });
    lookZone.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.touchLookId) return;
      this.yaw -= (event.clientX - this.touchLookLast.x) * 0.006;
      this.pitch -= (event.clientY - this.touchLookLast.y) * 0.006;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.52, 1.52);
      this.touchLookLast.set(event.clientX, event.clientY);
    });
    lookZone.addEventListener('pointerup', () => { this.touchLookId = null; });

    jump.addEventListener('pointerdown', () => {
      if (this.mode === 'creative') this.keys.add('Space');
      else this.tryJump();
    });
    jump.addEventListener('pointerup', () => this.keys.delete('Space'));
    breakButton.addEventListener('pointerdown', () => this.primaryAction());
    breakButton.addEventListener('pointerup', () => this.stopMining());
    breakButton.addEventListener('pointercancel', () => this.stopMining());
    placeButton.addEventListener('pointerdown', () => this.placeBlock());
  }

  private start(): void {
    this.started = true;
    this.initAudio();
    if (this.isTouch) {
      this.paused = false;
      this.startScreen.classList.remove('active');
      this.hud.classList.remove('hidden');
      return;
    }
    this.renderer.domElement.requestPointerLock();
  }

  private resume(): void {
    if (this.isTouch) {
      this.paused = false;
      this.pauseScreen.classList.remove('active');
    } else {
      this.renderer.domElement.requestPointerLock();
    }
  }

  private onPointerLockChange(): void {
    if (document.pointerLockElement === this.renderer.domElement) {
      this.paused = false;
      this.startScreen.classList.remove('active');
      this.pauseScreen.classList.remove('active');
      this.hud.classList.remove('hidden');
      this.clock.getDelta();
    } else if (this.started && !this.isTouch) {
      this.paused = true;
      this.pauseScreen.classList.add('active');
      this.stopMining();
      this.keys.clear();
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (document.pointerLockElement !== this.renderer.domElement || this.paused) return;
    this.yaw -= event.movementX * 0.0022;
    this.pitch -= event.movementY * 0.0022;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.52, 1.52);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.started || this.paused) return;
    this.keys.add(event.code);
    if (event.code === 'Space' && this.mode === 'survival' && !event.repeat) this.tryJump();
    if (event.code === 'KeyG' && !event.repeat) this.toggleMode();
    if (/^Digit[1-6]$/.test(event.code)) this.selectSlot(Number(event.code.at(-1)) - 1);
  }

  private onPointerDown(event: MouseEvent): void {
    if (!this.started || this.paused || this.isTouch) return;
    if (document.pointerLockElement !== this.renderer.domElement && !this.isTouch) {
      this.renderer.domElement.requestPointerLock();
      return;
    }
    if (event.button === 0) this.primaryAction();
    if (event.button === 2) this.placeBlock();
  }

  private primaryAction(): void {
    if (this.paused) return;
    const target = this.getTarget();
    if (target.entity && (!target.block || target.entity.distance < target.block.distance)) {
      this.attackEntity(target.entity.entity);
      return;
    }
    if (!target.block) return;
    if (this.mode === 'creative') {
      this.breakBlock(target.block);
    } else {
      this.mining = true;
      this.miningKey = '';
      this.updateMining(0);
    }
  }

  private attackEntity(entity: CombatEntity): void {
    if (this.attackCooldown > 0) return;
    this.attackCooldown = GAME_CONFIG.combat.attackCooldown;
    this.handSwing = 1;
    const killed = entity.damage(GAME_CONFIG.combat.playerDamage, this.playerPosition);
    this.playSound('hit');
    this.spawnParticles(entity.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), '#9b3430', 7);
    this.showToast(killed ? `${entity.name} BESIEGT` : `${entity.name}  -${GAME_CONFIG.combat.playerDamage}`, killed ? 'success' : 'neutral');
  }

  private placeBlock(): void {
    if (this.paused) return;
    const target = this.getTarget().block;
    if (!target) return;
    const type = HOTBAR[this.selectedSlot];
    const x = target.x + Math.round(target.normal.x);
    const y = target.y + Math.round(target.normal.y);
    const z = target.z + Math.round(target.normal.z);
    if (this.world.hasBlock(x, y, z) || this.blockOverlapsPlayer(x, y, z)) return;
    const count = this.inventory.get(type) ?? 0;
    if (this.mode === 'survival' && count <= 0) {
      this.showToast('KEINE BLÖCKE MEHR', 'danger');
      return;
    }
    this.world.setBlock(x, y, z, type);
    if (this.mode === 'survival') this.inventory.set(type, count - 1);
    this.handSwing = 0.72;
    this.playSound('place');
    this.updateHotbar();
  }

  private breakBlock(block: BlockHit): void {
    const removed = this.world.removeBlock(block.x, block.y, block.z);
    if (!removed) return;
    if (this.mode === 'survival') this.inventory.set(removed, (this.inventory.get(removed) ?? 0) + 1);
    this.spawnParticles(new THREE.Vector3(block.x, block.y, block.z), BLOCKS[removed].color, 12);
    this.handSwing = 1;
    this.playSound('break');
    this.updateHotbar();
    this.stopMining();
  }

  private stopMining(): void {
    this.mining = false;
    this.miningKey = '';
    this.miningProgress = 0;
    this.crackMesh.visible = false;
    this.breakProgress.classList.remove('active');
    const bar = this.breakProgress.querySelector<HTMLElement>('span');
    if (bar) bar.style.width = '0%';
  }

  private updateMining(delta: number): void {
    if (!this.mining || this.mode === 'creative') return;
    const target = this.getTarget().block;
    if (!target) {
      this.stopMining();
      return;
    }
    const key = `${target.x},${target.y},${target.z}`;
    if (key !== this.miningKey) {
      this.miningKey = key;
      this.miningProgress = 0;
    }
    this.miningProgress += delta / BLOCKS[target.type].hardness;
    const stage = Math.min(5, Math.floor(this.miningProgress * 6));
    this.crackMesh.position.set(target.x, target.y, target.z);
    this.crackMesh.material.map = this.crackTextures[stage];
    this.crackMesh.material.needsUpdate = true;
    this.crackMesh.visible = true;
    this.breakProgress.classList.add('active');
    const bar = this.breakProgress.querySelector<HTMLElement>('span');
    if (bar) bar.style.width = `${Math.min(100, this.miningProgress * 100)}%`;
    this.handSwing = Math.max(this.handSwing, 0.45);
    if (this.miningProgress >= 1) this.breakBlock(target);
  }

  private getTarget(): TargetInfo {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = GAME_CONFIG.player.reach;
    const blockIntersection = this.raycaster.intersectObjects(this.world.meshes, false)[0];
    const block = blockIntersection ? this.world.resolveHit(blockIntersection) : null;
    const entity = this.entities.raycast(this.raycaster);
    return {
      block: block && block.distance <= GAME_CONFIG.player.reach ? block : null,
      entity: entity && entity.distance <= GAME_CONFIG.player.reach ? entity : null,
    };
  }

  private updateTargetUI(): void {
    const target = this.getTarget();
    if (target.entity && (!target.block || target.entity.distance < target.block.distance)) {
      const entity = target.entity.entity;
      this.targetLabel.textContent = `${entity.kind === 'rival' ? 'PVP' : 'MONSTER'} · ${entity.name}`;
      this.targetLabel.classList.add('active', 'hostile');
      this.bossName.textContent = entity.name;
      this.bossHealthLabel.textContent = `${entity.health} / ${entity.maxHealth}`;
      this.bossHealth.style.width = `${(entity.health / entity.maxHealth) * 100}%`;
      this.bossBar.classList.remove('hidden');
    } else if (target.block) {
      this.targetLabel.textContent = BLOCKS[target.block.type].label.toUpperCase();
      this.targetLabel.classList.add('active');
      this.targetLabel.classList.remove('hostile');
      this.bossBar.classList.add('hidden');
    } else {
      this.targetLabel.classList.remove('active', 'hostile');
      this.bossBar.classList.add('hidden');
    }
  }

  private tryJump(): void {
    if (this.grounded) {
      this.velocity.y = GAME_CONFIG.player.jumpForce;
      this.grounded = false;
      this.playSound('jump');
    }
  }

  private updatePlayer(delta: number): void {
    const inputForward = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0) - this.touchMove.y;
    const inputRight = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0) + this.touchMove.x;
    const input = new THREE.Vector2(inputRight, inputForward);
    if (input.lengthSq() > 1) input.normalize();

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const direction = forward.multiplyScalar(input.y).add(right.multiplyScalar(input.x));
    const sprinting = this.keys.has('ShiftLeft') && this.mode === 'survival' && inputForward > 0;
    const speed = this.mode === 'creative'
      ? GAME_CONFIG.player.creativeSpeed
      : sprinting ? GAME_CONFIG.player.sprintSpeed : GAME_CONFIG.player.walkSpeed;
    const move = direction.multiplyScalar(speed * delta);

    if (this.mode === 'creative') {
      const vertical = (this.keys.has('Space') ? 1 : 0) - (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 1 : 0);
      move.y = vertical * speed * delta;
      this.velocity.y = 0;
      this.moveAxis('x', move.x);
      this.moveAxis('z', move.z);
      this.moveAxis('y', move.y);
    } else {
      this.velocity.y -= GAME_CONFIG.player.gravity * delta;
      this.moveAxis('x', move.x);
      this.moveAxis('z', move.z);
      const fallingSpeed = this.velocity.y;
      const collidedY = this.moveAxis('y', this.velocity.y * delta);
      if (collidedY) {
        if (fallingSpeed < -13) this.damagePlayer(Math.min(8, Math.floor((-fallingSpeed - 9) / 2)), 'STURZ');
        this.grounded = fallingSpeed < 0;
        this.velocity.y = 0;
      } else {
        this.grounded = false;
      }
    }

    const moving = input.lengthSq() > 0.02 && (this.grounded || this.mode === 'creative');
    if (moving) this.walkTime += delta * (sprinting ? 13 : 9);
    this.updateCamera(moving ? Math.sin(this.walkTime) * (sprinting ? 0.045 : 0.025) : 0);

    if (this.playerPosition.y < -10) this.respawn('LEERE');
  }

  private moveAxis(axis: 'x' | 'y' | 'z', amount: number): boolean {
    if (amount === 0) return false;
    const steps = Math.max(1, Math.ceil(Math.abs(amount) / 0.22));
    const step = amount / steps;
    for (let index = 0; index < steps; index += 1) {
      this.playerPosition[axis] += step;
      if (this.playerCollides(this.playerPosition)) {
        this.playerPosition[axis] -= step;
        return true;
      }
    }
    return false;
  }

  private playerCollides(position: THREE.Vector3): boolean {
    const radius = GAME_CONFIG.player.radius;
    const minX = Math.floor(position.x - radius - 0.5);
    const maxX = Math.ceil(position.x + radius + 0.5);
    const minY = Math.floor(position.y - 0.5);
    const maxY = Math.ceil(position.y + GAME_CONFIG.player.height + 0.5);
    const minZ = Math.floor(position.z - radius - 0.5);
    const maxZ = Math.ceil(position.z + radius + 0.5);

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          if (!this.world.hasBlock(x, y, z)) continue;
          if (
            position.x + radius > x - 0.5 && position.x - radius < x + 0.5 &&
            position.y + GAME_CONFIG.player.height > y - 0.5 && position.y < y + 0.5 &&
            position.z + radius > z - 0.5 && position.z - radius < z + 0.5
          ) return true;
        }
      }
    }
    return false;
  }

  private blockOverlapsPlayer(x: number, y: number, z: number): boolean {
    const radius = GAME_CONFIG.player.radius;
    return this.playerPosition.x + radius > x - 0.5 && this.playerPosition.x - radius < x + 0.5 &&
      this.playerPosition.y + GAME_CONFIG.player.height > y - 0.5 && this.playerPosition.y < y + 0.5 &&
      this.playerPosition.z + radius > z - 0.5 && this.playerPosition.z - radius < z + 0.5;
  }

  private updateCamera(bob = 0): void {
    this.camera.position.set(
      this.playerPosition.x,
      this.playerPosition.y + GAME_CONFIG.player.eyeHeight + bob,
      this.playerPosition.z,
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  private damagePlayer(amount: number, source: string): void {
    if (this.mode === 'creative' || this.invulnerability > 0 || amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
    this.invulnerability = 0.62;
    this.updateHealthUI();
    this.playSound('hurt');
    const flash = document.querySelector<HTMLElement>('#damage-flash')!;
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
    this.showToast(`${source}  -${amount} LEBEN`, 'danger');
    if (this.health <= 0) this.respawn(source);
  }

  private respawn(source: string): void {
    this.health = GAME_CONFIG.player.maxHealth;
    this.velocity.set(0, 0, 0);
    this.playerPosition.set(0, this.world.getSurfaceHeight(0, 0) + 0.51, 0);
    this.updateHealthUI();
    this.showToast(`BESIEGT VON ${source} · RESPAWN`, 'danger');
  }

  private toggleMode(): void {
    this.mode = this.mode === 'survival' ? 'creative' : 'survival';
    this.velocity.set(0, 0, 0);
    this.stopMining();
    this.updateModeUI();
    this.updateHotbar();
    this.showToast(this.mode === 'creative' ? 'KREATIVMODUS · FLUG AKTIV' : 'SURVIVALMODUS · SCHADEN AKTIV', 'success');
    this.playSound('mode');
  }

  private updateModeUI(): void {
    const creative = this.mode === 'creative';
    this.modeLabel.textContent = creative ? 'CREATIVE' : 'SURVIVAL';
    this.modeButton.classList.toggle('creative', creative);
    this.hearts.classList.toggle('hidden', creative);
    this.creativeStatus.classList.toggle('hidden', !creative);
    document.body.dataset.mode = this.mode;
  }

  private updateHealthUI(): void {
    [...this.hearts.querySelectorAll<HTMLElement>('.heart')].forEach((heart, index) => {
      heart.classList.toggle('empty', this.health <= index * 2);
      heart.classList.toggle('half', this.health === index * 2 + 1);
    });
  }

  private selectSlot(index: number): void {
    this.selectedSlot = THREE.MathUtils.clamp(index, 0, HOTBAR.length - 1);
    this.updateHotbar();
    this.playSound('select');
  }

  private updateHotbar(): void {
    [...this.hotbar.querySelectorAll<HTMLElement>('.hotbar-slot')].forEach((slot, index) => {
      slot.classList.toggle('selected', index === this.selectedSlot);
      const count = slot.querySelector<HTMLElement>('small');
      if (count) count.textContent = this.mode === 'creative' ? '∞' : String(this.inventory.get(HOTBAR[index]) ?? 0);
    });
  }

  private spawnParticles(position: THREE.Vector3, color: string, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.1 + Math.random() * 0.09, 0.1 + Math.random() * 0.09, 0.1 + Math.random() * 0.09),
        new THREE.MeshLambertMaterial({ color }),
      );
      mesh.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5));
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 3.5, 1.5 + Math.random() * 3, (Math.random() - 0.5) * 3.5),
        life: 0.55 + Math.random() * 0.35,
      });
    }
  }

  private updateParticles(delta: number): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life -= delta;
      particle.velocity.y -= 9 * delta;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.mesh.rotation.x += delta * 7;
      particle.mesh.rotation.y += delta * 5;
      particle.mesh.scale.setScalar(Math.max(0, particle.life * 1.4));
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        this.particles.splice(index, 1);
      }
    }
  }

  private showToast(message: string, variant: 'neutral' | 'danger' | 'success'): void {
    const toast = document.createElement('div');
    toast.className = `toast ${variant}`;
    toast.textContent = message;
    this.toastStack.appendChild(toast);
    window.setTimeout(() => toast.classList.add('leaving'), 1700);
    window.setTimeout(() => toast.remove(), 2100);
  }

  private initAudio(): void {
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (this.audioContext.state === 'suspended') void this.audioContext.resume();
  }

  private playSound(type: 'hit' | 'hurt' | 'break' | 'place' | 'jump' | 'mode' | 'select'): void {
    if (!this.audioContext) return;
    const frequencies: Record<typeof type, [number, number, number]> = {
      hit: [115, 72, 0.11], hurt: [88, 48, 0.2], break: [160, 78, 0.14], place: [95, 130, 0.09],
      jump: [130, 170, 0.08], mode: [220, 390, 0.16], select: [260, 290, 0.04],
    };
    const [start, end, duration] = frequencies[type];
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = type === 'mode' ? 'square' : 'triangle';
    oscillator.frequency.setValueAtTime(start, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), this.audioContext.currentTime + duration);
    gain.gain.setValueAtTime(0.045, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    oscillator.connect(gain).connect(this.audioContext.destination);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private updateHand(delta: number): void {
    this.handSwing = Math.max(0, this.handSwing - delta * (this.mining ? 4 : 5.5));
    const swing = Math.sin((1 - this.handSwing) * Math.PI);
    this.hand.rotation.x = -0.28 - swing * 0.9;
    this.hand.rotation.y = -0.3 - swing * 0.25;
    this.hand.position.y = -0.46 - swing * 0.12;
    if (this.mining && this.handSwing <= 0.02) this.handSwing = 0.62;
  }

  private updateWorldAtmosphere(delta: number): void {
    this.elapsed += delta;
    this.clouds.position.x = ((this.elapsed * 0.35 + 45) % 90) - 45;
    const dayPhase = (this.elapsed % GAME_CONFIG.dayDuration) / GAME_CONFIG.dayDuration;
    const daylight = 0.84 + Math.sin(dayPhase * Math.PI * 2) * 0.1;
    this.renderer.toneMappingExposure = daylight + 0.2;
  }

  private updateHUD(): void {
    this.coordinates.textContent = `X ${Math.round(this.playerPosition.x)}   Y ${Math.round(this.playerPosition.y)}   Z ${Math.round(this.playerPosition.z)}`;
    this.updateTargetUI();
  }

  private resize(): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.033);
    if (this.started && !this.paused) {
      this.attackCooldown = Math.max(0, this.attackCooldown - delta);
      this.invulnerability = Math.max(0, this.invulnerability - delta);
      this.updatePlayer(delta);
      this.updateMining(delta);
      this.entities.update(delta, this.playerPosition, (amount, source) => this.damagePlayer(amount, source));
      this.updateParticles(delta);
      this.updateHand(delta);
      this.updateWorldAtmosphere(delta);
      this.updateHUD();
    } else {
      this.clouds.position.x += delta * 0.2;
    }
    this.renderer.render(this.scene, this.camera);
  };
}
