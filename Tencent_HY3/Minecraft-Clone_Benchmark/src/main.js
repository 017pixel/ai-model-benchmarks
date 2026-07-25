import * as THREE from 'three'
import { World } from './world.js'
import { Player } from './player.js'
import { spawnMobs, Mob } from './mobs.js'
import { UI } from './ui.js'
import { AIR, BLOCKS, HOTBAR, isSolid } from './blocks.js'
import { crackTextures } from './textures.js'

const app = document.getElementById('app')
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87b6e8)
scene.fog = new THREE.Fog(0x87b6e8, 40, 110)

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 1000)
scene.add(camera)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
app.appendChild(renderer.domElement)

// lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x556633, 0.7))
const sun = new THREE.DirectionalLight(0xffffff, 0.9)
sun.position.set(40, 80, 20)
scene.add(sun)

const world = new World(scene)
const player = new Player(world, world.spawn)
const mobs = spawnMobs(world, scene)
const ui = new UI()
ui.setMode(player.mode)
ui.setSelected(0)

// ---- targeting visuals ----
const highlight = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
  new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 })
)
highlight.visible = false
scene.add(highlight)

const crack = new THREE.Mesh(
  new THREE.BoxGeometry(1.004, 1.004, 1.004),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false })
)
crack.visible = false
scene.add(crack)

// ---- first person arm ----
const arm = new THREE.Group()
const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), new THREE.MeshLambertMaterial({ color: 0xc98f63 }))
forearm.geometry.translate(0, -0.25, 0)
const tool = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), new THREE.MeshLambertMaterial({ color: 0x8a5a2c }))
tool.position.set(0, -0.45, -0.25)
arm.add(forearm, tool)
arm.position.set(0.42, -0.42, -0.9)
camera.add(arm)

// ---- input ----
const keys = new Set()
const REACH = 5
let locked = false
let selected = 0
let breaking = null // {x,y,z,progress}
let attackHeld = false
let audioCtx = null

const overlay = document.getElementById('overlay')
const crosshair = document.getElementById('crosshair')
const hud = document.getElementById('hud')

overlay.addEventListener('click', () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  renderer.domElement.requestPointerLock()
})
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement
  overlay.classList.toggle('hidden', locked)
  crosshair.classList.toggle('hidden', !locked)
  hud.classList.toggle('hidden', !locked)
})

addEventListener('keydown', (e) => {
  keys.add(e.code)
  if (e.code === 'KeyF' && locked) { const m = player.toggleMode(); ui.setMode(m); ui.toast('Modus: ' + (m === 'creative' ? 'Creative' : 'Survival')) }
  if (e.code.startsWith('Digit')) {
    const n = parseInt(e.code.slice(5), 10) - 1
    if (n >= 0 && n < HOTBAR.length) { selected = n; ui.setSelected(n) }
  }
})
addEventListener('keyup', (e) => keys.delete(e.code))
addEventListener('mousemove', (e) => {
  if (!locked) return
  player.yaw -= e.movementX * 0.0022
  player.pitch -= e.movementY * 0.0022
  player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch))
})
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault())
addEventListener('mousedown', (e) => {
  if (!locked) return
  if (e.button === 0) { attackHeld = true; onAttack() }
  else if (e.button === 2) onPlace()
})
addEventListener('mouseup', (e) => {
  if (e.button === 0) { attackHeld = false; breaking = null; crack.visible = false }
})
addEventListener('wheel', (e) => {
  if (!locked) return
  selected = (selected + (e.deltaY > 0 ? 1 : -1) + HOTBAR.length) % HOTBAR.length
  ui.setSelected(selected)
})

function beep(freq, dur, type = 'square', vol = 0.06) {
  if (!audioCtx) return
  const o = audioCtx.createOscillator(), g = audioCtx.createGain()
  o.type = type; o.frequency.value = freq
  g.gain.value = vol
  o.connect(g); g.connect(audioCtx.destination)
  o.start(); o.stop(audioCtx.currentTime + dur)
}

// ---- actions ----
function getAim() {
  const o = player.eyePosition()
  const d = new THREE.Vector3()
  camera.getWorldDirection(d)
  return { origin: o, dir: d }
}

