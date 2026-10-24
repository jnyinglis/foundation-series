import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Avatar, avatarFileFor, type Actor } from './avatar';

// Walkable interiors with stylised procedural characters. The first interior is
// the cantina of Twilight City on Radole. Characters are built from primitives so
// the scene needs no downloaded assets; a glTF avatar can replace a Figure later.

interface Palette { skin: number; hair: number; top: number; legs: number; boots: number }

const PALETTES: Record<string, Palette> = {
  'ILEN SARVO': { skin: 0xd9b8a0, hair: 0x1d1a1a, top: 0x3a3f49, legs: 0x2a2d35, boots: 0x1a1a1a },
  'CORIN PELLIS': { skin: 0xc9a080, hair: 0xd8c38a, top: 0x6b4a2a, legs: 0x2b2f3a, boots: 0x222222 },
  'GREY COAT': { skin: 0xcfbfb0, hair: 0x444444, top: 0x6a6e74, legs: 0x4a4e55, boots: 0x222222 },
  BARTENDER: { skin: 0xb98a6a, hair: 0x2a1a10, top: 0x8a2f2f, legs: 0x222222, boots: 0x111111 },
  PATRON_A: { skin: 0xe0c0a8, hair: 0x6a3a1a, top: 0x2f4a6b, legs: 0x333333, boots: 0x222222 },
  PATRON_B: { skin: 0x8a5a3a, hair: 0x111111, top: 0x4a6b2f, legs: 0x2a2a2a, boots: 0x222222 },
};

