import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** What the interior needs from any character, procedural or loaded. */
export interface Actor {
  readonly root: THREE.Object3D;
  readonly head: THREE.Object3D;
  readonly name: string;
  talking: boolean;
  mouthOpen: number;
  update(dt: number, time: number): void;
  lookAt(target: THREE.Vector3 | null): void;
  face(target: THREE.Vector3 | null): void;
  setBaseYaw(y: number): void;
  dispose(): void;
}

/** Which character file plays which story role. */
export const AVATAR_FILES: Record<string, string> = {
  'ILEN SARVO': 'ilen',
  'CORIN PELLIS': 'corin',
  'GREY COAT': 'greycoat',
  BARTENDER: 'bartender',
  PATRON_A: 'patron_a',
  PATRON_B: 'patron_b',
  TAREN: 'taren',
  'SENNET BARR': 'sennet',
  'DIRA VELM': 'dira',
  'SUNMASTER TWENTY-ONE': 'sunmaster',
  STATUE: 'statue',
  'VASK OREN': 'vask',
  QUINTESETZ: 'quintesetz',
  'ALDO DENIADOR': 'deniador',
  'CAPTAIN VOS': 'vos',
  'RYDEL BANDER': 'bander',
  WRECK: 'statue',
  SANYA: 'sanya',
  DANEEL: 'daneel',
  'RAL GOROV': 'gorov',
  'ELDER PHERL': 'pherl',
  'NESSA TARRANT': 'nessa',
  'DOM VELLORY': 'vellory',
  CROUPIER: 'bartender',
  LISTENER: 'patron_b',
  PATRON_C: 'patron_c',
  PATRON_D: 'patron_d',
  PATRON_E: 'patron_b',
  'ELDER TOKHAN': 'tokhan',
  'GOVERNOR SARIN': 'sarin',
  VILLAGER_A: 'patron_b',
  VILLAGER_B: 'bartender',
  'MIRA HEKT': 'hekt',
  'KEEPER DORNE': 'dorne',
  'CHAIR AMMEL': 'ammel',
  STUDENT: 'student',
};

/** Robots and wrecks reuse the statue file with a material override. */
export function avatarFileFor(name: string): string | undefined {
  if (name.startsWith('ROBOT')) return 'statue';
  return AVATAR_FILES[name];
}

/** How characters are drawn: 'real' keeps the exported physically based materials, 'toon' uses stepped shading and an ink outline. */
export type Look = 'real' | 'toon';

