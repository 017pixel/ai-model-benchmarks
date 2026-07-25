import * as THREE from 'three'
import { moveAndCollide } from './physics.js'
import { isSolid } from './blocks.js'

const BOX = { hx: 0.3, hz: 0.3, height: 1.8 }
const GRAVITY = 26
const EYE = 1.62
const WALK = 4.6
const FLY = 7.5

export class Player {
  constructor(world, spawn) {
    this.world = world
    this.pos = spawn.clone()
    this.pos.y += 0.1
    this.vel = new THREE.Vector3()
    this.yaw = 0
    this.pitch = 0
    this.onGround = false
    this.mode = 'survival'
    this.health = 20
    this.maxHealth = 20
    this.lastDamage = 0
    this.attackTimer = 0
    this.armSwing = 0
  }

  forward() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)) }
  right() { return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)) }

  toggleMode() {
    this.mode = this.mode === 'survival' ? 'creative' : 'survival'
    if (this.mode === 'creative') { this.vel.y = 0; this.flyVel = 0 }
    return this.mode
  }

  damage(amount, now) {
    if (this.mode === 'creative') return
    this.health -= amount
    this.lastDamage = now
    if (this.health <= 0) this.respawn()
  }
  respawn() {
    this.pos.copy(this.world.spawn)
    this.pos.y += 0.1
    this.vel.set(0, 0, 0)
    this.health = this.maxHealth
  }

  update(dt, input, now) {
    const fwd = this.forward()
    const rgt = this.right()
    const wish = new THREE.Vector3()
    if (input.has('KeyW')) wish.add(fwd)
    if (input.has('KeyS')) wish.sub(fwd)
    if (input.has('KeyD')) wish.add(rgt)
    if (input.has('KeyA')) wish.sub(rgt)
    if (wish.lengthSq() > 0) wish.normalize()

    if (this.mode === 'creative') {
      this.vel.x = wish.x * FLY
      this.vel.z = wish.z * FLY
      if (input.has('Space')) this.vel.y = FLY
      else if (input.has('ShiftLeft') || input.has('ShiftRight')) this.vel.y = -FLY
      else this.vel.y = 0
    } else {
      this.vel.x = wish.x * WALK
      this.vel.z = wish.z * WALK
      this.vel.y -= GRAVITY * dt
      if (input.has('Space') && this.onGround) { this.vel.y = 9; this.onGround = false }
    }

    this.onGround = moveAndCollide(this.pos, this.vel, dt, this.world, BOX)

    if (this.mode === 'survival' && this.health < this.maxHealth && now - this.lastDamage > 5) {
      this.health = Math.min(this.maxHealth, this.health + dt * 1)
    }
    if (this.attackTimer > 0) this.attackTimer -= dt

    const moving = wish.lengthSq() > 0 && this.onGround
    const target = moving ? 1 : 0
    this.armSwing += (target - this.armSwing) * Math.min(1, dt * 10)
  }

  eyePosition() { return new THREE.Vector3(this.pos.x, this.pos.y + EYE, this.pos.z) }
  aabb() {
    return {
      minX: this.pos.x - BOX.hx, maxX: this.pos.x + BOX.hx,
      minY: this.pos.y, maxY: this.pos.y + BOX.height,
      minZ: this.pos.z - BOX.hz, maxZ: this.pos.z + BOX.hz
    }
  }
}