function onAttack() {
  const { origin, dir } = getAim()
  // PvP / PvE: raycast mobs
  const rc = new THREE.Raycaster(origin, dir, 0, REACH)
  const meshes = mobs.map((m) => m.mesh)
  const hits = rc.intersectObjects(meshes, true)
  if (hits.length) {
    let obj = hits[0].object
    while (obj && !obj.userData.mob) obj = obj.parent
    if (obj && obj.userData.mob && player.attackTimer <= 0) {
      obj.userData.mob.hit(6, origin)
      player.attackTimer = 0.4
      player.armSwing = 1.4
      beep(220, 0.08, 'sawtooth', 0.08)
      if (obj.userData.mob.dead) removeMob(obj.userData.mob)
      return
    }
  }
  // block break
  const hit = world.raycast(origin, dir, REACH)
  if (!hit) return
  if (player.mode === 'creative') {
    if (BLOCKS[world.get(hit.x, hit.y, hit.z)].hardness >= 0) {
      world.set(hit.x, hit.y, hit.z, AIR); beep(160, 0.05, 'square', 0.05)
    }
    return
  }
  breaking = { x: hit.x, y: hit.y, z: hit.z, progress: 0 }
}

function onPlace() {
  const { origin, dir } = getAim()
  const hit = world.raycast(origin, dir, REACH)
  if (!hit) return
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz
  if (world.get(x, y, z) !== AIR) return
  if (isSolid(world.get(x, y, z))) return
  // don't place inside player
  const b = { minX: x, maxX: x + 1, minY: y, maxY: y + 1, minZ: z, maxZ: z + 1 }
  if (intersects(player.aabb(), b)) return
  const type = HOTBAR[selected]
  world.set(x, y, z, type)
  beep(330, 0.04, 'square', 0.05)
}

function intersects(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY && a.minZ < b.maxZ && a.maxZ > b.minZ
}

function removeMob(mob) {
  scene.remove(mob.mesh)
  const i = mobs.indexOf(mob)
  if (i >= 0) mobs.splice(i, 1)
  setTimeout(() => {
    const x = Math.floor(4 + Math.random() * (world.W - 8))
    const z = Math.floor(4 + Math.random() * (world.D - 8))
    const y = world.surfaceHeight(x, z) + 1
    const m = new Mob(mob.type, world, new THREE.Vector3(x + 0.5, y, z + 0.5))
    scene.add(m.mesh); mobs.push(m)
  }, 8000)
}

// ---- loop ----
const clock = new THREE.Clock()
let bobT = 0

function updateTargeting() {
  const { origin, dir } = getAim()
  const hit = world.raycast(origin, dir, REACH)
  if (hit) {
    highlight.visible = true
    highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5)
  } else highlight.visible = false
  return hit
}

function updateBreaking(dt, hit) {
  if (!breaking || !attackHeld || player.mode !== 'survival') { crack.visible = false; return }
  if (!hit || hit.x !== breaking.x || hit.y !== breaking.y || hit.z !== breaking.z) {
    breaking = null; crack.visible = false; return
  }
  const type = world.get(breaking.x, breaking.y, breaking.z)
  const def = BLOCKS[type]
  if (def.hardness < 0) { breaking = null; crack.visible = false; return }
  breaking.progress += dt / (def.hardness * 1.2)
  const stage = Math.min(9, Math.floor(breaking.progress * 10))
  crack.visible = true
  crack.position.set(breaking.x + 0.5, breaking.y + 0.5, breaking.z + 0.5)
  crack.material.map = crackTextures[stage]
  crack.material.needsUpdate = true
  player.armSwing = 1.2
  if (breaking.progress >= 1) {
    world.set(breaking.x, breaking.y, breaking.z, AIR)
    breaking = null; crack.visible = false
    beep(140, 0.06, 'square', 0.06)
  }
}

function updateArm(dt) {
  const swing = player.armSwing
  bobT += dt * (player.onGround ? swing * 8 : 2)
  arm.rotation.x = Math.sin(bobT) * 0.5 * Math.min(1, swing)
  arm.rotation.z = -0.15
  arm.position.y = -0.42 + Math.abs(Math.sin(bobT)) * 0.03 * Math.min(1, swing)
}

function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const now = performance.now() / 1000

  if (locked) {
    player.update(dt, keys, now)
    const hit = updateTargeting()
    updateBreaking(dt, hit)
    for (const m of mobs) m.update(dt, player, camera, now)
    updateArm(dt)
  }

  // camera follow
  const eye = player.eyePosition()
  camera.position.copy(eye)
  camera.rotation.order = 'YXZ'
  camera.rotation.y = player.yaw
  camera.rotation.x = player.pitch

  ui.setHealth(player.health)
  renderer.render(scene, camera)
}
animate()

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
