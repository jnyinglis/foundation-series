import * as THREE from 'three';
import type { World, PlanetType } from './data/worlds';
import { QUAD_VERT, PLANET_BAKE_FRAG, PLANET_VERT, PLANET_FRAG } from './shaders/planet';
import { ATMO_VERT, ATMO_FRAG, CLOUD_VERT } from './shaders/atmosphere';
import { CLOUD_BAKE_FRAG, CLOUD_FRAG } from './shaders/clouds';
import { SUN_VERT, SUN_FRAG } from './shaders/sun';
import { SKY_VERT, NEBULA_FRAG, SKY_FRAG, STAR_POINTS_VERT, STAR_POINTS_FRAG, DUST_VERT, DUST_FRAG } from './shaders/skybox';

const TYPE_INDEX: Record<PlanetType, number> = {
  terrestrial: 0, desert: 1, ice: 2, ocean: 3, metal: 4, barren: 5, lush: 6,
};

interface TypeStyle {
  atmo: THREE.Color;
  atmoStrength: number;
  cloudCover: number;
  cloudTint: THREE.Color;
  lights: number;
  relief: number;
}

const STYLE: Record<PlanetType, TypeStyle> = {
  terrestrial: { atmo: new THREE.Color(0.35, 0.6, 1.0), atmoStrength: 1.4, cloudCover: 0.55, cloudTint: new THREE.Color(1, 1, 1), lights: 0.6, relief: 60 },
  lush: { atmo: new THREE.Color(0.4, 0.75, 0.9), atmoStrength: 1.5, cloudCover: 0.7, cloudTint: new THREE.Color(1, 1, 1), lights: 0.5, relief: 55 },
  ocean: { atmo: new THREE.Color(0.3, 0.55, 1.0), atmoStrength: 1.6, cloudCover: 0.65, cloudTint: new THREE.Color(1, 1, 1), lights: 0.2, relief: 50 },
  desert: { atmo: new THREE.Color(0.9, 0.6, 0.35), atmoStrength: 1.1, cloudCover: 0.15, cloudTint: new THREE.Color(1, 0.9, 0.8), lights: 0.5, relief: 70 },
  ice: { atmo: new THREE.Color(0.6, 0.75, 1.0), atmoStrength: 1.2, cloudCover: 0.4, cloudTint: new THREE.Color(0.95, 0.97, 1), lights: 0.15, relief: 55 },
  metal: { atmo: new THREE.Color(0.55, 0.65, 0.8), atmoStrength: 1.0, cloudCover: 0.2, cloudTint: new THREE.Color(0.85, 0.85, 0.9), lights: 1.0, relief: 35 },
  barren: { atmo: new THREE.Color(0.6, 0.5, 0.45), atmoStrength: 0.35, cloudCover: 0.0, cloudTint: new THREE.Color(1, 1, 1), lights: 0.0, relief: 80 },
};

function seededRandom(seed: number): () => number {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function glowTexture(): THREE.Texture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(255,250,235,0.9)');
  g.addColorStop(0.3, 'rgba(255,220,170,0.35)');
  g.addColorStop(0.6, 'rgba(255,190,120,0.08)');
  g.addColorStop(1, 'rgba(255,170,100,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Render a full-screen shader into an equirectangular map. */
function bakeMap(renderer: THREE.WebGLRenderer, material: THREE.ShaderMaterial, w: number, h: number, halfFloat = false): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    type: halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  });
  const scene = new THREE.Scene();
  const geo = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geo, material));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  renderer.setRenderTarget(prev);
  geo.dispose();
  return rt;
}

interface PlanetMaps { albedo: THREE.WebGLRenderTarget; data: THREE.WebGLRenderTarget }

function bakePlanet(renderer: THREE.WebGLRenderer, seed: number, type: PlanetType, lights: number, size: number): PlanetMaps {
  const mat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, fragmentShader: PLANET_BAKE_FRAG, depthTest: false, depthWrite: false,
    uniforms: { uSeed: { value: seed }, uType: { value: TYPE_INDEX[type] }, uPass: { value: 0 }, uLightsDensity: { value: lights } },
  });
  const albedo = bakeMap(renderer, mat, size, size / 2);
  mat.uniforms.uPass.value = 1;
  const data = bakeMap(renderer, mat, size / 2, size / 4, true);
  mat.dispose();
  return { albedo, data };
}

