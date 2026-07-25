import * as THREE from 'three'
import { moveAndCollide } from './physics.js'

const BOX = { hx: 0.3, hz: 0.3, height: 1.8 }

const SKINS = {
  zombie: { skin: '#6fae4f', shirt: '#3a5a2a', pants: '#2a2a3a', speed: 2.3, dmg: 4, hp: 20 },
  player: { skin: '#c98f63', shirt: '#3a7bd5', pants: '#22336a', speed: 2.8, dmg: 3, hp: 20 }
}

function buildMesh(type) {
  const s = SKINS[type]
  const g = new THREE.Group()
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c })
  const parts = {}
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), mat(s.pants))
  const legR = legL.clone()
  legL.position.set(-0.12, 0.375, 0); legR.position.set(0.12, 0.375, 0)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), mat(s.shirt))
  torso.position.set(0, 1.1, 0)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), mat(s.skin))
  head.position.set(0, 1.675, 0)
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), mat(s.skin))
  const armR = armL.clone()
  armL.position.set(-0.34, 1.1, 0); armR.position.set(0.34, 1.1, 0)
  armL.geometry.translate(0, -0.35, 0); armR.geometry.translate(0, -0.35, 0)
  armL.position.y = 1.45; armR.position.y = 1.45
  legL.geometry.translate(0, -0.375, 0); legR.geometry.translate(0, -0.375, 0)
  legL.position.y = 0.75; legR.position.y = 0.75
  g.add(legL, legR, torso, head, armL, armR)

  // health bar
  const barBg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.12), new THREE.MeshBasicMaterial({ color: 0x111111 }))
  const barFg = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.08), new THREE.MeshBasicMaterial({ color: 0x33cc55 }))
  barFg.position.z = 0.001
  const bar = new THREE.Group(); bar.add(barBg, barFg)
  bar.position.y = 2.15
  g.add(bar)

  parts.legL = legL; parts.legR = legR; parts.armL = armL; parts.armR = armR; parts.head = head
  parts.bar = bar; parts.barFg = barFg
  g.userData.parts = parts
  return g
}

export class Mob {
  constructor(type, world, pos) {
    this.type = type
    this.world = world
    this.def = SKINS[type]
    this.pos = pos.clone()
    this.vel = new THREE.Vector3()
    this.health = this.def.hp
    this.maxHealth = this.def.hp
    this.attackCd = 0
    this.phase = Math.random() * 10
    this.mesh = buildMesh(type)
    this.mesh.userData.mob = this
    this.wander = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
    this.wanderT = 0
    this.lunge = 0
  }

  update(dt, player, camera, now) {
    const to = new THREE.Vector3(player.pos.x - this.pos.x, 0, player.pos.z - this.pos.z)
    const dist = to.length()
    const aggro = dist < 18
    let move = new THREE.Vector3()
    if (aggro && dist > 0.01) move.copy(to).normalize()
    else {
      this.wanderT -= dt
      if (this.wanderT <= 0) { this.wander.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(); this.wanderT = 2 + Math.random() * 2 }
      move.copy(this.wander)
    }
    const speed = this.def.speed * (aggro ? 1 : 0.5)
    this.vel.x = move.x * speed
    this.vel.z = move.z * speed
    this.vel.y -= 26 * dt

    this.onGround = moveAndCollide(this.pos, this.vel, dt, this.world, BOX)
    this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z)

    if (dist > 0.01) {
      const yaw = Math.atan2(move.x, move.z)
      this.mesh.rotation.y = yaw
    }

    // animation
    const moving = (this.vel.x * this.vel.x + this.vel.z * this.vel.z) > 0.5
    this.phase += dt * (moving ? 9 : 2)
    const swing = moving ? Math.sin(this.phase) * 0.7 : Math.sin(this.phase) * 0.05
    const p = this.mesh.userData.parts
    p.legL.rotation.x = swing; p.legR.rotation.x = -swing
    p.armL.rotation.x = -swing; p.armR.rotation.x = swing
    if (this.lunge > 0) { this.lunge -= dt; this.mesh.position.z += Math.sin(this.lunge * 12) * 0.05 }

    // attack
    if (this.attackCd > 0) this.attackCd -= dt
    if (aggro && dist < 1.4 && this.attackCd <= 0) {
      player.damage(this.def.dmg, now)
      this.attackCd = 1.1
      this.lunge = 0.3
    }

    // health bar
    const ratio = Math.max(0, this.health / this.maxHealth)
    p.barFg.scale.x = ratio
    p.barFg.position.x = -0.43 * (1 - ratio)
    p.barFg.material.color.setHSL(ratio * 0.33, 0.7, 0.45)
    p.bar.quaternion.copy(camera.quaternion)
  }

  hit(amount, fromPos) {
    this.health -= amount
    if (fromPos) {
      const d = new THREE.Vector3(this.pos.x - fromPos.x, 0, this.pos.z - fromPos.z).normalize()
      this.vel.x += d.x * 4; this.vel.z += d.z * 4; this.vel.y += 3
    }
  }
  get dead() { return this.health <= 0 }
}

export function spawnMobs(world, scene) {
  const mobs = []
  const rng = (a, b) => a + Math.random() * (b - a)
  const place = () => {
    const x = Math.floor(rng(4, world.W - 4)), z = Math.floor(rng(4, world.D - 4))
    const y = world.surfaceHeight(x, z) + 1
    return new THREE.Vector3(x + 0.5, y, z + 0.5)
  }
  for (let i = 0; i < 6; i++) {
    const m = new Mob('zombie', world, place()); scene.add(m.mesh); mobs.push(m)
  }
  const p = new Mob('player', world, place()); p.mesh.userData.parts.head.material.color.set('#d9a06a')
  scene.add(p.mesh); mobs.push(p)
  return mobs
}