function std(color: number, rough = 0.8, metal = 0.0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

/** A stylised human figure built from primitives, with idle, look-at, gesture and mouth animation. */
export class Figure implements Actor {
  readonly root = new THREE.Group();
  readonly head: THREE.Group;
  private torso: THREE.Group;
  private armL: THREE.Group;
  private armR: THREE.Group;
  private mouth: THREE.Mesh;
  private phase = Math.random() * 10;
  private lookTarget: THREE.Vector3 | null = null;
  private faceTarget: THREE.Vector3 | null = null;
  private baseYaw = 0;
  mouthOpen = 0;
  talking = false;
  readonly name: string;
  readonly disposables: { dispose(): void }[] = [];

  constructor(name: string, pal: Palette, seated = false) {
    this.name = name;
    const skin = std(pal.skin, 0.7), hair = std(pal.hair, 0.9), top = std(pal.top, 0.85), legs = std(pal.legs, 0.9), boots = std(pal.boots, 0.6, 0.2);
    this.disposables.push(skin, hair, top, legs, boots);
    const cap = (r: number, h: number) => { const g = new THREE.CapsuleGeometry(r, h, 4, 10); this.disposables.push(g); return g; };
    const box = (w: number, h: number, d: number) => { const g = new THREE.BoxGeometry(w, h, d); this.disposables.push(g); return g; };
    const sph = (r: number) => { const g = new THREE.SphereGeometry(r, 18, 14); this.disposables.push(g); return g; };

    const hips = new THREE.Group();
    hips.position.y = seated ? 0.5 : 0.95;
    this.root.add(hips);
    const pelvis = new THREE.Mesh(box(0.34, 0.2, 0.22), legs); pelvis.position.y = 0.05; hips.add(pelvis);

    this.torso = new THREE.Group(); this.torso.position.y = 0.15; hips.add(this.torso);
    const chest = new THREE.Mesh(box(0.42, 0.5, 0.26), top); chest.position.y = 0.3; this.torso.add(chest);
    const collar = new THREE.Mesh(box(0.3, 0.08, 0.2), top); collar.position.y = 0.58; this.torso.add(collar);

    this.head = new THREE.Group(); this.head.position.y = 0.72; this.torso.add(this.head);
    const skull = new THREE.Mesh(sph(0.13), skin); skull.scale.set(0.95, 1.1, 1.0); skull.position.y = 0.12; this.head.add(skull);
    const hairCap = new THREE.Mesh(sph(0.138), hair); hairCap.scale.set(1.0, 0.88, 1.02); hairCap.position.set(0, 0.16, -0.025); this.head.add(hairCap);
    const fringe = new THREE.Mesh(box(0.2, 0.05, 0.06), hair); fringe.position.set(0, 0.215, 0.09); this.head.add(fringe);
    const neck = new THREE.Mesh(cap(0.05, 0.08), skin); neck.position.y = 0.0; this.head.add(neck);
    const eyeG = sph(0.015); const eyeM = std(0x111111, 0.3); this.disposables.push(eyeM);
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(eyeG, eyeM); e.position.set(sx * 0.045, 0.13, 0.115); this.head.add(e); }
    this.mouth = new THREE.Mesh(box(0.05, 0.012, 0.01), eyeM); this.mouth.position.set(0, 0.07, 0.125); this.head.add(this.mouth);

    const mkArm = (side: number) => {
      const g = new THREE.Group(); g.position.set(side * 0.27, 0.52, 0); this.torso.add(g);
      const upper = new THREE.Mesh(cap(0.055, 0.22), top); upper.position.y = -0.15; g.add(upper);
      const fore = new THREE.Group(); fore.position.y = -0.3; g.add(fore);
      const lower = new THREE.Mesh(cap(0.05, 0.2), seated && side < 0 ? top : skin); lower.position.y = -0.14; fore.add(lower);
      const hand = new THREE.Mesh(sph(0.05), skin); hand.position.y = -0.3; fore.add(hand);
      g.rotation.z = side * 0.12; fore.rotation.x = seated ? -1.2 : -0.25;
      return g;
    };
    this.armL = mkArm(-1); this.armR = mkArm(1);

    for (const side of [-1, 1]) {
      const thigh = new THREE.Group(); thigh.position.set(side * 0.1, -0.02, 0); hips.add(thigh);
      const up = new THREE.Mesh(cap(0.075, 0.3), legs); up.position.y = -0.2; thigh.add(up);
      const shin = new THREE.Group(); shin.position.y = -0.42; thigh.add(shin);
      const low = new THREE.Mesh(cap(0.06, 0.3), legs); low.position.y = -0.2; shin.add(low);
      const foot = new THREE.Mesh(box(0.12, 0.07, 0.24), boots); foot.position.set(0, -0.42, 0.05); shin.add(foot);
      if (seated) { thigh.rotation.x = -Math.PI / 2; shin.rotation.x = Math.PI / 2; }
    }
  }

  dispose(): void { for (const d of this.disposables) d.dispose(); }
  lookAt(target: THREE.Vector3 | null): void { this.lookTarget = target; }
  /** Turns the whole body toward a point (a seated figure turns on the stool). */
  face(target: THREE.Vector3 | null): void { this.faceTarget = target; }
  setBaseYaw(y: number): void { this.baseYaw = y; this.root.rotation.y = y; }

  update(dt: number, time: number): void {
    const t = time + this.phase;
    const wantYaw = this.faceTarget ? Math.atan2(this.faceTarget.x - this.root.position.x, this.faceTarget.z - this.root.position.z) : this.baseYaw;
    let dy = wantYaw - this.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.root.rotation.y += dy * Math.min(1, dt * 2.5);
    this.torso.position.y = 0.15 + Math.sin(t * 1.3) * 0.006;
    this.torso.rotation.y = Math.sin(t * 0.37) * 0.04;
    // head look-at with limits
    if (this.lookTarget) {
      const headWorld = new THREE.Vector3(); this.head.getWorldPosition(headWorld);
      const local = this.root.worldToLocal(this.lookTarget.clone());
      const dx = local.x, dz = local.z, dy = local.y - headWorld.y + this.root.position.y;
      const yaw = THREE.MathUtils.clamp(Math.atan2(dx, dz), -1.1, 1.1);
      const pitch = THREE.MathUtils.clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.5, 0.5);
      this.head.rotation.y += (yaw - this.head.rotation.y) * Math.min(1, dt * 4);
      this.head.rotation.x += (pitch - this.head.rotation.x) * Math.min(1, dt * 4);
    } else {
      this.head.rotation.y += (Math.sin(t * 0.3) * 0.25 - this.head.rotation.y) * Math.min(1, dt * 2);
      this.head.rotation.x *= 1 - Math.min(1, dt * 2);
    }
    // talking gestures and mouth
    const gest = this.talking ? 0.35 + Math.sin(t * 2.1) * 0.25 : 0;
    this.armR.rotation.x += (-gest - this.armR.rotation.x) * Math.min(1, dt * 5);
    this.armL.rotation.x += (-gest * 0.4 - this.armL.rotation.x) * Math.min(1, dt * 5);
    const target = this.talking ? 0.3 + this.mouthOpen * 4.5 : 0.3;
    this.mouth.scale.y += (target - this.mouth.scale.y) * Math.min(1, dt * 25);
    this.mouth.position.y = 0.07 - (this.mouth.scale.y - 0.3) * 0.004;
  }
}

