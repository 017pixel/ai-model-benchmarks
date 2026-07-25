import { isSolid } from './blocks.js'

export function aabbIntersect(a, b) {
  return (
    a.minX < b.maxX && a.maxX > b.minX &&
    a.minY < b.maxY && a.maxY > b.minY &&
    a.minZ < b.maxZ && a.maxZ > b.minZ
  )
}

function blockAABB(x, y, z) {
  return { minX: x, maxX: x + 1, minY: y, maxY: y + 1, minZ: z, maxZ: z + 1 }
}

// Resolves collisions for an axis-aligned box after it has been moved on one axis.
function resolveAxis(pos, vel, axis, box, world) {
  const minX = pos.x - box.hx, maxX = pos.x + box.hx
  const minY = pos.y, maxY = pos.y + box.height
  const minZ = pos.z - box.hz, maxZ = pos.z + box.hz
  const x0 = Math.floor(minX), x1 = Math.floor(maxX)
  const y0 = Math.floor(minY), y1 = Math.floor(maxY)
  const z0 = Math.floor(minZ), z1 = Math.floor(maxZ)
  let onGround = false
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++) {
        if (!isSolid(world.get(x, y, z))) continue
        const b = blockAABB(x, y, z)
        if (!aabbIntersect({ minX, maxX, minY, maxY, minZ, maxZ }, b)) continue
        if (axis === 'x') {
          if (vel.x > 0) pos.x = x - box.hx
          else if (vel.x < 0) pos.x = x + 1 + box.hx
          vel.x = 0
        } else if (axis === 'z') {
          if (vel.z > 0) pos.z = z - box.hz
          else if (vel.z < 0) pos.z = z + 1 + box.hz
          vel.z = 0
        } else {
          if (vel.y <= 0) { pos.y = y + 1; onGround = true }
          else { pos.y = y - box.height }
          vel.y = 0
        }
        return onGround
      }
  return onGround
}

export function moveAndCollide(pos, vel, dt, world, box) {
  pos.x += vel.x * dt
  resolveAxis(pos, vel, 'x', box, world)
  pos.z += vel.z * dt
  resolveAxis(pos, vel, 'z', box, world)
  pos.y += vel.y * dt
  const onGround = resolveAxis(pos, vel, 'y', box, world)
  return onGround
}
