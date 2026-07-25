import * as THREE from 'three';
import { materials } from '../utils/materials.js';
import { COLORS } from '../utils/constants.js';
import { HOUSE } from '../utils/constants.js';
import { box, cyl } from '../utils/components.js';

export function buildEnvironment(parent, state) {
  const g = new THREE.Group();
  const M = materials();

  const ground = new THREE.Mesh(new THREE.CircleGeometry(140, 48), M.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.2;
  ground.receiveShadow = true;
  g.add(ground);

  const plot = box(g, HOUSE.W + 10, 0.02, HOUSE.D + 10, 0, -0.19, 0, M.floorConcrete);
  plot.receiveShadow = true;

  const driveway = box(g, 3, 0.04, 14, HOUSE.W / 2 + 1.5, -0.17, 4, M.asphalt);
  driveway.receiveShadow = true;
  const path = box(g, 2.4, 0.04, 6, 0, -0.17, -HOUSE.D / 2 - 3, M.asphalt);
  path.receiveShadow = true;

  const terrace = box(g, 6, 0.06, 3, -HOUSE.W / 2 + 3, -0.15, -HOUSE.D / 2 + 1.5, M.stone);
  terrace.receiveShadow = true;
  const terraceRail = box(g, 6, 0.04, 0.08, -HOUSE.W / 2 + 3, 0.6, -HOUSE.D / 2 + 0.1, M.metal);
  const terraceRail2 = box(g, 0.04, 0.6, 3, -HOUSE.W / 2 + 0.1, 0.3, -HOUSE.D / 2 + 1.5, M.metal);

  function tree(x, z, s = 1) {
    const t = new THREE.Group();
    const trunk = cyl(t, 0.18 * s, 0.26 * s, 2.2 * s, 0, 1.1 * s, 0, M.trunk, 10);
    for (let i = 0; i < 3; i++) {
      const r = (1.6 - i * 0.4) * s;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 1.6 * s, 12),
        new THREE.MeshStandardMaterial({ color: i % 2 ? 0x4a7c3f : 0x3f6e36, roughness: 0.9 }));
      cone.position.y = (2.0 + i * 0.9) * s;
      cone.castShadow = true;
      t.add(cone);
    }
    t.position.set(x, -0.18, z);
    g.add(t);
  }
  tree(-HOUSE.W / 2 - 5, -4, 1.1);
  tree(HOUSE.W / 2 + 6, 5, 1.3);
  tree(-HOUSE.W / 2 - 7, 7, 0.9);
  tree(HOUSE.W / 2 + 5, -7, 1.0);

  for (let i = 0; i < 6; i++) {
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x4f7d3f, roughness: 1 }));
    shrub.scale.y = 0.7;
    shrub.position.set(-HOUSE.W / 2 - 4 + Math.random() * 2, -0.0, -6 + Math.random() * 12);
    shrub.castShadow = true; shrub.receiveShadow = true;
    g.add(shrub);
  }

  const mailbox = new THREE.Group();
  box(mailbox, 0.3, 0.3, 0.4, 0, 1.2, 0, M.metal);
  cyl(mailbox, 0.04, 0.04, 1.2, 0, 0.6, 0, M.metalDark, 8);
  mailbox.position.set(HOUSE.W / 2 + 3.5, -0.18, -HOUSE.D / 2 - 3.5);
  g.add(mailbox);

  const ev = new THREE.Group();
  box(ev, 0.3, 0.5, 0.18, 0, 0.4, 0, M.black);
  box(ev, 0.18, 0.12, 0.04, 0, 0.5, 0.1, M.ledGreen);
  box(ev, 0.04, 0.02, 0.02, 0, 0.3, 0.1, M.metal);
  ev.position.set(HOUSE.W / 2 + 1.5, -0.18, 8.5);
  g.add(ev);

  const trash = new THREE.Group();
  box(trash, 0.5, 0.7, 0.5, -0.3, 0.35, 0, M.techPanel);
  box(trash, 0.5, 0.7, 0.5, 0.3, 0.35, 0, M.tech);
  trash.position.set(HOUSE.W / 2 + 4, -0.18, -8);
  g.add(trash);

  const pole = cyl(g, 0.05, 0.05, 3.2, -HOUSE.W / 2 - 1, 1.4, HOUSE.D / 2 - 1, M.metalDark, 8);
  const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xfff1d6, emissiveIntensity: 1.2 }));
  lampHead.position.set(-HOUSE.W / 2 - 1, 3.0, HOUSE.D / 2 - 1);
  g.add(lampHead);
  const outLight = new THREE.PointLight(0xffe6b0, 0, 10, 2);
  outLight.position.copy(lampHead.position);
  g.add(outLight);
  g.userData.outdoorLight = outLight;
  g.userData.outdoorBulb = lampHead;

  parent.add(g);
  return g;
}