interface Box { min: THREE.Vector3; max: THREE.Vector3 }

interface SceneMeta {
  colliders: { min: number[]; max: number[] }[];
  bounds: { x: number; z: number };
  spawn: { pos: number[]; yaw: number };
  figures: { name: string; pos: number[]; yaw: number; seated: boolean }[];
}

const WINDOW_FRAG = /* glsl */ `
  precision highp float; varying vec3 vWorld; uniform float uTime;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
  void main(){
    // window spans x in [-10, 10] and y in [1, 5.2] in room space
    vec2 vUv = vec2((vWorld.x + 10.0) / 20.0, clamp((vWorld.y - 1.0) / 4.2, 0.0, 1.0));
    vec3 ice = vec3(0.35,0.55,0.8); vec3 band = vec3(0.95,0.55,0.25); vec3 night = vec3(0.02,0.03,0.08);
    float t = vUv.x; vec3 sky = mix(ice, band, smoothstep(0.35,0.75,t)); sky = mix(sky, night, smoothstep(0.0,0.3,vUv.y)*0.85);
    float ridge = 0.25 + 0.18*n(vec2(t*6.0, 1.0)) + 0.08*n(vec2(t*20.0, 3.0));
    float cliff = smoothstep(ridge, ridge-0.01, vUv.y);
    vec3 col = mix(sky, vec3(0.04,0.05,0.07), cliff);
    float lights = step(0.992, h(floor(vUv*vec2(320.0,110.0)))) * cliff * step(0.05, vUv.y);
    col += vec3(1.0,0.7,0.4) * lights * 1.4;
    float stars = step(0.997, h(floor(vUv*vec2(480.0,160.0)))) * (1.0-cliff) * smoothstep(0.4,0.9,vUv.y);
    col += stars * 1.2;
    gl_FragColor = vec4(col * 1.3, 1.0); }`;
