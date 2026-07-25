import { MathUtils, MeshStandardMaterial, PerspectiveCamera, Scene, Vector3 } from "three";
import { VEHICLE, WORLD } from "../config";
import { Input } from "../input";
import { createCarModel } from "./carModel";

export class PlayerCar {
  readonly model = createCarModel(0xb7452d, true);
  readonly position = new Vector3(-23, 0.02, 112);
  speed = 0;
  heading = Math.PI;
  private steering = 0;
  private cameraMode = 0;
  private readonly previousPosition = new Vector3();
  private readonly cameraPosition = new Vector3();
  private readonly cameraTarget = new Vector3();

  constructor(scene: Scene) {
    scene.add(this.model.root);
    this.syncModel();
  }

  update(delta: number, input: Input, collides: (position: Vector3) => boolean): void {
    this.previousPosition.copy(this.position);
    const throttle = input.get("throttle");
    const braking = input.get("brake");
    const handbrake = input.get("handbrake");

    if (throttle) this.speed += VEHICLE.acceleration * delta;
    if (braking) {
      if (this.speed > 0.8) this.speed -= VEHICLE.braking * delta;
      else this.speed -= VEHICLE.reverseAcceleration * delta;
    }
    if (!throttle && !braking) {
      const drag = VEHICLE.rollingResistance * delta;
      this.speed = Math.abs(this.speed) <= drag ? 0 : this.speed - Math.sign(this.speed) * drag;
    }
    if (handbrake) this.speed *= Math.pow(0.89, delta * 60);
    this.speed = MathUtils.clamp(this.speed, -VEHICLE.maxReverseSpeed, VEHICLE.maxForwardSpeed);

    const steeringInput = Number(input.get("left")) - Number(input.get("right"));
    const steeringGrip = Math.min(1, Math.abs(this.speed) / 3.5);
    const steeringTarget = steeringInput * (handbrake ? 0.88 : 0.58);
    this.steering = MathUtils.damp(this.steering, steeringTarget, 8, delta);
    this.heading += this.steering * VEHICLE.steeringRate * steeringGrip * Math.sign(this.speed) * delta;

    const forwardX = -Math.sin(this.heading);
    const forwardZ = -Math.cos(this.heading);
    this.position.x += forwardX * this.speed * delta;
    this.position.z += forwardZ * this.speed * delta;
    this.position.x = MathUtils.clamp(this.position.x, -WORLD.worldLimit - 20, WORLD.worldLimit + 20);
    this.position.z = MathUtils.clamp(this.position.z, WORLD.coastZ - 65, WORLD.worldLimit + 10);

    if (collides(this.position)) {
      this.position.copy(this.previousPosition);
      this.speed *= -0.12;
    }

    const wheelSpin = this.speed * delta / 0.41;
    this.model.wheels.forEach((wheel) => { wheel.rotation.x -= wheelSpin; });
    this.model.frontWheels.forEach((wheel) => { wheel.rotation.y = -this.steering * 0.72; });
    this.model.brakeLights.forEach((light) => {
      const material = light.material;
      if (Array.isArray(material)) return;
      (material as MeshStandardMaterial).emissiveIntensity = braking ? 4.5 : 1.4;
    });
    this.syncModel();

    if (input.consumeCameraRequest()) this.cameraMode = (this.cameraMode + 1) % 3;
  }

  updateCamera(camera: PerspectiveCamera, delta: number): void {
    const forward = new Vector3(-Math.sin(this.heading), 0, -Math.cos(this.heading));
    const right = new Vector3(-forward.z, 0, forward.x);
    if (this.cameraMode === 0) {
      this.cameraPosition.copy(this.position).addScaledVector(forward, -8.4).add(new Vector3(0, 4.2, 0));
      this.cameraTarget.copy(this.position).addScaledVector(forward, 7).add(new Vector3(0, 1.2, 0));
    } else if (this.cameraMode === 1) {
      this.cameraPosition.copy(this.position).addScaledVector(forward, -4.8).addScaledVector(right, 0.45).add(new Vector3(0, 2.05, 0));
      this.cameraTarget.copy(this.position).addScaledVector(forward, 12).add(new Vector3(0, 1.05, 0));
    } else {
      this.cameraPosition.copy(this.position).addScaledVector(forward, -15).add(new Vector3(0, 8.2, 0));
      this.cameraTarget.copy(this.position).addScaledVector(forward, 4).add(new Vector3(0, 0.8, 0));
    }
    const cameraLerp = 1 - Math.exp(-delta * (this.cameraMode === 1 ? 12 : 5.5));
    camera.position.lerp(this.cameraPosition, cameraLerp);
    const currentDirection = new Vector3();
    camera.getWorldDirection(currentDirection);
    const currentTarget = camera.position.clone().add(currentDirection.multiplyScalar(10));
    currentTarget.lerp(this.cameraTarget, 1 - Math.exp(-delta * 8));
    camera.lookAt(currentTarget);
    camera.fov = MathUtils.damp(camera.fov, 54 + Math.min(10, Math.abs(this.speed) * 0.16), 4, delta);
    camera.updateProjectionMatrix();
  }

  private syncModel(): void {
    this.model.root.position.copy(this.position);
    this.model.root.rotation.y = this.heading;
  }
}
