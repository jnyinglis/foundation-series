import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { WORLDS, START_WORLD_ID, FUEL_CAPACITY, distance, worldById, type World } from './data/worlds';
import { StarSystem } from './system';
import { Ship } from './ship';
import { GalaxyMap } from './galaxy';
import { Hud } from './hud';
import { AudioEngine } from './audio';
import { JumpShader } from './shaders/jump';

interface SaveState { worldId: string; fuel: number; credits: number; day: number; visited: string[] }

const SAVE_KEY = 'foundation-save-v1';
function loadState(): SaveState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as SaveState;
      if (WORLDS.some((w) => w.id === s.worldId)) return s;
    }
  } catch { /* ignore */ }
  return { worldId: START_WORLD_ID, fuel: FUEL_CAPACITY, credits: 1200, day: 0, visited: [START_WORLD_ID] };
}
function saveState(s: SaveState): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const MAX_PR = Math.min(window.devicePixelRatio, 1.5);
let pixelRatio = MAX_PR;
renderer.setPixelRatio(pixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const camera = new THREE.PerspectiveCamera(62, 1, 1, 300000);
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(new THREE.Scene(), camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.6, 1.0);
const jumpPass = new ShaderPass(JumpShader);
jumpPass.enabled = false;
const output = new OutputPass();
composer.addPass(renderPass);
composer.addPass(bloom);
composer.addPass(jumpPass);
composer.addPass(output);

const state = loadState();
let world: World = worldById(state.worldId);
let system = new StarSystem(world, renderer);
const ship = new Ship(canvas);
ship.enabled = false;
const hud = new Hud();
const audio = new AudioEngine();
const map = new GalaxyMap(canvas, document.getElementById('map-labels')!, world);

let mapOpen = false;
let jumping = false;
let jumpT = 0;
const JUMP_SECONDS = 4.2;
let jumpTarget: World | null = null;
let started = false;
let orbiting = false;

function placeShip(extra = 0): void {
  // Start on the day side, looking at the planet with the sun off to one side.
  const side = new THREE.Vector3().crossVectors(system.sunDir, new THREE.Vector3(0, 1, 0)).normalize();
  const start = system.sunDir.clone().multiplyScalar(0.75).add(side.multiplyScalar(0.65)).normalize().multiplyScalar(system.planetRadius * 5.5 + extra);
  start.y += system.planetRadius * 0.6;
  ship.reset(start, new THREE.Vector3(0, 0, 0));
}

function enterSystem(w: World, extra = 0): void {
  system.dispose();
  world = w;
  system = new StarSystem(w, renderer);
  renderPass.scene = system.scene;
  placeShip(extra);
  hud.setSystem(w);
  map.setCurrent(w);
  orbiting = false;
  if (!state.visited.includes(w.id)) state.visited.push(w.id);
  state.worldId = w.id;
  saveState(state);
}

function dateText(): string {
  const year = 50 + Math.floor(state.day / 365);
  const day = (state.day % 365) + 1;
  return `F.E. ${year} · Day ${day}`;
}

function openMap(): void {
  if (jumping) return;
  mapOpen = true;
  ship.enabled = false;
  ship.releasePointer();
  hud.hideInfo();
  hud.hideHelp();
  map.open();
  renderPass.scene = map.scene;
  renderPass.camera = map.camera;
  bloom.strength = 1.4;
  hud.showMap(true);
  hud.setMapTarget(world, null, 0, false, state.fuel);
  audio.blip(660);
}

function closeMap(): void {
  mapOpen = false;
  ship.enabled = true;
  map.close();
  renderPass.scene = system.scene;
  renderPass.camera = camera;
  bloom.strength = 0.7;
  hud.showMap(false);
  audio.blip(440);
}

function beginJump(): void {
  const target = map.selected;
  if (!target || !map.inRange(target) || jumping) return;
  const d = distance(world, target);
  if (state.fuel < d) { hud.showMessage('Not enough fuel for this jump.'); return; }
  jumpTarget = target;
  state.fuel -= d;
  state.day += Math.round(d * 3) + 1;
  if (mapOpen) closeMap();
  jumping = true;
  jumpT = 0;
  jumpPass.enabled = true;
  ship.enabled = false;
  ship.throttle = 1;
  hud.setStatus('HYPERSPACE JUMP', 'warn');
  hud.hideInfo();
  audio.jump(JUMP_SECONDS);
}

map.onSelect = (w) => {
  if (w) audio.blip(990);
  hud.setMapTarget(world, w, w ? distance(world, w) : 0, w ? map.inRange(w) : false, state.fuel);
};
hud.onJump(beginJump);

window.addEventListener('keydown', (e) => {
  if (!started) return;
  switch (e.code) {
    case 'KeyM': mapOpen ? closeMap() : openMap(); break;
    case 'Escape': if (mapOpen) closeMap(); hud.hideInfo(); hud.hideHelp(); break;
    case 'KeyJ': if (map.selected) beginJump(); break;
    case 'KeyI': if (!mapOpen) { hud.infoOpen ? hud.hideInfo() : hud.showInfo(world); } break;
    case 'KeyH': hud.toggleHelp(); break;
  }
});

function resize(): void {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(pixelRatio);
  composer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  system.setPixelRatio(pixelRatio);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  map.resize(w, h);
  jumpPass.uniforms.uAspect.value = w / h;
}
window.addEventListener('resize', resize);
resize();

// Intro
const intro = document.getElementById('intro')!;
function start(): void {
  if (started) return;
  started = true;
  audio.init();
  ship.enabled = true;
  ship.throttle = 0.2;
  intro.classList.add('hide');
  setTimeout(() => (intro.style.display = 'none'), 1400);
  hud.showMessage(`Welcome to ${world.name}. Press H for controls.`, 5000);
}
intro.addEventListener('click', start);
window.addEventListener('keydown', (e) => { if (!started && e.code !== 'Escape') start(); }, { once: false });

renderPass.scene = system.scene;
hud.setSystem(world);
placeShip();

const clock = new THREE.Clock();
const tmpV = new THREE.Vector3();
let timeAcc = 0;
let saveTimer = 0;
// Adaptive resolution: drop the pixel ratio when the frame rate falls, raise it when it recovers.
let fpsAcc = 0, fpsFrames = 0;
function adaptQuality(dt: number): void {
  fpsAcc += dt; fpsFrames++;
  if (fpsAcc < 2) return;
  const fps = fpsFrames / fpsAcc;
  fpsAcc = 0; fpsFrames = 0;
  if (fps < 40 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.25); resize(); }
  else if (fps > 58 && pixelRatio < MAX_PR) { pixelRatio = Math.min(MAX_PR, pixelRatio + 0.25); resize(); }
}