const WINDOW_VERT = /* glsl */ `varying vec3 vWorld; void main(){ vWorld = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

export class Interior {
  readonly scene = new THREE.Scene();
  readonly figures = new Map<string, Actor>();
  readonly playerPos = new THREE.Vector3(0, 1.62, 5.5);
  yaw = Math.PI;
  pitch = 0;
  fov = 62;
  private targetFov = 62;
  private keys = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;
  private colliders: Box[] = [];
  private focusName: string | null = null;
  private disposables: { dispose(): void }[] = [];
  private onKeyDown = (e: KeyboardEvent) => { this.keys.add(e.code); };
  private onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.code); };
  private onMouse = (e: MouseEvent) => { if (document.pointerLockElement) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; } };
  inputEnabled = true;
  private fireLight: THREE.PointLight | null = null;
  private bounds = { x: 10.4, z: 7.4 };
  /** True when the baked Blender scene loaded; false means the procedural fallback is in use. */
  baked = false;

  constructor(readonly sceneName: string = 'cantina') {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouse);
  }

  /** Loads the baked scene from Blender, or builds the procedural room when it is missing. */
  async load(): Promise<void> {
    const base = import.meta.env.BASE_URL;
    try {
      const [gltf, meta] = await Promise.all([
        new GLTFLoader().loadAsync(`${base}scenes/${this.sceneName}.glb`),
        fetch(`${base}scenes/${this.sceneName}.json`).then((r) => { if (!r.ok) throw new Error('no meta'); return r.json() as Promise<SceneMeta>; }),
      ]);
      this.installBaked(gltf.scene, meta);
      this.baked = true;
      await this.placeActors(meta.figures);
    } catch {
      this.buildCantina();
    }
  }

  private installBaked(root: THREE.Object3D, meta: SceneMeta): void {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mesh.name === 'Shell' || mesh.name === 'Furniture') {
        // the lighting is baked into the texture: draw it unlit
        const basic = new THREE.MeshBasicMaterial({ map: mat.map });
        mesh.material = basic;
        this.disposables.push(basic);
      } else if (mat.name === 'Window') {
        const win = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: WINDOW_VERT, fragmentShader: WINDOW_FRAG, side: THREE.DoubleSide });
        mesh.material = win;
        this.disposables.push(win);
      } else {
        // emissive props: lamps, strips, bottles, screens
        mat.toneMapped = true;
        mat.emissiveIntensity = Math.min(mat.emissiveIntensity, 3.0);
        if (mat.emissiveIntensity <= 1) mat.emissiveIntensity = 1.6;
      }
    });
    this.scene.add(root);
    // lights for the characters only; the room itself is baked
    if (this.sceneName === 'village') {
      const skyGeo = new THREE.SphereGeometry(220, 32, 16);
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false,
        vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `precision highp float; varying vec3 vDir;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          void main(){ vec3 d = normalize(vDir); float t = clamp(d.y, 0.0, 1.0);
            vec3 col = mix(vec3(0.08, 0.09, 0.16), vec3(0.01, 0.015, 0.05), smoothstep(0.0, 0.5, t));
            float stars = step(0.997, h(floor(d.xz / max(d.y, 0.05) * 80.0))) * smoothstep(0.1, 0.6, t);
            float moon = pow(max(dot(d, normalize(vec3(0.3, 0.5, 0.8))), 0.0), 900.0);
            col += stars * 0.9 + vec3(0.8, 0.85, 1.0) * moon * 2.5; gl_FragColor = vec4(col, 1.0); }`,
      });
      const sky = new THREE.Mesh(skyGeo, skyMat); this.scene.add(sky); this.disposables.push(skyGeo, skyMat);
      this.scene.add(new THREE.HemisphereLight(0x303a60, 0x1a1208, 0.9));
      const fire = new THREE.PointLight(0xff7a30, 30, 18, 1.5); fire.position.set(0, 1.4, 2); this.scene.add(fire);
      this.fireLight = fire;
      const moon = new THREE.DirectionalLight(0x8090c0, 0.6); moon.position.set(5, 12, -14); this.scene.add(moon);
    } else if (this.sceneName === 'moon') {
      this.scene.add(new THREE.HemisphereLight(0x3a4a70, 0x08080c, 0.8));
      const earth = new THREE.PointLight(0x8fb0ff, 30, 40, 1.3); earth.position.set(0, 5.5, -18); this.scene.add(earth);
      const lamp = new THREE.PointLight(0xffc080, 8, 10, 1.6); lamp.position.set(1.6, 1.3, -6); this.scene.add(lamp);
    } else if (this.sceneName === 'ruins') {
      const skyGeo = new THREE.SphereGeometry(200, 32, 16);
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false,
        vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `precision highp float; varying vec3 vDir;
          void main(){ vec3 d = normalize(vDir); float t = clamp(d.y, 0.0, 1.0);
            vec3 horizon = vec3(0.85, 0.8, 0.7); vec3 zenith = vec3(0.3, 0.45, 0.8);
            vec3 col = mix(horizon, zenith, smoothstep(0.0, 0.5, t));
            float sun = pow(max(dot(d, normalize(vec3(0.5, 0.6, -0.4))), 0.0), 400.0);
            col += vec3(1.0, 0.95, 0.8) * sun * 3.0; gl_FragColor = vec4(col, 1.0); }`,
      });
      const sky = new THREE.Mesh(skyGeo, skyMat); this.scene.add(sky); this.disposables.push(skyGeo, skyMat);
      this.scene.add(new THREE.HemisphereLight(0x8aa0d0, 0x4a4a28, 1.2));
      const sun = new THREE.DirectionalLight(0xfff0d0, 2.0); sun.position.set(8, 14, -6); this.scene.add(sun);
    } else if (this.sceneName === 'estate') {
      this.scene.add(new THREE.HemisphereLight(0xf0f4ff, 0xa0a098, 1.6));
      for (const z of [10, 2, -6]) { const l = new THREE.PointLight(0xffffff, 12, 14, 1.4); l.position.set(0, 5.5, -z); this.scene.add(l); }
    } else if (this.sceneName === 'terrace') {
      // dusk sky over the city
      const skyGeo = new THREE.SphereGeometry(160, 32, 16);
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false,
        vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `precision highp float; varying vec3 vDir;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          void main(){ vec3 d = normalize(vDir); float t = clamp(d.y, 0.0, 1.0);
            vec3 horizon = vec3(0.95, 0.45, 0.25); vec3 mid = vec3(0.45, 0.22, 0.4); vec3 zenith = vec3(0.04, 0.05, 0.14);
            vec3 col = mix(horizon, mid, smoothstep(0.0, 0.25, t)); col = mix(col, zenith, smoothstep(0.2, 0.7, t));
            float stars = step(0.9975, h(floor(d.xz / max(d.y, 0.05) * 60.0))) * smoothstep(0.3, 0.8, t);
            col += stars * 0.8; gl_FragColor = vec4(col, 1.0); }`,
      });
      const sky = new THREE.Mesh(skyGeo, skyMat); sky.position.y = -20; this.scene.add(sky); this.disposables.push(skyGeo, skyMat);
      this.scene.add(new THREE.HemisphereLight(0x8878a0, 0x40281c, 1.3));
      const sun = new THREE.DirectionalLight(0xffa070, 1.4); sun.position.set(-6, 8, 10); this.scene.add(sun);
      for (const z of [4, 0, -4]) for (const x of [-6, 0, 6]) { const b = new THREE.PointLight(0xffc880, 3, 7, 1.6); b.position.set(x, 3.1, z); this.scene.add(b); }
    } else if (this.sceneName === 'vault') {
      this.scene.add(new THREE.HemisphereLight(0xc0ccdd, 0x303438, 1.4));
      for (const z of [8, 4, 0, -4, -8]) { const l = new THREE.PointLight(0xd8e6ff, 7, 9, 1.5); l.position.set(0, 3.9, z); this.scene.add(l); }
    } else if (this.sceneName === 'library') {
      this.scene.add(new THREE.HemisphereLight(0xaab4cc, 0x2a2420, 1.1));
      const oc = new THREE.PointLight(0xdde6ff, 30, 40, 1.4); oc.position.set(0, 14, 0); this.scene.add(oc);
      const con = new THREE.PointLight(0x66ccff, 10, 12, 1.6); con.position.set(0, 2.5, 0); this.scene.add(con);
    } else if (this.sceneName === 'sacratorium') {
      this.scene.add(new THREE.HemisphereLight(0x303848, 0x0a0806, 0.6));
      const shaft = new THREE.PointLight(0xc8d4ff, 18, 14, 1.5); shaft.position.set(0, 6, -11.5); this.scene.add(shaft);
      for (const z of [9, 2, -5]) { const c = new THREE.PointLight(0xffb060, 5, 9, 1.6); c.position.set(0, 1.6, z); this.scene.add(c); }
    } else if (this.sceneName === 'archive') {
      const hemi = new THREE.HemisphereLight(0x5a6a8a, 0x100c0a, 0.7); this.scene.add(hemi);
      const sky = new THREE.PointLight(0x9ab4ff, 14, 16, 1.5); sky.position.set(0, 8, -4); this.scene.add(sky);
      const lamp = new THREE.PointLight(0xffb070, 8, 8, 1.6); lamp.position.set(0.9, 1.8, -11.7); this.scene.add(lamp);
      const door = new THREE.PointLight(0xffb070, 4, 10, 1.6); door.position.set(0, 3, 12); this.scene.add(door);
    } else {
      const hemi = new THREE.HemisphereLight(0x8a7a6a, 0x1a1410, 1.2); this.scene.add(hemi);
      for (const [x, z] of [[-6.5, -6.4], [0, 0], [6.5, 6.4], [-6.5, 6.4], [6.5, -6.4], [0, -6.4], [0, 6.4]]) {
        const l = new THREE.PointLight(0xffb070, 10, 12, 1.6); l.position.set(x, 4.8, z); this.scene.add(l);
      }
    }
    for (const c of meta.colliders) this.colliders.push({ min: new THREE.Vector3(c.min[0], c.min[1], c.min[2]), max: new THREE.Vector3(c.max[0], c.max[1], c.max[2]) });
    this.bounds = meta.bounds;
    this.playerPos.set(meta.spawn.pos[0], meta.spawn.pos[1], meta.spawn.pos[2]);
    this.yaw = meta.spawn.yaw;
  }

  /** Loads rigged avatars where a character file exists, with the procedural figure as the fallback. */
  private async placeActors(figures: SceneMeta['figures']): Promise<void> {
    const base = import.meta.env.BASE_URL;
    await Promise.all(figures.map(async (f) => {
      let actor: Actor | null = null;
      const file = avatarFileFor(f.name);
      if (file) {
        try { actor = await Avatar.load(f.name, `${base}characters/${file}.glb`, f.seated); } catch { actor = null; }
      }
      if (!actor) actor = new Figure(f.name, PALETTES[f.name] ?? PALETTES.PATRON_A, f.seated);
      const y = actor instanceof Avatar ? 0 : f.pos[1];
      actor.root.position.set(f.pos[0], y, f.pos[2]);
      actor.setBaseYaw(f.yaw);
      this.scene.add(actor.root);
      this.figures.set(f.name, actor);
      this.colliders.push({ min: new THREE.Vector3(f.pos[0] - 0.5, 0, f.pos[2] - 0.5), max: new THREE.Vector3(f.pos[0] + 0.5, 2, f.pos[2] + 0.5) });
    }));
  }

  private grime(base: string, lines = false): THREE.CanvasTexture {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? 0 : 255},${Math.random() < 0.5 ? 0 : 255},${Math.random() < 0.5 ? 0 : 255},${Math.random() * 0.07})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 6, 1 + Math.random() * 6);
    }
    if (lines) { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; for (let i = 0; i <= 256; i += 64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke(); } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    this.disposables.push(t);
    return t;
  }

  private addBox(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, solid = true, ry = 0): THREE.Mesh {
    const g = new THREE.BoxGeometry(w, h, d); this.disposables.push(g);
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.y = ry; this.scene.add(m);
    if (solid) this.colliders.push({ min: new THREE.Vector3(x - w / 2 - 0.3, y - h / 2, z - d / 2 - 0.3), max: new THREE.Vector3(x + w / 2 + 0.3, y + h / 2, z + d / 2 + 0.3) });
    return m;
  }

  private buildCantina(): void {
    const W = 22, H = 5.5, D = 16;
    const floorT = this.grime('#2a2d33', true); floorT.repeat.set(6, 4);
    const wallT = this.grime('#4a4038'); wallT.repeat.set(4, 2);
    const floorM = new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.6, metalness: 0.35 });
    const wallM = new THREE.MeshStandardMaterial({ map: wallT, roughness: 0.95 });
    const steel = std(0x3b3f47, 0.45, 0.7);
    const dark = std(0x15171c, 0.8, 0.2);
    const wood = std(0x4a3222, 0.8);
    const amber = new THREE.MeshStandardMaterial({ color: 0xffb060, emissive: 0xffa040, emissiveIntensity: 2.2 });
    const cyan = new THREE.MeshStandardMaterial({ color: 0x8ff, emissive: 0x3fd4ff, emissiveIntensity: 1.6 });
    this.disposables.push(floorM, wallM, steel, dark, wood, amber, cyan);

    this.addBox(W, 0.2, D, 0, -0.1, 0, floorM, false);
    this.addBox(W, 0.3, D, 0, H + 0.15, 0, dark, false);
    this.addBox(W, H, 0.3, 0, H / 2, -D / 2, wallM, false);
    this.addBox(0.3, H, D, -W / 2, H / 2, 0, wallM, false);
    this.addBox(0.3, H, D, W / 2, H / 2, 0, wallM, false);
    // front wall with the door gap
    this.addBox(W / 2 - 1.2, H, 0.3, -W / 4 - 0.6, H / 2, D / 2, wallM, false);
    this.addBox(W / 2 - 1.2, H, 0.3, W / 4 + 0.6, H / 2, D / 2, wallM, false);
    this.addBox(2.4, 1.2, 0.3, 0, H - 0.6, D / 2, wallM, false);
    this.addBox(0.15, 4.4, 0.4, -1.25, 2.2, D / 2, steel, false); this.addBox(0.15, 4.4, 0.4, 1.25, 2.2, D / 2, steel, false);
    // ceiling beams and lamps
    for (let i = -2; i <= 2; i++) {
      this.addBox(W, 0.35, 0.4, 0, H - 0.2, i * 3.2, steel, false);
      for (const x of [-6, 0, 6]) {
        this.addBox(0.6, 0.12, 0.6, x, H - 0.45, i * 3.2, amber, false);
        if (Math.abs(i) !== 2 || x === 0) { const l = new THREE.PointLight(0xffb070, 18, 14, 1.6); l.position.set(x, H - 0.7, i * 3.2); this.scene.add(l); }
      }
    }
    // the window onto the twilight band
    const winGeo = new THREE.PlaneGeometry(W - 2, H - 1.2); this.disposables.push(winGeo);
    const winMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: WINDOW_VERT, fragmentShader: WINDOW_FRAG });
    this.disposables.push(winMat);
    const win = new THREE.Mesh(winGeo, winMat); win.position.set(0, H / 2 + 0.2, -D / 2 + 0.2); this.scene.add(win);
    const winGlow = new THREE.PointLight(0x80a0ff, 10, 18, 1.5); winGlow.position.set(0, 3, -D / 2 + 2); this.scene.add(winGlow);
    const hemi = new THREE.HemisphereLight(0x60708a, 0x1a1410, 0.9); this.scene.add(hemi);

    // bar counter along the right wall
    this.addBox(0.9, 1.1, 10, W / 2 - 2.2, 0.55, -1, wood);
    this.addBox(1.0, 0.06, 10.2, W / 2 - 2.2, 1.13, -1, steel, false);
    this.addBox(0.04, 0.04, 10, W / 2 - 2.72, 1.0, -1, cyan, false);
    this.addBox(0.4, 3.2, 10, W / 2 - 0.4, 1.6, -1, dark);
    for (let i = 0; i < 14; i++) {
      const bg = new THREE.CylinderGeometry(0.05, 0.05, 0.3 + Math.random() * 0.2, 8); this.disposables.push(bg);
      const bm = new THREE.MeshStandardMaterial({ color: [0x3fd4ff, 0xffc14d, 0x7dffb0, 0xff6b6b][i % 4], emissive: [0x3fd4ff, 0xffc14d, 0x7dffb0, 0xff6b6b][i % 4], emissiveIntensity: 0.8, roughness: 0.2 }); this.disposables.push(bm);
      const b = new THREE.Mesh(bg, bm); b.position.set(W / 2 - 0.55, 1.5 + Math.floor(i / 7) * 0.7, -5 + (i % 7) * 1.4); this.scene.add(b);
    }
    for (let i = 0; i < 5; i++) this.stool(W / 2 - 3.4, -5 + i * 2, steel, dark);
    // tables
    const tables = [[-6, -3], [-6, 3], [-1, -4], [-1, 2], [4, 4]];
    for (const [x, z] of tables) {
      const tg = new THREE.CylinderGeometry(0.75, 0.75, 0.06, 20); this.disposables.push(tg);
      const top = new THREE.Mesh(tg, steel); top.position.set(x, 0.95, z); this.scene.add(top);
      const lg = new THREE.CylinderGeometry(0.08, 0.3, 0.95, 12); this.disposables.push(lg);
      const leg = new THREE.Mesh(lg, dark); leg.position.set(x, 0.47, z); this.scene.add(leg);
      this.colliders.push({ min: new THREE.Vector3(x - 1.05, 0, z - 1.05), max: new THREE.Vector3(x + 1.05, 1.5, z + 1.05) });
      for (const a of [0, 2.1, 4.2]) this.stool(x + Math.cos(a) * 1.25, z + Math.sin(a) * 1.25, steel, dark, false);
      const lamp = this.addBox(0.25, 0.08, 0.25, x, 1.05, z, amber, false); lamp.scale.set(1, 1, 1);
    }
    // dockmaster desk near the door
    this.addBox(2.6, 1.0, 0.8, -7, 0.5, 6.2, dark);
    this.addBox(0.5, 0.35, 0.05, -7, 1.3, 6.0, cyan, false);

    // characters
    this.place('ILEN SARVO', 2.6, 0, -6.2, Math.PI + 0.3, false);
    this.place('CORIN PELLIS', -1, 0, 2, 0.4, true, -1 + Math.cos(2.1) * 1.25, 2 + Math.sin(2.1) * 1.25);
    this.place('GREY COAT', -6.2, 0, 7.1, Math.PI, false);
    this.place('BARTENDER', W / 2 - 1.4, 0, -2.5, -Math.PI / 2, false);
    this.place('PATRON_A', 0, 0, 0, 0, true, -6 + Math.cos(0) * 1.25, -3 + Math.sin(0) * 1.25);
    this.place('PATRON_B', 0, 0, 0, 0, true, 4 + Math.cos(4.2) * 1.25, 4 + Math.sin(4.2) * 1.25);
  }

  private stool(x: number, z: number, seat: THREE.Material, leg: THREE.Material, solid = true): void {
    const sg = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 14); this.disposables.push(sg);
    const s = new THREE.Mesh(sg, seat); s.position.set(x, 0.62, z); this.scene.add(s);
    const lg = new THREE.CylinderGeometry(0.05, 0.12, 0.6, 10); this.disposables.push(lg);
    const l = new THREE.Mesh(lg, leg); l.position.set(x, 0.3, z); this.scene.add(l);
    if (solid) this.colliders.push({ min: new THREE.Vector3(x - 0.5, 0, z - 0.5), max: new THREE.Vector3(x + 0.5, 1.2, z + 0.5) });
  }

  private place(name: string, x: number, y: number, z: number, ry: number, seated: boolean, sx?: number, sz?: number): void {
    const f = new Figure(name, PALETTES[name] ?? PALETTES.PATRON_A, seated);
    const px = sx ?? x, pz = sz ?? z;
    f.root.position.set(px, y, pz);
    f.setBaseYaw(seated ? Math.atan2((sx !== undefined ? x : px) - px, (sz !== undefined ? z : pz) - pz) : ry);
    if (seated) { f.root.position.y = 0.12; }
    this.scene.add(f.root);
    this.figures.set(name, f);
    this.colliders.push({ min: new THREE.Vector3(px - 0.5, 0, pz - 0.5), max: new THREE.Vector3(px + 0.5, 2, pz + 0.5) });
  }

  /** Turns the player's view toward a speaking character; null releases it. */
  focus(name: string | null): void {
    this.focusName = name && this.figures.has(name) ? name : null;
    this.targetFov = this.focusName ? 50 : 62;
    for (const [n, f] of this.figures) { f.talking = n === this.focusName; f.face(n === this.focusName ? this.playerPos : null); if (n !== this.focusName) f.lookAt(this.playerPos); }
  }

  setMouthLevel(level: number): void {
    if (this.focusName) this.figures.get(this.focusName)!.mouthOpen = level;
  }

  update(dt: number, time: number, camera: THREE.PerspectiveCamera): void {
    // look
    if (this.inputEnabled && !this.focusName) {
      this.yaw -= this.mouseDX * 0.0022;
      this.pitch = THREE.MathUtils.clamp(this.pitch - this.mouseDY * 0.0022, -1.2, 1.2);
      if (this.keys.has('ArrowLeft')) this.yaw += dt * 1.6;
      if (this.keys.has('ArrowRight')) this.yaw -= dt * 1.6;
      if (this.keys.has('ArrowUp')) this.pitch = Math.min(1.2, this.pitch + dt * 1.2);
      if (this.keys.has('ArrowDown')) this.pitch = Math.max(-1.2, this.pitch - dt * 1.2);
    }
    this.mouseDX = 0; this.mouseDY = 0;
    // walk
    if (this.inputEnabled && !this.focusName) {
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
      const move = new THREE.Vector3();
      if (this.keys.has('KeyW')) move.add(fwd);
      if (this.keys.has('KeyS')) move.sub(fwd);
      if (this.keys.has('KeyD')) move.sub(right);
      if (this.keys.has('KeyA')) move.add(right);
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(dt * (this.keys.has('ShiftLeft') ? 4.5 : 2.6));
        const next = this.playerPos.clone().add(move);
        next.x = THREE.MathUtils.clamp(next.x, -this.bounds.x, this.bounds.x);
        next.z = THREE.MathUtils.clamp(next.z, -this.bounds.z, this.bounds.z);
        for (const b of this.colliders) {
          if (next.x > b.min.x && next.x < b.max.x && next.z > b.min.z && next.z < b.max.z) {
            const dx = Math.min(next.x - b.min.x, b.max.x - next.x), dz = Math.min(next.z - b.min.z, b.max.z - next.z);
            if (dx < dz) next.x = next.x - b.min.x < b.max.x - next.x ? b.min.x : b.max.x; else next.z = next.z - b.min.z < b.max.z - next.z ? b.min.z : b.max.z;
          }
        }
        this.playerPos.copy(next);
        this.playerPos.y = 1.62 + Math.sin(time * 9) * 0.015;
      }
    }
    // dialogue focus: turn toward the speaker
    if (this.focusName) {
      const f = this.figures.get(this.focusName)!;
      const head = new THREE.Vector3(); f.head.getWorldPosition(head);
      const d = head.clone().sub(this.playerPos);
      const ty = Math.atan2(-d.x, -d.z);
      const tp = Math.atan2(d.y - 0.05, Math.hypot(d.x, d.z));
      let dy = ty - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.yaw += dy * Math.min(1, dt * 3);
      this.pitch += (tp - this.pitch) * Math.min(1, dt * 3);
      f.lookAt(this.playerPos);
    }
    if (this.fireLight) this.fireLight.intensity = 26 + Math.sin(time * 9.1) * 3 + Math.sin(time * 23.7) * 2;
    this.fov += (this.targetFov - this.fov) * Math.min(1, dt * 3);
    camera.fov = this.fov; camera.updateProjectionMatrix();
    camera.position.copy(this.playerPos);
    camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    for (const f of this.figures.values()) f.update(dt, time);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouse);
    for (const f of this.figures.values()) f.dispose();
    for (const d of this.disposables) d.dispose();
  }
}
