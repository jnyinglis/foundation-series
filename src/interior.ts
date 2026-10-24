import * as THREE from 'three';

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
export class Figure {
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

export class Interior {
  readonly scene = new THREE.Scene();
  readonly figures = new Map<string, Figure>();
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

  constructor() {
    this.buildCantina();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouse);
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
    const winMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float; varying vec2 vUv; uniform float uTime;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        void main(){
          vec3 ice = vec3(0.35,0.55,0.8); vec3 band = vec3(0.95,0.55,0.25); vec3 night = vec3(0.02,0.03,0.08);
          float t = vUv.x; vec3 sky = mix(ice, band, smoothstep(0.35,0.75,t)); sky = mix(sky, night, smoothstep(0.0,0.3,vUv.y)*0.85);
          float ridge = 0.25 + 0.18*n(vec2(t*6.0, 1.0)) + 0.08*n(vec2(t*20.0, 3.0));
          float cliff = smoothstep(ridge, ridge-0.01, vUv.y);
          vec3 col = mix(sky, vec3(0.04,0.05,0.07), cliff);
          float lights = step(0.992, h(floor(vUv*vec2(320.0,110.0)))) * cliff * step(0.05, vUv.y);
          col += vec3(1.0,0.7,0.4) * lights * 1.4;
          float stars = step(0.997, h(floor(vUv*vec2(480.0,160.0)))) * (1.0-cliff) * smoothstep(0.4,0.9,vUv.y);
          col += stars * 1.2;
          gl_FragColor = vec4(col * 1.3, 1.0); }`,
    });
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
        next.x = THREE.MathUtils.clamp(next.x, -10.4, 10.4);
        next.z = THREE.MathUtils.clamp(next.z, -7.4, 7.4);
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
    for (const f of this.figures.values()) for (const d of f.disposables) d.dispose();
    for (const d of this.disposables) d.dispose();
  }
}
