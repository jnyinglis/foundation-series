import * as THREE from 'three';
import type { Ship } from './ship';

// Trantor from the air: a procedural world-city of instanced towers, lit windows,
// traffic lanes and fog. No assets.

function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function smooth(t: number): number { return t * t * (3 - 2 * t); }
function noise2(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm2(x: number, y: number, oct = 4): number {
  let f = 0, a = 0.5, s = 0;
  for (let i = 0; i < oct; i++) { f += a * noise2(x, y); s += a; x *= 2.03; y *= 2.03; a *= 0.5; }
  return f / s;
}

const BUILDING_VERT = /* glsl */ `
attribute vec3 aColor;
varying vec3 vLocal;
varying vec3 vScale;
varying vec3 vNormalW;
varying vec3 vColor;
varying float vDist;
varying float vId;
void main() {
  vLocal = position;
  vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vColor = aColor;
  vId = instanceMatrix[3].x * 0.013 + instanceMatrix[3].z * 0.071;
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vDist = length(wp.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const BUILDING_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uFog;
uniform float uFogDensity;
uniform vec3 uSunDir;
varying vec3 vLocal;
varying vec3 vScale;
varying vec3 vNormalW;
varying vec3 vColor;
varying float vDist;
varying float vId;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + vId * 17.0) * 43758.5453); }
void main() {
  vec3 n = normalize(vNormalW);
  vec3 base = vColor;
  vec3 emissive = vec3(0.0);
  if (abs(n.y) < 0.5) {
    // side face: window grid in world units
    float along = abs(n.x) > 0.5 ? vLocal.z * vScale.z : vLocal.x * vScale.x;
    float up = (vLocal.y + 0.5) * vScale.y;
    vec2 cell = floor(vec2(along / 3.2, up / 2.6));
    vec2 f = fract(vec2(along / 3.2, up / 2.6));
    float frame = step(0.25, f.x) * step(f.x, 0.75) * step(0.3, f.y) * step(f.y, 0.75);
    float h = hash(cell + vec2(n.x * 3.0, n.z * 7.0));
    float lit = step(0.8, h) * frame;
    vec3 warm = vec3(1.0, 0.72, 0.38);
    vec3 cold = vec3(0.55, 0.85, 1.0);
    emissive = mix(warm, cold, step(0.97, h)) * lit * (0.7 + 0.9 * hash(cell * 1.7));
    // vertical pillars and horizontal bands
    float band = smoothstep(0.0, 0.05, fract(up / 40.0)) * (1.0 - smoothstep(0.05, 0.1, fract(up / 40.0)));
    base *= 1.0 - band * 0.4;
    base *= 0.85 + 0.15 * frame;
  } else {
    // roof: a few beacons
    vec2 cell = floor(vLocal.xz * vScale.xz / 6.0);
    float h = hash(cell);
    emissive = vec3(1.0, 0.3, 0.2) * step(0.992, h) * 2.0;
    base *= 0.6;
  }
  float diff = max(dot(n, normalize(uSunDir)), 0.0);
  vec3 col = base * (0.12 + 0.5 * diff) + emissive;
  float fog = 1.0 - exp(-vDist * vDist * uFogDensity * uFogDensity);
  col = mix(col, uFog, fog);
  gl_FragColor = vec4(col, 1.0);
}
`;

export class TrantorCity {
  readonly scene = new THREE.Scene();
  readonly extent = 3200;
  private cell = 44;
  private heights: Float32Array;
  private cols: number;
  private traffic: THREE.Points;
  private trafficData: Float32Array;
  private trafficPos: Float32Array;
  private disposables: { dispose(): void }[] = [];
  readonly sunDir = new THREE.Vector3(0.4, 0.06, 0.6).normalize();
  readonly fogColor = new THREE.Color(0.018, 0.022, 0.04);

  constructor() {
    const cols = Math.floor((this.extent * 2) / this.cell);
    this.cols = cols;
    this.heights = new Float32Array(cols * cols);
    const matrices: THREE.Matrix4[] = [];
    const colors: number[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const tint = new THREE.Color();
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < cols; j++) {
        const avenue = i % 9 === 0 || j % 9 === 0;
        if (avenue) continue;
        const x = (i + 0.5) * this.cell - this.extent;
        const z = (j + 0.5) * this.cell - this.extent;
        const district = fbm2(x * 0.0006 + 3.1, z * 0.0006 + 7.7, 4);
        const local = fbm2(x * 0.004, z * 0.004, 3);
        let h = 40 + Math.pow(district, 2.2) * 900 + local * 180 + hash2(i, j) * 60;
        if (hash2(i * 7, j * 3) > 0.985) h *= 1.9; // the odd super-tower
        const w = this.cell * (0.55 + hash2(i + 1, j) * 0.35);
        const d = this.cell * (0.55 + hash2(i, j + 1) * 0.35);
        this.heights[i * cols + j] = h;
        s.set(w, h, d);
        p.set(x, h / 2, z);
        m.compose(p, q, s);
        matrices.push(m.clone());
        const g = 0.03 + hash2(i * 3, j * 5) * 0.04;
        tint.setRGB(g * (1.0 + district * 0.4), g * 1.05, g * (1.15 + local * 0.3));
        colors.push(tint.r, tint.g, tint.b);
      }
    }
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.ShaderMaterial({
      vertexShader: BUILDING_VERT, fragmentShader: BUILDING_FRAG,
      uniforms: { uFog: { value: this.fogColor }, uFogDensity: { value: 0.00036 }, uSunDir: { value: this.sunDir } },
    });
    const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
    matrices.forEach((mm, i) => inst.setMatrixAt(i, mm));
    inst.geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(colors), 3));
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    this.scene.add(inst);
    this.disposables.push(geo, mat);

    // ground haze plane
    const groundGeo = new THREE.PlaneGeometry(this.extent * 4, this.extent * 4);
    const groundMat = new THREE.MeshBasicMaterial({ color: this.fogColor });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    this.disposables.push(groundGeo, groundMat);

    // sky dome
    const skyGeo = new THREE.SphereGeometry(20000, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { uFog: { value: this.fogColor }, uSunDir: { value: this.sunDir } },
      vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
      fragmentShader: /* glsl */ `
        precision highp float; uniform vec3 uFog; uniform vec3 uSunDir; varying vec3 vDir;
        void main(){ vec3 d = normalize(vDir); float t = clamp(d.y, 0.0, 1.0);
          vec3 zenith = vec3(0.005, 0.008, 0.03); vec3 col = mix(uFog * 2.2, zenith, pow(t, 0.5));
          float sun = pow(max(dot(d, normalize(uSunDir)), 0.0), 600.0);
          float halo = pow(max(dot(d, normalize(uSunDir)), 0.0), 8.0);
          col += vec3(1.0, 0.7, 0.45) * sun * 4.0 + vec3(0.9, 0.5, 0.3) * halo * 0.25;
          gl_FragColor = vec4(col, 1.0); }`,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.frustumCulled = false;
    this.scene.add(sky);
    this.disposables.push(skyGeo, skyMat);

    // traffic lanes along the avenues
    const count = 4000;
    this.trafficData = new Float32Array(count * 4); // axis, fixed coord, altitude, speed
    this.trafficPos = new Float32Array(count * 3);
    const tcol = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const axis = Math.random() < 0.5 ? 0 : 1;
      const lane = Math.floor(Math.random() * (cols / 9)) * 9 * this.cell - this.extent + (Math.random() < 0.5 ? -8 : 8);
      const alt = 60 + Math.floor(Math.random() * 6) * 70 + Math.random() * 10;
      const speed = (40 + Math.random() * 60) * (Math.random() < 0.5 ? 1 : -1);
      this.trafficData.set([axis, lane, alt, speed], i * 4);
      const along = Math.random() * this.extent * 2 - this.extent;
      this.trafficPos.set(axis === 0 ? [along, alt, lane] : [lane, alt, along], i * 3);
      const c = speed > 0 ? [1.0, 0.95, 0.85] : [1.0, 0.25, 0.15];
      tcol.set(c, i * 3);
    }
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.BufferAttribute(this.trafficPos, 3));
    tGeo.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
    const tMat = new THREE.PointsMaterial({ size: 4, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.traffic = new THREE.Points(tGeo, tMat);
    this.traffic.frustumCulled = false;
    this.scene.add(this.traffic);
    this.disposables.push(tGeo, tMat);
  }

  heightAt(x: number, z: number): number {
    const i = Math.floor((x + this.extent) / this.cell);
    const j = Math.floor((z + this.extent) / this.cell);
    if (i < 0 || j < 0 || i >= this.cols || j >= this.cols) return 0;
    return this.heights[i * this.cols + j];
  }

  /** Keeps the ship inside the city volume and above the roofs. */
  constrain(ship: Ship): void {
    const p = ship.position;
    const lim = this.extent - 200;
    if (Math.abs(p.x) > lim) p.x = Math.sign(p.x) * lim;
    if (Math.abs(p.z) > lim) p.z = Math.sign(p.z) * lim;
    const floor = Math.max(30, this.heightAt(p.x, p.z) + 12);
    if (p.y < floor) { p.y = floor; ship.speed *= 0.6; }
    if (p.y > 2600) p.y = 2600;
  }

  update(dt: number): void {
    const d = this.trafficData, pos = this.trafficPos;
    for (let i = 0; i < d.length / 4; i++) {
      const axis = d[i * 4], speed = d[i * 4 + 3];
      const k = axis === 0 ? i * 3 : i * 3 + 2;
      let v = pos[k] + speed * dt;
      if (v > this.extent) v -= this.extent * 2;
      if (v < -this.extent) v += this.extent * 2;
      pos[k] = v;
    }
    (this.traffic.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  startPose(): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
    return { position: new THREE.Vector3(-1800, 520, 1800), lookAt: new THREE.Vector3(0, 300, 0) };
  }

  dispose(): void { for (const x of this.disposables) x.dispose(); }
}