function planetMaterial(maps: PlanetMaps, sunDir: THREE.Vector3, seed: number, type: PlanetType, style: TypeStyle): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: PLANET_VERT,
    fragmentShader: PLANET_FRAG,
    uniforms: {
      uAlbedo: { value: maps.albedo.texture },
      uData: { value: maps.data.texture },
      uDataTexel: { value: new THREE.Vector2(1 / maps.data.width, 1 / maps.data.height) },
      uSunDir: { value: sunDir },
      uSeed: { value: seed },
      uType: { value: TYPE_INDEX[type] },
      uLod: { value: 0 },
      uAtmoColor: { value: style.atmo },
      uRelief: { value: style.relief },
      uEmissiveScale: { value: type === 'metal' ? 2.2 : 1.6 },
    },
  });
}

export class StarSystem {
  readonly scene = new THREE.Scene();
  readonly world: World;
  readonly sunDir = new THREE.Vector3();
  readonly sunPos = new THREE.Vector3();
  readonly planetRadius: number;
  private planetMat: THREE.ShaderMaterial;
  private cloudMat: THREE.ShaderMaterial;
  private sunMat: THREE.ShaderMaterial;
  private planet: THREE.Mesh;
  private clouds: THREE.Mesh;
  private sky: THREE.Mesh;
  private stars: THREE.Points;
  private dust: THREE.Points;
  private dustPositions: Float32Array;
  private moons: { mesh: THREE.Mesh; dist: number; speed: number; phase: number }[] = [];
  private disposables: { dispose(): void }[] = [];

