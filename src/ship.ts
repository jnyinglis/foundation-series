import * as THREE from 'three';

export class Ship {
  readonly position = new THREE.Vector3();
  readonly quaternion = new THREE.Quaternion();
  readonly velocity = new THREE.Vector3();
  throttle = 0;
  boost = false;
  speed = 0;
  readonly maxSpeed = 700;
  readonly boostSpeed = 3200;
  /** Scales top speed, for atmospheric flight. */
  speedScale = 1;
  private keys = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;
  private pitchRate = 0;
  private yawRate = 0;
  private rollRate = 0;
  private locked = false;
  enabled = true;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyX') this.throttle = 0;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('click', () => {
      if (this.enabled && !this.locked) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
  }

  get isLocked(): boolean { return this.locked; }

  releasePointer(): void {
    if (this.locked) document.exitPointerLock();
  }

  reset(position: THREE.Vector3, lookAt: THREE.Vector3): void {
    this.position.copy(position);
    const m = new THREE.Matrix4().lookAt(position, lookAt, new THREE.Vector3(0, 1, 0));
    this.quaternion.setFromRotationMatrix(m);
    this.velocity.set(0, 0, 0);
    this.throttle = 0.25;
    this.speed = 0;
  }

  forward(target = new THREE.Vector3()): THREE.Vector3 {
    return target.set(0, 0, -1).applyQuaternion(this.quaternion);
  }

  update(dt: number, planetRadius: number): void {
    if (!this.enabled) { this.mouseDX = 0; this.mouseDY = 0; return; }
    const k = this.keys;
    // throttle
    if (k.has('KeyW')) this.throttle = Math.min(1, this.throttle + dt * 0.6);
    if (k.has('KeyS')) this.throttle = Math.max(0, this.throttle - dt * 0.6);
    this.boost = k.has('ShiftLeft') || k.has('ShiftRight');

    // rotation targets
    let pitch = 0, yaw = 0, roll = 0;
    if (k.has('ArrowUp')) pitch -= 1;
    if (k.has('ArrowDown')) pitch += 1;
    if (k.has('ArrowLeft')) yaw += 1;
    if (k.has('ArrowRight')) yaw -= 1;
    if (k.has('KeyQ')) roll += 1;
    if (k.has('KeyE')) roll -= 1;
    if (k.has('KeyA')) roll += 1;
    if (k.has('KeyD')) roll -= 1;
    pitch += -this.mouseDY * 0.012;
    yaw += -this.mouseDX * 0.012;
    this.mouseDX = 0;
    this.mouseDY = 0;

    const agility = 1.1;
    const smooth = 1 - Math.exp(-dt * 6);
    this.pitchRate += (pitch * agility - this.pitchRate) * smooth;
    this.yawRate += (yaw * agility - this.yawRate) * smooth;
    this.rollRate += (roll * 1.6 - this.rollRate) * smooth;

    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(this.pitchRate * dt, this.yawRate * dt, this.rollRate * dt, 'XYZ'));
    this.quaternion.multiply(q).normalize();

    // velocity
    const target = this.throttle * (this.boost ? this.boostSpeed : this.maxSpeed) * this.speedScale;
    this.speed += (target - this.speed) * (1 - Math.exp(-dt * (this.boost ? 1.2 : 2.5)));
    const fwd = this.forward();
    this.velocity.copy(fwd).multiplyScalar(this.speed);
    this.position.addScaledVector(this.velocity, dt);

    // keep out of the planet (planetRadius 0 = no planet)
    const minDist = planetRadius * 1.14;
    const d = this.position.length();
    if (planetRadius > 0 && d < minDist) {
      this.position.multiplyScalar(minDist / d);
      this.speed *= 0.2;
      this.throttle = Math.min(this.throttle, 0.1);
    }
  }
}
