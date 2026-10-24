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
};

/** Robots and wrecks reuse the statue file with a material override. */
export function avatarFileFor(name: string): string | undefined {
  if (name.startsWith('ROBOT')) return 'statue';
  return AVATAR_FILES[name];
}

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

  static async load(name: string, url: string, seated: boolean): Promise<Avatar> {
    const gltf = await new GLTFLoader().loadAsync(url);
    return new Avatar(name, gltf.scene, seated);
  }

  private constructor(name: string, scene: THREE.Group, seated: boolean) {
    this.name = name;
    this.scene = scene;
    this.root.add(scene);
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
    this.rotateInRootSpace('LeftArm', new THREE.Vector3(0, 0, 1), -0.95);
    this.rotateInRootSpace('RightArm', new THREE.Vector3(0, 0, 1), 0.95);
    this.rotateInRootSpace('LeftForeArm', new THREE.Vector3(0, 0, 1), -0.15);
    this.rotateInRootSpace('RightForeArm', new THREE.Vector3(0, 0, 1), 0.15);
    if (seated) {
      this.rotateInRootSpace('LeftUpLeg', new THREE.Vector3(1, 0, 0), -1.5);
      this.rotateInRootSpace('RightUpLeg', new THREE.Vector3(1, 0, 0), -1.5);
      this.rotateInRootSpace('LeftLeg', new THREE.Vector3(1, 0, 0), 1.45);
      this.rotateInRootSpace('RightLeg', new THREE.Vector3(1, 0, 0), 1.45);
      this.rotateInRootSpace('LeftForeArm', new THREE.Vector3(1, 0, 0), -1.0);
      this.rotateInRootSpace('RightForeArm', new THREE.Vector3(1, 0, 0), -1.0);
      this.rotateInRootSpace('Spine', new THREE.Vector3(1, 0, 0), 0.1);
      const hips = this.bones.get(B('Hips'));
      if (hips) {
        const parentScale = hips.parent ? hips.parent.getWorldScale(new THREE.Vector3()).y : 1;
        hips.position.y -= 0.32 / (parentScale || 1);
      }
    }
    for (const [k, b] of this.bones) this.base.set(k, b.rotation.clone());
    this.baseQ = new Map([...this.bones].map(([k, b]) => [k, b.quaternion.clone()]));
  }

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
    // breathing and sway
    this.rotateInRootSpace('Spine1', new THREE.Vector3(1, 0, 0), Math.sin(t * 1.3) * 0.015, this.baseQ.get(B('Spine1')));
    this.rotateInRootSpace('Spine1', new THREE.Vector3(0, 1, 0), Math.sin(t * 0.37) * 0.03);
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
    this.rotateInRootSpace('Neck', new THREE.Vector3(0, 1, 0), this.headYaw * 0.35, this.baseQ.get(B('Neck')));
    this.rotateInRootSpace('Neck', new THREE.Vector3(1, 0, 0), -this.headPitch * 0.35);
    this.rotateInRootSpace('Head', new THREE.Vector3(0, 1, 0), this.headYaw * 0.65, this.baseQ.get(B('Head')));
    this.rotateInRootSpace('Head', new THREE.Vector3(1, 0, 0), -this.headPitch * 0.65);
    // talking gestures: the right forearm lifts and turns
    const g = this.talking ? 0.5 + Math.sin(t * 2.1) * 0.3 : 0;
    this.gesture += (g - this.gesture) * Math.min(1, dt * 5);
    this.rotateInRootSpace('RightArm', new THREE.Vector3(1, 0, 0), -this.gesture * 0.35, this.baseQ.get(B('RightArm')));
    this.rotateInRootSpace('RightForeArm', new THREE.Vector3(1, 0, 0), -this.gesture * 1.1, this.baseQ.get(B('RightForeArm')));
    this.rotateInRootSpace('RightForeArm', new THREE.Vector3(0, 1, 0), this.gesture * 0.4);
    // mouth
    const target = this.talking ? Math.min(1, this.mouthOpen * 1.6) : 0;
    for (const m of this.morphMeshes) {
      const cur = m.mesh.morphTargetInfluences![m.index];
      m.mesh.morphTargetInfluences![m.index] = cur + (target - cur) * Math.min(1, dt * 25);
    }
  }

  dispose(): void {
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