function frame(): void {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  timeAcc += dt;
  const w = window.innerWidth, h = window.innerHeight;

  if (jumping) {
    jumpT += dt / JUMP_SECONDS;
    jumpPass.uniforms.uProgress.value = jumpT;
    jumpPass.uniforms.uTime.value = timeAcc;
    const jumpSpeed = jumpT < 0.5 ? 4000 * Math.min(jumpT * 3, 1) : 4000 * Math.max(0, 1 - (jumpT - 0.5) * 2);
    ship.position.addScaledVector(ship.forward(tmpV), dt * jumpSpeed);
    if (jumpT >= 0.5 && jumpTarget) {
      enterSystem(jumpTarget, 4000 * JUMP_SECONDS * 0.25);
      jumpTarget = null;
    }
    if (jumpT >= 1) {
      jumping = false;
      jumpPass.enabled = false;
      ship.enabled = true;
      ship.throttle = 0.3;
      hud.showMessage(`Arrived at ${world.name}.`, 3500);
    }
  }

  if (mapOpen) {
    map.update(w, h);
  } else {
    ship.update(dt, system.planetRadius);
    camera.position.copy(ship.position);
    camera.quaternion.copy(ship.quaternion);
    system.update(dt, timeAcc, camera);
    // gentle boost shake
    if (ship.boost && ship.speed > 1000) {
      const s = 0.4;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
    camera.updateMatrixWorld();

    // target marker on the planet
    tmpV.set(0, 0, 0).project(camera);
    const behind = tmpV.z > 1;
    let sx = ((tmpV.x + 1) / 2) * w;
    let sy = ((1 - tmpV.y) / 2) * h;
    const margin = 40;
    let offscreen = behind || sx < margin || sx > w - margin || sy < margin || sy > h - margin;
    let angle = 0;
    if (offscreen) {
      let dx = tmpV.x, dy = -tmpV.y;
      if (behind) { dx = -dx; dy = -dy; }
      angle = Math.atan2(dy, dx);
      const rx = (w / 2 - margin), ry = (h / 2 - margin);
      const k = Math.min(Math.abs(rx / Math.cos(angle)), Math.abs(ry / Math.sin(angle)));
      sx = w / 2 + Math.cos(angle) * k;
      sy = h / 2 + Math.sin(angle) * k;
    }
    const distKm = Math.max(0, (ship.position.length() - system.planetRadius) * 10);
    hud.setMarker(sx, sy, !jumping, offscreen, angle, `${world.name.toUpperCase()}  ${distKm >= 10000 ? (distKm / 1000).toFixed(1) + 'k' : Math.round(distKm)} km`);
    hud.setFlight(ship.speed, ship.throttle, ship.boost, distKm, state.fuel, FUEL_CAPACITY, state.credits, dateText());
    audio.setThrottle(ship.throttle, ship.boost);

    const nowOrbiting = ship.position.length() < system.planetRadius * 1.6;
    if (nowOrbiting && !orbiting) {
      orbiting = true;
      const refuel = FUEL_CAPACITY - state.fuel;
      state.fuel = FUEL_CAPACITY;
      hud.showMessage(refuel > 0.5 ? `Orbit established. Refuelled at ${world.name}.` : `Orbit established over ${world.name}.`, 3500);
      audio.blip(1200);
      if (!hud.infoOpen) hud.showInfo(world);
      saveState(state);
    } else if (!nowOrbiting && orbiting) {
      orbiting = false;
    }
    if (!jumping) hud.setStatus(orbiting ? `IN ORBIT · ${world.name.toUpperCase()}` : ship.isLocked ? 'FLIGHT' : 'CLICK TO FLY · M MAP · H HELP', orbiting ? 'ok' : '');
  }

  if (started && !jumping) adaptQuality(dt);
  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; saveState(state); }

  composer.render();
}
frame();

// Debug handle for profiling in the browser console.
(window as unknown as { __fdn: unknown }).__fdn = {
  renderer, composer, bloom, jumpPass, camera, ship,
  get system() { return system; },
  get state() { return state; },
};
