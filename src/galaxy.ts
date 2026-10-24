import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WORLDS, JUMP_RANGE, distance, type World } from './data/worlds';

function spiralPoints(count: number): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    let x: number, y: number, z: number;
    if (u < 0.18) {
      // core bulge
      const r = Math.pow(Math.random(), 1.6) * 9;
      const a = Math.random() * Math.PI * 2;
      const e = (Math.random() - 0.5) * 2;
      x = Math.cos(a) * r; z = Math.sin(a) * r; y = e * (3 - r * 0.25) * Math.random();
      col.setHSL(0.09, 0.6, 0.55 + Math.random() * 0.3);
    } else {
      const arm = Math.floor(Math.random() * 4);
      const t = Math.pow(Math.random(), 0.7) * 1.0;
      const r = 6 + t * 46;
      const a = (arm * Math.PI) / 2 + Math.log(r / 5) * 2.4 + (Math.random() - 0.5) * (0.35 + t * 0.35);
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      y = (Math.random() - 0.5) * (2.2 - t * 1.4) * Math.random();
      const hue = Math.random() < 0.3 ? 0.08 : 0.6;
      col.setHSL(hue, 0.5, 0.5 + Math.random() * 0.35);
    }
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  return { positions, colors };
}

function discTexture(): THREE.Texture {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

export class GalaxyMap {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  selected: World | null = null;
  current: World;
  /** When set, only these worlds can be selected and routed through. */
  allowed: Set<string> | null = null;
  route: World[] = [];
  private routeLine: THREE.Line;
  private worldPoints: THREE.Points;
  private worldColors: Float32Array;
  private rangeRing: THREE.LineLoop;
  private selectRing: THREE.Mesh;
  private link: THREE.Line;
  private labels: Map<string, HTMLDivElement> = new Map();
  private raycaster = new THREE.Raycaster();
  private labelRoot: HTMLElement;
  onSelect: ((w: World | null) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, labelRoot: HTMLElement, current: World) {
    this.current = current;
    this.labelRoot = labelRoot;
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 220;
    this.controls.enabled = false;

    const disc = discTexture();
    const bg = spiralPoints(42000);
    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bg.positions, 3));
    bgGeo.setAttribute('color', new THREE.BufferAttribute(bg.colors, 3));
    const bgMat = new THREE.PointsMaterial({ size: 0.35, map: disc, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.scene.add(new THREE.Points(bgGeo, bgMat));

    // haze
    const hazeGeo = new THREE.BufferGeometry();
    const hz = spiralPoints(3000);
    hazeGeo.setAttribute('position', new THREE.BufferAttribute(hz.positions, 3));
    hazeGeo.setAttribute('color', new THREE.BufferAttribute(hz.colors, 3));
    const hazeMat = new THREE.PointsMaterial({ size: 4.5, map: disc, vertexColors: true, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending });
    this.scene.add(new THREE.Points(hazeGeo, hazeMat));

    // named worlds
    const n = WORLDS.length;
    const pos = new Float32Array(n * 3);
    this.worldColors = new Float32Array(n * 3);
    WORLDS.forEach((w, i) => {
      pos[i * 3] = w.pos[0]; pos[i * 3 + 1] = w.pos[1]; pos[i * 3 + 2] = w.pos[2];
    });
    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    wGeo.setAttribute('color', new THREE.BufferAttribute(this.worldColors, 3));
    const wMat = new THREE.PointsMaterial({ size: 1.6, map: disc, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.worldPoints = new THREE.Points(wGeo, wMat);
    this.scene.add(this.worldPoints);

    // jump range ring
    const ringPts: THREE.Vector3[] = [];
    for (let i = 0; i < 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * JUMP_RANGE, 0, Math.sin(a) * JUMP_RANGE));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    this.rangeRing = new THREE.LineLoop(ringGeo, new THREE.LineBasicMaterial({ color: 0x3fd4ff, transparent: true, opacity: 0.45 }));
    this.scene.add(this.rangeRing);

    // selection ring
    const selGeo = new THREE.RingGeometry(0.9, 1.1, 48);
    this.selectRing = new THREE.Mesh(selGeo, new THREE.MeshBasicMaterial({ color: 0xffc14d, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    this.selectRing.visible = false;
    this.scene.add(this.selectRing);

    // link line
    const linkGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.link = new THREE.Line(linkGeo, new THREE.LineDashedMaterial({ color: 0xffc14d, dashSize: 0.4, gapSize: 0.25, transparent: true, opacity: 0.8 }));
    this.link.visible = false;
    this.scene.add(this.link);

    // multi-jump route
    const routeGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.routeLine = new THREE.Line(routeGeo, new THREE.LineBasicMaterial({ color: 0x7dffb0, transparent: true, opacity: 0.7 }));
    this.routeLine.visible = false;
    this.scene.add(this.routeLine);

    for (const w of WORLDS) {
      const d = document.createElement('div');
      d.className = 'map-label';
      d.textContent = w.name;
      d.addEventListener('click', (e) => { e.stopPropagation(); this.select(w); });
      labelRoot.appendChild(d);
      this.labels.set(w.id, d);
    }

    canvas.addEventListener('pointerdown', (e) => {
      if (!this.controls.enabled) return;
      (canvas as HTMLElement & { _mx?: number; _my?: number })._mx = e.clientX;
      (canvas as HTMLElement & { _mx?: number; _my?: number })._my = e.clientY;
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!this.controls.enabled) return;
      const c = canvas as HTMLElement & { _mx?: number; _my?: number };
      if (Math.abs((c._mx ?? 0) - e.clientX) > 4 || Math.abs((c._my ?? 0) - e.clientY) > 4) return;
      this.pick(e.clientX, e.clientY, canvas);
    });

    this.setCurrent(current);
    this.refreshColors();
  }

  setCurrent(w: World): void {
    this.current = w;
    this.rangeRing.position.set(w.pos[0], w.pos[1], w.pos[2]);
    // keep a selection whose route is still in progress
    if (this.selected && this.selected.id !== w.id && this.planRoute(this.selected).length) {
      this.select(this.selected);
    } else {
      this.selected = null;
      this.selectRing.visible = false;
      this.link.visible = false;
      this.routeLine.visible = false;
      this.route = [];
      this.refreshColors();
    }
  }

  isAllowed(w: World): boolean {
    return !this.allowed || this.allowed.has(w.id);
  }

  /** Shortest chain of jumps from the current world to target. Empty when unreachable. */
  planRoute(target: World): World[] {
    if (target.id === this.current.id) return [];
    const nodes = WORLDS.filter((w) => this.isAllowed(w) || w.id === this.current.id);
    const dist = new Map<string, number>();
    const prev = new Map<string, World>();
    const open = new Set(nodes.map((w) => w.id));
    for (const w of nodes) dist.set(w.id, Infinity);
    dist.set(this.current.id, 0);
    while (open.size) {
      let u: World | null = null;
      let best = Infinity;
      for (const id of open) { const d = dist.get(id)!; if (d < best) { best = d; u = nodes.find((w) => w.id === id)!; } }
      if (!u || best === Infinity) break;
      open.delete(u.id);
      if (u.id === target.id) break;
      for (const v of nodes) {
        if (!open.has(v.id)) continue;
        const d = distance(u, v);
        if (d > JUMP_RANGE) continue;
        const nd = best + d;
        if (nd < dist.get(v.id)!) { dist.set(v.id, nd); prev.set(v.id, u); }
      }
    }
    if (!prev.has(target.id)) return [];
    const path: World[] = [];
    let cur: World | undefined = target;
    while (cur && cur.id !== this.current.id) { path.unshift(cur); cur = prev.get(cur.id); }
    return path;
  }

  nextHop(): World | null {
    return this.route[0] ?? null;
  }

  open(): void {
    this.controls.enabled = true;
    const c = this.current.pos;
    this.controls.target.set(c[0], c[1], c[2]);
    this.camera.position.set(c[0] + 14, c[1] + 22, c[2] + 18);
    this.controls.update();
    this.labelRoot.style.display = 'block';
  }

  close(): void {
    this.controls.enabled = false;
    this.labelRoot.style.display = 'none';
  }

  inRange(w: World): boolean {
    return distance(this.current, w) <= JUMP_RANGE + 1e-6;
  }

  select(w: World | null): void {
    if (w && !this.isAllowed(w)) w = null;
    this.selected = w;
    if (w) {
      this.selectRing.position.set(w.pos[0], w.pos[1], w.pos[2]);
      this.selectRing.visible = true;
      this.route = this.planRoute(w);
      const ok = this.route.length > 0;
      const a = this.current.pos, b = w.pos;
      this.link.geometry.setFromPoints([new THREE.Vector3(a[0], a[1], a[2]), new THREE.Vector3(b[0], b[1], b[2])]);
      this.link.computeLineDistances();
      this.link.visible = !ok;
      (this.link.material as THREE.LineDashedMaterial).color.set(0xff6b6b);
      (this.selectRing.material as THREE.MeshBasicMaterial).color.set(ok ? 0x7dffb0 : 0xff6b6b);
      if (ok) {
        const pts = [this.current, ...this.route].map((x) => new THREE.Vector3(x.pos[0], x.pos[1], x.pos[2]));
        this.routeLine.geometry.setFromPoints(pts);
        this.routeLine.visible = true;
      } else {
        this.routeLine.visible = false;
      }
    } else {
      this.route = [];
      this.selectRing.visible = false;
      this.link.visible = false;
      this.routeLine.visible = false;
    }
    this.refreshColors();
    this.onSelect?.(w);
  }

  private pick(x: number, y: number, canvas: HTMLCanvasElement): void {
    const r = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    this.raycaster.params.Points.threshold = 0.9;
    const hits = this.raycaster.intersectObject(this.worldPoints);
    if (hits.length && hits[0].index !== undefined) {
      this.select(WORLDS[hits[0].index]);
    }
  }

  private refreshColors(): void {
    WORLDS.forEach((w, i) => {
      let c: THREE.Color;
      if (w.id === this.current.id) c = new THREE.Color(0x3fd4ff);
      else if (this.selected && w.id === this.selected.id) c = new THREE.Color(0xffc14d);
      else if (!this.isAllowed(w)) c = new THREE.Color(0x2c3240);
      else if (w.minor) c = new THREE.Color(0x8a94a8);
      else if (this.inRange(w)) c = new THREE.Color(0xffffff);
      else c = new THREE.Color(0x9aa4b8);
      this.worldColors[i * 3] = c.r; this.worldColors[i * 3 + 1] = c.g; this.worldColors[i * 3 + 2] = c.b;
      const l = this.labels.get(w.id)!;
      l.classList.toggle('current', w.id === this.current.id);
      l.classList.toggle('selected', !!this.selected && w.id === this.selected.id);
      l.classList.toggle('inrange', this.inRange(w));
      l.classList.toggle('locked', !this.isAllowed(w));
      l.classList.toggle('minor', !!w.minor);
    });
    (this.worldPoints.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  update(width: number, height: number): void {
    this.controls.update();
    this.selectRing.lookAt(this.camera.position);
    const v = new THREE.Vector3();
    for (const w of WORLDS) {
      v.set(w.pos[0], w.pos[1], w.pos[2]).project(this.camera);
      const l = this.labels.get(w.id)!;
      const visible = v.z < 1;
      l.style.display = visible ? 'block' : 'none';
      if (!visible) continue;
      l.style.left = `${((v.x + 1) / 2) * width}px`;
      l.style.top = `${((1 - v.y) / 2) * height}px`;
    }
  }
}