// shading steps against the light's dot product: faces turned away get nothing, so hair cards and mouths stay dark
const gradientMap = (() => {
  const t = new THREE.DataTexture(new Uint8Array([0, 0, 90, 180, 255]), 5, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
// no hull on eyes, lashes, brows, hair cards, teeth: the ink would fill them in
const NO_OUTLINE = /eye|lash|brow|hair|teeth|tongue|low-poly/i;

/** An inverted hull: the same mesh drawn back-face only, pushed out along its normals, in ink. */
function outlineMaterial(width: number): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color: 0x14100e, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uOutline = { value: width };
    sh.vertexShader = 'uniform float uOutline;\n' + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = vec3(position) + normal * uOutline;');
  };
  return m;
}

/** The retargeted Mixamo clips (blender/anim.py), loaded once and shared by every avatar. */
let clipLibrary: Promise<THREE.AnimationClip[] | null> | null = null;
function loadClips(base: string): Promise<THREE.AnimationClip[] | null> {
  if (!clipLibrary) {
    clipLibrary = new GLTFLoader().loadAsync(`${base}characters/anim.glb`).then((g) => g.animations).catch(() => null);
  }
  return clipLibrary;
}
/** Characters who talk with their whole body; everyone else gets the calm talking clip. */
const EMPHATIC = new Set(['GREY COAT', 'PATRON_D', 'DOM VELLORY', 'RYDEL BANDER', 'CHAIR AMMEL']);
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// GLTFLoader strips ':' from node names, so 'mixamorig:Hips' arrives as 'mixamorigHips'.
const B = (n: string) => `mixamorig${n}`;
const clean = (n: string) => n.replace(/[^\w-]/g, '');

/** A rigged MakeHuman character exported from Blender, animated procedurally on its Mixamo skeleton. */
export class Avatar implements Actor {
  readonly root = new THREE.Group();
  readonly head: THREE.Object3D;
  readonly name: string;
  talking = false;
  mouthOpen = 0;
  private bones = new Map<string, THREE.Object3D>();
  private base = new Map<string, THREE.Euler>();
  private morphMeshes: { mesh: THREE.Mesh; index: number }[] = [];
  private lookTarget: THREE.Vector3 | null = null;
  private faceTarget: THREE.Vector3 | null = null;
  private baseYaw = 0;
  private phase = Math.random() * 10;
  private headYaw = 0;
  private headPitch = 0;
  private gesture = 0;
  private scene: THREE.Group;
  private statue = false;
  private parts: { mesh: THREE.Mesh; real: THREE.Material | THREE.Material[]; toon: THREE.Material | THREE.Material[]; outline: THREE.Mesh | null }[] = [];
  /** The look given to every avatar loaded from now on. */
  static defaultLook: Look = 'real';

  static async load(name: string, url: string, seated: boolean): Promise<Avatar> {
    const base = url.slice(0, url.indexOf('characters/'));
    const [gltf, clips] = await Promise.all([new GLTFLoader().loadAsync(url), loadClips(base)]);
    return new Avatar(name, gltf.scene, seated, clips);
  }

  // motion clips: a mixer drives the whole skeleton; the look-at and mouth sit on top
  private mixer: THREE.AnimationMixer | null = null;
  private clips = new Map<string, THREE.AnimationClip>();
  private current: THREE.AnimationAction | null = null;
  private state = '';
  private gestureTimer = 4 + Math.random() * 6;
  private oneShot: THREE.AnimationAction | null = null;
  private seated: boolean;

  private constructor(name: string, scene: THREE.Group, seated: boolean, clips: THREE.AnimationClip[] | null) {
    this.name = name;
    this.scene = scene;
    this.seated = seated;
    this.root.add(scene);
    if (clips) for (const c of clips) this.clips.set(c.name, c);
    scene.traverse((o) => {
      if ((o as THREE.Bone).isBone) { this.bones.set(clean(o.name), o); this.base.set(clean(o.name), o.rotation.clone()); }
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.frustumCulled = false;
        m.castShadow = false;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat && mat.transparent) { mat.alphaTest = 0.4; mat.depthWrite = true; }
        if (m.morphTargetDictionary && m.morphTargetInfluences && 'jaw_open' in m.morphTargetDictionary) {
          this.morphMeshes.push({ mesh: m, index: m.morphTargetDictionary['jaw_open'] });
        }
      }
    });
    this.head = this.bones.get(B('Head')) ?? scene;
    this.root.updateMatrixWorld(true);
    if (!(name === 'STATUE' || name === 'WRECK' || name.startsWith('ROBOT'))) { this.upgradeMaterials(); this.buildLooks(); }
    if (name === 'STATUE' || name === 'WRECK' || name.startsWith('ROBOT')) {
      // a metal figure: one material, no life in it
      const metal = name === 'WRECK'
        ? new THREE.MeshStandardMaterial({ color: 0x6a4630, metalness: 0.4, roughness: 0.9 })
        : name.startsWith('ROBOT')
          ? new THREE.MeshStandardMaterial({ color: 0xe6e2d8, metalness: 0.55, roughness: 0.38 })
          : new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.95, roughness: 0.32 });
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.material = metal; });
      this.statue = true;
      if (name === 'WRECK') { scene.rotation.x = -Math.PI / 2 + 0.25; scene.rotation.z = 0.3; scene.position.y = 0.25; }
    }
    // Pose in the character's own space: X right, Y up, Z forward. Then store it as the new rest pose.
    // standing arms hang a little out from the body so the hands do not meet in front
    const armDrop = seated ? 0.95 : 0.8;
    this.rotateInRootSpace('LeftArm', new THREE.Vector3(0, 0, 1), -armDrop);
    this.rotateInRootSpace('RightArm', new THREE.Vector3(0, 0, 1), armDrop);
    // forearms turn in a little when seated (hands to the lap) and out when standing (hands by the thighs)
    this.rotateInRootSpace('LeftForeArm', new THREE.Vector3(0, 0, 1), seated ? -0.15 : 0.45);
    this.rotateInRootSpace('RightForeArm', new THREE.Vector3(0, 0, 1), seated ? 0.15 : -0.45);
    if (!seated) {
      // palms turn to face the thighs
      this.rotateInRootSpace('LeftHand', new THREE.Vector3(0, 1, 0), -1.0);
      this.rotateInRootSpace('RightHand', new THREE.Vector3(0, 1, 0), 1.0);
      // a relaxed stance: elbows a little bent, the right arm a touch back, a slight lean
      this.rotateInRootSpace('LeftForeArm', new THREE.Vector3(1, 0, 0), -0.1);
      this.rotateInRootSpace('RightArm', new THREE.Vector3(1, 0, 0), 0.12);
      this.rotateInRootSpace('LeftArm', new THREE.Vector3(1, 0, 0), -0.05);
      this.rotateInRootSpace('Spine', new THREE.Vector3(0, 0, 1), 0.04);
      this.rotateInRootSpace('Spine1', new THREE.Vector3(0, 0, 1), -0.02);
      this.rotateInRootSpace('Head', new THREE.Vector3(0, 0, 1), 0.03);
    }
    if (seated) {
      this.rotateInRootSpace('LeftUpLeg', new THREE.Vector3(1, 0, 0), -1.5);
      this.rotateInRootSpace('RightUpLeg', new THREE.Vector3(1, 0, 0), -1.5);
      this.rotateInRootSpace('LeftLeg', new THREE.Vector3(1, 0, 0), 1.45);
      this.rotateInRootSpace('RightLeg', new THREE.Vector3(1, 0, 0), 1.45);
      // hands rest on the thighs, apart, instead of clasped
      this.rotateInRootSpace('LeftArm', new THREE.Vector3(0, 0, 1), -0.12);
      this.rotateInRootSpace('RightArm', new THREE.Vector3(0, 0, 1), 0.12);
      this.rotateInRootSpace('LeftForeArm', new THREE.Vector3(1, 0, 0), -0.85);
      this.rotateInRootSpace('RightForeArm', new THREE.Vector3(1, 0, 0), -0.85);
      this.rotateInRootSpace('LeftForeArm', new THREE.Vector3(0, 0, 1), -0.2);
      this.rotateInRootSpace('RightForeArm', new THREE.Vector3(0, 0, 1), 0.2);
      this.rotateInRootSpace('Spine', new THREE.Vector3(1, 0, 0), 0.1);
      const hips = this.bones.get(B('Hips'));
      if (hips) {
        const parentScale = hips.parent ? hips.parent.getWorldScale(new THREE.Vector3()).y : 1;
        hips.position.y -= 0.32 / (parentScale || 1);
      }
    }
    for (const [k, b] of this.bones) this.base.set(k, b.rotation.clone());
    this.baseQ = new Map([...this.bones].map(([k, b]) => [k, b.quaternion.clone()]));
    if (this.clips.size && !this.statue) {
      // the clip replaces the hand-made pose; apply its first frame now so the seat height is measured from it
      this.mixer = new THREE.AnimationMixer(scene);
      this.play(this.clipFor('idle'), 0);
      this.mixer.update(0);
    }
    this.root.updateMatrixWorld(true);
    const hipsBone = this.bones.get(B('Hips'));
    this.hipY = hipsBone ? hipsBone.getWorldPosition(new THREE.Vector3()).y - this.root.getWorldPosition(new THREE.Vector3()).y : 0.6;
  }

  /** Repairs the exported materials: hair without its broken normal map, wet eyes, soft brows, and skin with sheen. */
  private upgradeMaterials(): void {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const std = m.material as THREE.MeshStandardMaterial;
      if (!std || !std.isMeshStandardMaterial) return;
      const n = m.name;
      if (/hair/i.test(n)) {
        // the exported tangent-space normal map turns half the hair cards black
        std.normalMap = null; std.roughness = 0.6; std.needsUpdate = true;
      } else if (/eyebrow|eyelash/i.test(n)) {
        // these come without their alpha texture: a dark tint and some transparency soften the solid strips
        std.color.set(0x2a1a12); std.transparent = true; std.opacity = /lash/i.test(n) ? 0.35 : 0.85; std.depthWrite = false;
      } else if (/low-poly|eye/i.test(n)) {
        // the eyeballs: glossy, opaque
        std.roughness = 0.12; std.metalness = 0; std.transparent = false; std.alphaTest = 0; std.needsUpdate = true;
      } else if (/^base/i.test(n)) {
        // skin: opaque, with a soft sheen in place of subsurface scattering
        m.material = new THREE.MeshPhysicalMaterial({
          map: std.map, color: std.color, roughness: 0.55, metalness: 0, side: std.side, depthWrite: true,
          sheen: 0.45, sheenColor: new THREE.Color(0xffd2b8), sheenRoughness: 0.85, specularIntensity: 0.5,
        });
        std.dispose();
      }
    });
  }

  /** Prepares a toon material and an outline hull for every mesh, so the look can switch at any time. */
  private buildLooks(): void {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || (m as unknown as { isOutline?: boolean }).isOutline) return;
      const toonOf = (mat: THREE.Material) => {
        const s = mat as THREE.MeshStandardMaterial;
        // the emissive copy of the map is a flat fill, so the unlit side keeps its colour instead of going black
        return new THREE.MeshToonMaterial({ color: s.color, map: s.map ?? null, emissive: 0x2a2a2a, emissiveMap: s.map ?? null, gradientMap, transparent: s.transparent, alphaTest: s.alphaTest, side: s.side, depthWrite: true });
      };
      const real = m.material;
      const toon = Array.isArray(real) ? real.map(toonOf) : toonOf(real);
      let outline: THREE.Mesh | null = null;
      if (!NO_OUTLINE.test(m.name)) {
        const scale = m.getWorldScale(new THREE.Vector3()).y || 1;
        outline = m.clone();
        (outline as unknown as { isOutline: boolean }).isOutline = true;
        outline.material = outlineMaterial(0.004 / scale);
        outline.position.set(0, 0, 0); outline.quaternion.identity(); outline.scale.set(1, 1, 1);
        if (m.morphTargetInfluences) outline.morphTargetInfluences = m.morphTargetInfluences;
        outline.visible = false;
        m.add(outline);
      }
      this.parts.push({ mesh: m, real, toon, outline });
    });
    this.setLook(Avatar.defaultLook);
  }

  /** Switches between the exported materials and the toon look. */
  setLook(look: Look): void {
    if (this.statue) return;
    for (const p of this.parts) {
      p.mesh.material = look === 'toon' ? p.toon : p.real;
      if (p.outline) p.outline.visible = look === 'toon';
    }
  }

  /** Which clip plays for a state, varied by character so a room full of people does not move in step. */
  private clipFor(state: 'idle' | 'listen' | 'talk' | 'nod' | 'shrug'): string {
    const h = hash(this.name);
    if (this.seated) return state === 'talk' ? 'sitting_talking' : 'sitting_idle';
    switch (state) {
      case 'idle': return h % 2 ? 'breathing_idle' : 'idle';
      case 'listen': return h % 3 === 0 ? 'looking_around' : 'thinking';
      case 'talk': return EMPHATIC.has(this.name) ? 'standing_arguing' : 'talking';
      case 'nod': return 'head_nod_yes';
      case 'shrug': return 'shrugging';
    }
  }

  /** Crossfades to a looping clip. */
  private play(name: string, fade: number): void {
    const clip = this.clips.get(name);
    if (!this.mixer || !clip) return;
    const next = this.mixer.clipAction(clip);
    next.setLoop(THREE.LoopRepeat, Infinity);
    next.timeScale = 0.9 + (hash(this.name + name) % 100) / 500;
    next.enabled = true; next.setEffectiveWeight(1);
    if (this.current && this.current !== next) {
      next.reset().play();
      if (fade > 0) this.current.crossFadeTo(next, fade, true); else this.current.stop();
    } else if (!this.current) {
      next.play();
      next.time = (hash(this.name + name) % 1000) / 1000 * clip.duration;
    }
    this.current = next;
  }

  /** Plays a clip once over the current loop, then returns to it. */
  private playOnce(name: string): void {
    const clip = this.clips.get(name);
    if (!this.mixer || !clip || this.oneShot) return;
    const a = this.mixer.clipAction(clip);
    a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false;
    a.reset().setEffectiveWeight(1).play();
    if (this.current) { this.current.crossFadeTo(a, 0.35, false); }
    this.oneShot = a;
    const onDone = (e: { action: THREE.AnimationAction }) => {
      if (e.action !== a) return;
      this.mixer!.removeEventListener('finished', onDone);
      this.oneShot = null;
      const back = this.current; this.current = null;
      if (back) { back.reset().play(); a.crossFadeTo(back, 0.35, false); this.current = back; }
    };
    this.mixer.addEventListener('finished', onDone);
  }

  private hipY = 0.6;
  /** Root height that puts the underside of the seated thighs on a seat of the given top height. */
  seatOffset(seatTop: number): number { return seatTop - (this.hipY - 0.1); }

  private baseQ = new Map<string, THREE.Quaternion>();

  /** Rotates a bone about an axis given in the character's root space, keeping the bone's children attached. */
  private rotateInRootSpace(bone: string, axis: THREE.Vector3, angle: number, base?: THREE.Quaternion): void {
    const b = this.bones.get(B(bone));
    if (!b || !b.parent) return;
    const rootQ = this.root.getWorldQuaternion(new THREE.Quaternion());
    const parentQ = b.parent.getWorldQuaternion(new THREE.Quaternion());
    const deltaWorld = new THREE.Quaternion().setFromAxisAngle(axis.clone().applyQuaternion(rootQ).normalize(), angle);
    const local = parentQ.clone().invert().multiply(deltaWorld).multiply(parentQ);
    b.quaternion.copy(local.multiply(base ?? b.quaternion));
    b.updateMatrixWorld(true);
  }

  lookAt(target: THREE.Vector3 | null): void { this.lookTarget = target; }
  face(target: THREE.Vector3 | null): void { this.faceTarget = target; }
  setBaseYaw(y: number): void { this.baseYaw = y; this.root.rotation.y = y; }

  update(dt: number, time: number): void {
    if (this.statue) return;
    const t = time + this.phase;
    const k = Math.min(1, dt * 4);
    // body turn
    const wantYaw = this.faceTarget ? Math.atan2(this.faceTarget.x - this.root.position.x, this.faceTarget.z - this.root.position.z) : this.baseYaw;
    let dy = wantYaw - this.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.root.rotation.y += dy * Math.min(1, dt * 2.5);
    if (this.mixer) {
      // clip state: talk, listen (someone is looking at us), or idle, with the odd nod while listening
      const want = this.talking ? 'talk' : this.lookTarget ? 'listen' : 'idle';
      if (want !== this.state) { this.state = want; if (!this.oneShot) this.play(this.clipFor(want), 0.5); }
      this.gestureTimer -= dt;
      if (this.gestureTimer <= 0) {
        this.gestureTimer = 6 + Math.random() * 8;
        if (!this.seated && !this.talking && this.lookTarget) this.playOnce(this.clipFor(Math.random() < 0.7 ? 'nod' : 'shrug'));
      }
      this.mixer.update(dt);
    } else {
      // no clips: breathing, sway, a slow weight shift, and the free arm drifting
      this.rotateInRootSpace('Spine1', new THREE.Vector3(1, 0, 0), Math.sin(t * 1.3) * 0.015, this.baseQ.get(B('Spine1')));
      this.rotateInRootSpace('Spine1', new THREE.Vector3(0, 1, 0), Math.sin(t * 0.37) * 0.03);
      this.rotateInRootSpace('Spine', new THREE.Vector3(0, 0, 1), Math.sin(t * 0.23) * 0.02, this.baseQ.get(B('Spine')));
      this.rotateInRootSpace('LeftArm', new THREE.Vector3(1, 0, 0), Math.sin(t * 0.5) * 0.03, this.baseQ.get(B('LeftArm')));
      this.rotateInRootSpace('LeftArm', new THREE.Vector3(0, 0, 1), Math.sin(t * 0.41) * 0.02);
    }
    // head look-at in the character's own frame
    let yaw = Math.sin(t * 0.3) * 0.2, pitch = 0;
    if (this.lookTarget) {
      const local = this.root.worldToLocal(this.lookTarget.clone());
      const headWorld = new THREE.Vector3(); this.head.getWorldPosition(headWorld);
      const hy = headWorld.y - this.root.position.y;
      yaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -1.0, 1.0);
      pitch = THREE.MathUtils.clamp(Math.atan2(local.y - hy, Math.hypot(local.x, local.z)), -0.45, 0.45);
    }
    this.headYaw += (yaw - this.headYaw) * k;
    this.headPitch += (pitch - this.headPitch) * k;
    const neckBase = this.mixer ? undefined : this.baseQ.get(B('Neck')), headBase = this.mixer ? undefined : this.baseQ.get(B('Head'));
    this.rotateInRootSpace('Neck', new THREE.Vector3(0, 1, 0), this.headYaw * 0.35, neckBase);
    this.rotateInRootSpace('Neck', new THREE.Vector3(1, 0, 0), -this.headPitch * 0.35);
    this.rotateInRootSpace('Head', new THREE.Vector3(0, 1, 0), this.headYaw * 0.65, headBase);
    this.rotateInRootSpace('Head', new THREE.Vector3(1, 0, 0), -this.headPitch * 0.65);
    if (!this.mixer) {
      // talking gestures: the right forearm lifts and turns
      const g = this.talking ? 0.5 + Math.sin(t * 2.1) * 0.3 : 0;
      this.gesture += (g - this.gesture) * Math.min(1, dt * 5);
      this.rotateInRootSpace('RightArm', new THREE.Vector3(1, 0, 0), -this.gesture * 0.35, this.baseQ.get(B('RightArm')));
      this.rotateInRootSpace('RightForeArm', new THREE.Vector3(1, 0, 0), -this.gesture * 1.1, this.baseQ.get(B('RightForeArm')));
      this.rotateInRootSpace('RightForeArm', new THREE.Vector3(0, 1, 0), this.gesture * 0.4);
    }
    // mouth
    const target = this.talking ? Math.min(1, this.mouthOpen * 1.6) : 0;
    for (const m of this.morphMeshes) {
      const cur = m.mesh.morphTargetInfluences![m.index];
      m.mesh.morphTargetInfluences![m.index] = cur + (target - cur) * Math.min(1, dt * 25);
    }
  }

  dispose(): void {
    for (const p of this.parts) {
      for (const mat of Array.isArray(p.toon) ? p.toon : [p.toon]) mat.dispose();
      if (p.outline) (p.outline.material as THREE.Material).dispose();
      p.mesh.material = p.real;
    }
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) { for (const v of Object.values(mat)) if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose(); mat.dispose(); }
      }
    });
  }
}