  constructor(world: World, renderer: THREE.WebGLRenderer) {
    this.world = world;
    this.planetRadius = world.radius;
    const rnd = seededRandom(world.seed);
    const style = STYLE[world.type];

    // Sun
    const sunAngle = rnd() * Math.PI * 2;
    const sunElev = (rnd() - 0.5) * 0.8;
    this.sunDir.set(Math.cos(sunAngle) * Math.cos(sunElev), Math.sin(sunElev), Math.sin(sunAngle) * Math.cos(sunElev)).normalize();
    const sunDist = 60000;
    this.sunPos.copy(this.sunDir).multiplyScalar(sunDist);
    const starColor = new THREE.Color(world.starColor);
    this.sunMat = new THREE.ShaderMaterial({
      vertexShader: SUN_VERT,
      fragmentShader: SUN_FRAG,
      uniforms: { uColor: { value: starColor }, uTime: { value: 0 } },
    });
    const sunGeo = new THREE.SphereGeometry(2200, 48, 32);
    const sun = new THREE.Mesh(sunGeo, this.sunMat);
    sun.position.copy(this.sunPos);
    this.scene.add(sun);
    this.disposables.push(sunGeo, this.sunMat);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTexture(), color: starColor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(22000);
    glow.position.copy(this.sunPos);
    this.scene.add(glow);
    this.disposables.push(glowMat);

    // Planet: bake the surface once, then light it per pixel.
    const maps = bakePlanet(renderer, world.seed, world.type, style.lights, 4096);
    this.disposables.push(maps.albedo, maps.data);
    const planetGeo = new THREE.SphereGeometry(world.radius, 128, 96);
    this.planetMat = planetMaterial(maps, this.sunDir, world.seed, world.type, style);
    this.planet = new THREE.Mesh(planetGeo, this.planetMat);
    this.planet.rotation.z = (rnd() - 0.5) * 0.5;
    this.scene.add(this.planet);
    this.disposables.push(planetGeo, this.planetMat);

    // Clouds
    const cloudBake = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: CLOUD_BAKE_FRAG, depthTest: false, depthWrite: false,
      uniforms: { uSeed: { value: world.seed }, uCover: { value: style.cloudCover } },
    });
    const cloudMap = bakeMap(renderer, cloudBake, 2048, 1024);
    cloudBake.dispose();
    this.disposables.push(cloudMap);
    const cloudGeo = new THREE.SphereGeometry(world.radius * 1.012, 96, 72);
    this.cloudMat = new THREE.ShaderMaterial({
      vertexShader: CLOUD_VERT,
      fragmentShader: CLOUD_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uClouds: { value: cloudMap.texture },
        uSunDir: { value: this.sunDir },
        uTime: { value: 0 },
        uTint: { value: style.cloudTint },
      },
    });
    this.clouds = new THREE.Mesh(cloudGeo, this.cloudMat);
    this.clouds.visible = style.cloudCover > 0.01;
    this.scene.add(this.clouds);
    this.disposables.push(cloudGeo, this.cloudMat);

    // Atmosphere shell
    const atmoScale = 1.07;
    const atmoGeo = new THREE.SphereGeometry(world.radius * atmoScale, 96, 72);
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: ATMO_VERT,
      fragmentShader: ATMO_FRAG,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uSunDir: { value: this.sunDir },
        uColor: { value: style.atmo },
        uScale: { value: atmoScale },
        uStrength: { value: style.atmoStrength },
        uRadius: { value: world.radius },
      },
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    this.scene.add(atmo);
    this.disposables.push(atmoGeo, atmoMat);

    // Rings
    if (world.hasRings) {
      const inner = world.radius * 1.5;
      const outer = world.radius * 2.6;
      const ringGeo = new THREE.RingGeometry(inner, outer, 180, 1);
      const ringMat = new THREE.ShaderMaterial({
        transparent: true, side: THREE.DoubleSide, depthWrite: false,
        uniforms: { uSunDir: { value: this.sunDir }, uInner: { value: inner }, uOuter: { value: outer }, uSeed: { value: world.seed } },
        vertexShader: /* glsl */ `
          varying vec3 vWorldPos; varying vec2 vLocal;
          void main(){ vLocal = position.xy; vec4 wp = modelMatrix * vec4(position,1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
        fragmentShader: /* glsl */ `
          precision highp float;
          uniform vec3 uSunDir; uniform float uInner; uniform float uOuter; uniform float uSeed;
          varying vec3 vWorldPos; varying vec2 vLocal;
          float h(float x){ return fract(sin(x*127.1+uSeed)*43758.5453); }
          void main(){
            float r = length(vLocal);
            float t = (r - uInner) / (uOuter - uInner);
            float bands = 0.0;
            for (int i=0;i<6;i++){ float f = float(i)*3.7+1.0; bands += (0.5+0.5*sin(t*f*12.0 + h(f)*6.28)) / 6.0; }
            float gap = smoothstep(0.02, 0.08, abs(t-0.62)) * smoothstep(0.0, 0.03, t) * (1.0 - smoothstep(0.92, 1.0, t));
            float alpha = (0.25 + 0.6*bands) * gap;
            vec3 toSun = normalize(uSunDir);
            vec3 p = vWorldPos; float along = dot(p, -toSun);
            vec3 perp = p + toSun * along; float shadow = 1.0;
            if (along > 0.0 && length(perp) < uInner / 1.5) shadow = 0.1;
            vec3 col = mix(vec3(0.55,0.5,0.45), vec3(0.85,0.8,0.7), bands) * shadow;
            gl_FragColor = vec4(pow(col, vec3(2.2)) * 0.9, alpha);
          }`,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + (rnd() - 0.5) * 0.4;
      ring.rotation.y = (rnd() - 0.5) * 0.4;
      this.scene.add(ring);
      this.disposables.push(ringGeo, ringMat);
    }

    // Moons
    for (let i = 0; i < (world.moons ?? 0); i++) {
      const mr = world.radius * (0.12 + rnd() * 0.12);
      const mg = new THREE.SphereGeometry(mr, 48, 32);
      const mmaps = bakePlanet(renderer, world.seed * 3.1 + i * 7, 'barren', 0, 1024);
      const mm = planetMaterial(mmaps, this.sunDir, world.seed * 3.1 + i * 7, 'barren', { ...STYLE.barren, atmo: new THREE.Color(0, 0, 0) });
      const mesh = new THREE.Mesh(mg, mm);
      this.scene.add(mesh);
      this.moons.push({ mesh, dist: world.radius * (3.5 + i * 2.2 + rnd()), speed: 0.02 + rnd() * 0.02, phase: rnd() * Math.PI * 2 });
      this.disposables.push(mg, mm, mmaps.albedo, mmaps.data);
    }

    // Sky: bake the slow nebula shader into a cube map once, then draw it with one sample.
    const skyGeo = new THREE.SphereGeometry(10, 48, 32);
    const nebA = new THREE.Color().setHSL(rnd(), 0.7, 0.35);
    const nebB = new THREE.Color().setHSL(rnd(), 0.8, 0.45);
    const coreDir = Math.atan2(-world.pos[2], -world.pos[0]);
    const coreDist = Math.hypot(world.pos[0], world.pos[2]);
    const nebulaMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: NEBULA_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false,
      uniforms: {
        uSeed: { value: world.seed * 0.173 },
        uNebulaA: { value: nebA }, uNebulaB: { value: nebB },
        uCoreDir: { value: coreDir },
        uCoreStrength: { value: THREE.MathUtils.clamp(1.6 - coreDist / 40, 0.4, 1.6) },
      },
    });
    const nebulaRT = new THREE.WebGLCubeRenderTarget(512, {
      type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
    });
    const bakeScene = new THREE.Scene();
    const bakeMesh = new THREE.Mesh(skyGeo, nebulaMat);
    bakeMesh.frustumCulled = false;
    bakeScene.add(bakeMesh);
    const cubeCam = new THREE.CubeCamera(0.1, 100, nebulaRT);
    cubeCam.update(renderer, bakeScene);
    nebulaMat.dispose();
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false,
      uniforms: { uNebula: { value: nebulaRT.texture } },
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
    this.disposables.push(skyGeo, skyMat, nebulaRT);

    // Stars as points on a far sphere that follows the camera.
    const starCount = 6000;
    const sPos = new Float32Array(starCount * 3);
    const sSize = new Float32Array(starCount);
    const sCol = new Float32Array(starCount * 3);
    const srnd = seededRandom(world.seed * 7 + 3);
    const gauss = () => { let u = 0, v = 0; while (u === 0) u = srnd(); while (v === 0) v = srnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const sc = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      let x = gauss(), y = gauss(), z = gauss();
      if (i % 3 === 0) y *= 0.25;
      const len = Math.hypot(x, y, z) || 1;
      const R = 200000;
      sPos[i * 3] = (x / len) * R; sPos[i * 3 + 1] = (y / len) * R; sPos[i * 3 + 2] = (z / len) * R;
      const b = Math.pow(srnd(), 5.0);
      // stay below the bloom threshold: bright stars are bigger, not hotter
      const bright = 0.12 + b * 0.85;
      sSize[i] = 1.2 + b * 2.8 + srnd() * 0.5;
      const t = srnd();
      sc.setHSL(t < 0.5 ? 0.6 : 0.09, 0.35 + srnd() * 0.3, 0.7 + srnd() * 0.3);
      sCol[i * 3] = sc.r * bright; sCol[i * 3 + 1] = sc.g * bright; sCol[i * 3 + 2] = sc.b * bright;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(sCol, 3));
    const starMat = new THREE.ShaderMaterial({
      vertexShader: STAR_POINTS_VERT, fragmentShader: STAR_POINTS_FRAG,
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
      uniforms: { uPixelRatio: { value: renderer.getPixelRatio() } },
    });
    this.stars = new THREE.Points(starGeo, starMat);
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -9;
    this.scene.add(this.stars);
    this.disposables.push(starGeo, starMat);

    // Dust particles for a sense of motion
    const count = 350;
    this.dustPositions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) this.dustPositions[i] = (Math.random() - 0.5) * 1600;
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    const dustMat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uPixelRatio: { value: renderer.getPixelRatio() } },
    });
    this.dust = new THREE.Points(dustGeo, dustMat);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
    this.disposables.push(dustGeo, dustMat);
  }

  setPixelRatio(pr: number): void {
    (this.stars.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = pr;
    (this.dust.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = pr;
  }

  update(dt: number, time: number, camera: THREE.Camera): void {
    this.cloudMat.uniforms.uTime.value = time;
    this.sunMat.uniforms.uTime.value = time;
    this.planetMat.uniforms.uLod.value = camera.position.length() < this.planetRadius * 3 ? 1 : 0;
    this.planet.rotation.y += dt * 0.004;
    this.clouds.rotation.y += dt * 0.0045;
    for (const m of this.moons) {
      const a = m.phase + time * m.speed;
      m.mesh.position.set(Math.cos(a) * m.dist, Math.sin(a * 0.7) * m.dist * 0.1, Math.sin(a) * m.dist);
      m.mesh.rotation.y += dt * 0.05;
    }
    const half = 800;
    const cp = camera.position;
    const arr = this.dustPositions;
    for (let i = 0; i < arr.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const c = k === 0 ? cp.x : k === 1 ? cp.y : cp.z;
        let v = arr[i + k];
        if (v - c > half) v -= half * 2;
        else if (v - c < -half) v += half * 2;
        arr[i + k] = v;
      }
    }
    (this.dust.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
