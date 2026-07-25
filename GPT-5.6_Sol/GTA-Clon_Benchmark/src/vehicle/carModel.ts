import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type CarModel = {
  root: Group;
  frontWheels: Object3D[];
  wheels: Object3D[];
  brakeLights: Mesh[];
};

function mesh(geometry: BoxGeometry | CylinderGeometry | RoundedBoxGeometry | PlaneGeometry, material: MeshStandardMaterial | MeshPhysicalMaterial): Mesh {
  const result = new Mesh(geometry, material);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

export function createCarModel(color: number, detailed = true): CarModel {
  const root = new Group();
  const paint = new MeshPhysicalMaterial({
    color,
    metalness: 0.72,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.09,
    envMapIntensity: 1.75,
  });
  const carbon = new MeshStandardMaterial({ color: 0x111416, metalness: 0.58, roughness: 0.3 });
  const glass = new MeshPhysicalMaterial({
    color: 0x17272e,
    metalness: 0.4,
    roughness: 0.05,
    transmission: 0.12,
    clearcoat: 1,
  });
  const rubber = new MeshStandardMaterial({ color: 0x090a0a, roughness: 0.88 });
  const rim = new MeshStandardMaterial({ color: 0x92989a, metalness: 0.94, roughness: 0.18 });
  const brake = new MeshStandardMaterial({ color: 0x77251d, metalness: 0.5, roughness: 0.35 });
  const headlamp = new MeshStandardMaterial({ color: 0xe7edf0, emissive: 0xc7d9e4, emissiveIntensity: 2.8, roughness: 0.12 });
  const tailLamp = new MeshStandardMaterial({ color: 0x8d160f, emissive: 0xff2b1d, emissiveIntensity: 1.4, roughness: 0.22 });

  const chassis = mesh(new RoundedBoxGeometry(2.02, 0.48, 4.45, 5, 0.18), paint);
  chassis.position.y = 0.68;
  root.add(chassis);

  const hood = mesh(new RoundedBoxGeometry(1.9, 0.25, 1.46, 4, 0.12), paint);
  hood.position.set(0, 0.98, -1.35);
  hood.rotation.x = -0.035;
  root.add(hood);

  const cabin = mesh(new RoundedBoxGeometry(1.68, 0.75, 1.95, 5, 0.2), glass);
  cabin.position.set(0, 1.28, 0.13);
  root.add(cabin);

  const roof = mesh(new RoundedBoxGeometry(1.54, 0.12, 1.24, 3, 0.08), paint);
  roof.position.set(0, 1.7, 0.2);
  root.add(roof);

  const splitter = mesh(new RoundedBoxGeometry(2.05, 0.11, 0.22, 2, 0.04), carbon);
  splitter.position.set(0, 0.38, -2.21);
  root.add(splitter);
  const diffuser = splitter.clone();
  diffuser.position.z = 2.19;
  root.add(diffuser);

  const grille = mesh(new BoxGeometry(1.22, 0.25, 0.06), carbon);
  grille.position.set(0, 0.66, -2.235);
  root.add(grille);

  for (const x of [-0.72, 0.72]) {
    const lamp = mesh(new RoundedBoxGeometry(0.46, 0.16, 0.07, 2, 0.03), headlamp);
    lamp.position.set(x, 0.87, -2.25);
    root.add(lamp);
  }

  const brakeLights: Mesh[] = [];
  for (const x of [-0.71, 0.71]) {
    const lamp = mesh(new RoundedBoxGeometry(0.5, 0.13, 0.07, 2, 0.03), tailLamp);
    lamp.position.set(x, 0.89, 2.25);
    root.add(lamp);
    brakeLights.push(lamp);
  }

  const wheels: Object3D[] = [];
  const frontWheels: Object3D[] = [];
  for (const z of [-1.36, 1.37]) {
    for (const x of [-1.01, 1.01]) {
      const wheelPivot = new Group();
      wheelPivot.position.set(x, 0.47, z);
      const tire = mesh(new CylinderGeometry(0.41, 0.41, 0.28, detailed ? 24 : 12), rubber);
      tire.rotation.z = Math.PI / 2;
      wheelPivot.add(tire);
      const wheelRim = mesh(new CylinderGeometry(0.25, 0.25, 0.295, detailed ? 16 : 8), rim);
      wheelRim.rotation.z = Math.PI / 2;
      wheelPivot.add(wheelRim);
      if (detailed) {
        const disc = mesh(new CylinderGeometry(0.17, 0.17, 0.305, 16), brake);
        disc.rotation.z = Math.PI / 2;
        wheelPivot.add(disc);
      }
      root.add(wheelPivot);
      wheels.push(wheelPivot);
      if (z < 0) frontWheels.push(wheelPivot);
    }
  }

  if (detailed) {
    for (const x of [-1.07, 1.07]) {
      const mirrorStem = mesh(new BoxGeometry(0.14, 0.08, 0.19), carbon);
      mirrorStem.position.set(x, 1.3, -0.34);
      root.add(mirrorStem);
      const mirror = mesh(new RoundedBoxGeometry(0.25, 0.12, 0.12, 2, 0.04), paint);
      mirror.position.set(x * 1.04, 1.35, -0.37);
      root.add(mirror);
    }
    const sideSkirtGeometry = new RoundedBoxGeometry(0.1, 0.13, 2.95, 2, 0.03);
    for (const x of [-1.02, 1.02]) {
      const skirt = mesh(sideSkirtGeometry, carbon);
      skirt.position.set(x, 0.4, 0.12);
      root.add(skirt);
    }
    const plateMaterial = new MeshStandardMaterial({ color: 0xe4ded0, roughness: 0.65 });
    const plate = mesh(new PlaneGeometry(0.56, 0.16), plateMaterial);
    plate.position.set(0, 0.56, 2.231);
    plate.rotation.y = Math.PI;
    root.add(plate);
  }

  root.traverse((object) => {
    if (object instanceof Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return { root, frontWheels, wheels, brakeLights };
}

export const TRAFFIC_COLORS = [
  new Color(0x25323a),
  new Color(0x8c8b84),
  new Color(0x551f1a),
  new Color(0xb3b0a5),
  new Color(0x15221e),
  new Color(0xc7c3b6),
].map((color) => color.getHex());
