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
import { Dialogue } from './dialogue';
import { VoicePlayer } from './voice';
import { StoryEngine } from './story/engine';
import { newStoryState, type StoryState, type Place, type EnterOptions } from './story/types';
import { MAIN_STORY, SIDE_STORIES, storyById } from './story/index';
const SECOND_MIND = MAIN_STORY;
import { TrantorCity } from './city';
import { Interior } from './interior';

type Mode = 'explore' | 'story';

interface SaveState {
  mode: Mode;
  worldId: string;
  fuel: number;
  credits: number;
  day: number;
  baseYear: number;
  visited: string[];
  story?: StoryState;
}

const SAVE_KEYS: Record<Mode, string> = { explore: 'foundation-save-explore-v1', story: 'foundation-save-story-v1' };

function freshState(mode: Mode): SaveState {
  if (mode === 'story') {
    return { mode, worldId: SECOND_MIND.startWorld, fuel: FUEL_CAPACITY, credits: SECOND_MIND.startCredits, day: 0, baseYear: SECOND_MIND.baseYear, visited: [SECOND_MIND.startWorld], story: newStoryState(SECOND_MIND) };
  }
  return { mode, worldId: START_WORLD_ID, fuel: FUEL_CAPACITY, credits: 1200, day: 0, baseYear: 50, visited: [START_WORLD_ID], story: newStoryState(null) };
}
function loadState(mode: Mode): SaveState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEYS[mode]);
    if (raw) {
      const s = JSON.parse(raw) as SaveState;
      if (WORLDS.some((w) => w.id === s.worldId)) {
        if (!s.story) s.story = newStoryState(null);
        if (!s.story.contracts) { s.story.contracts = []; s.story.completed = []; }
        return s;
      }
    }
  } catch { /* ignore */ }
  return null;
}
function saveState(s: SaveState): void {
  try { localStorage.setItem(SAVE_KEYS[s.mode], JSON.stringify(s)); } catch { /* ignore */ }
}

// ---------------------------------------------------------------- renderer
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

// ---------------------------------------------------------------- game state
let state: SaveState = freshState('explore');
let world: World = worldById(state.worldId);
let system = new StarSystem(world, renderer);
const ship = new Ship(canvas);
ship.enabled = false;
const hud = new Hud();
const audio = new AudioEngine();
const dialogue = new Dialogue();
const voice = new VoicePlayer(audio);
dialogue.voice = voice;
const map = new GalaxyMap(canvas, document.getElementById('map-labels')!, world);
let story: StoryEngine | null = null;

let mapOpen = false;
let jumping = false;
let jumpT = 0;
const JUMP_SECONDS = 4.2;
let jumpTarget: World | null = null;
let started = false;
let orbiting = false;
let storyLock = false;
type View = 'space' | 'city' | 'interior';
let view: View = 'space';
let city: TrantorCity | null = null;
let interior: Interior | null = null;

function placeShip(extra = 0): void {
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
  const year = state.baseYear + Math.floor(state.day / 365);
  const day = (state.day % 365) + 1;
  return `F.E. ${year} · Day ${day}`;
}

function shipMayFly(): boolean {
  return started && !mapOpen && !jumping && !storyLock && !dialogue.open && view !== 'interior';
}

// ---------------------------------------------------------------- places: orbit, city, interior
function enterCity(): void {
  if (view === 'city') return;
  leaveInterior();
  city = new TrantorCity();
  renderPass.scene = city.scene;
  const pose = city.startPose();
  ship.reset(pose.position, pose.lookAt);
  ship.speedScale = 0.22;
  ship.throttle = 0.35;
  view = 'city';
  hud.setMarker(0, 0, false, false, 0, '');
  hud.showMessage('Trantor. Atmospheric flight. Press L to return to orbit.', 5000);
  audio.blip(1200);
}
function leaveCity(): void {
  if (view !== 'city') return;
  city?.dispose();
  city = null;
  ship.speedScale = 1;
  renderPass.scene = system.scene;
  placeShip();
  view = 'space';
}
let interiorLoading = false;
const PLACE_NAMES: Record<string, string> = { cantina: 'Twilight City cantina', archive: 'the Siwenna archive', library: 'the Galactic Library', sacratorium: 'the Sacratorium of Mycogen', terrace: 'the Sayshell terrace', vault: 'the Comporellon archive vault', ruins: 'the Fastolfe estate on Aurora', estate: 'the Bander estate on Solaria', village: 'New Earth, on Alpha', moon: 'the chamber under the Moon' };
let lastLandmark: string | null = null;
let interiorLabel = '';
async function enterInterior(name = 'cantina', opts: EnterOptions = {}): Promise<void> {
  if ((view === 'interior' && interior?.sceneName === name) || interiorLoading) return;
  leaveCity();
  leaveInterior();
  interiorLoading = true;
  interiorLabel = opts.label ?? PLACE_NAMES[name] ?? name;
  hud.setStatus('LANDING', 'warn');
  const next = new Interior(name, opts);
  await next.load();
  interiorLoading = false;
  interior = next;
  renderPass.scene = interior.scene;
  view = 'interior';
  ship.releasePointer();
  hud.setMarker(0, 0, false, false, 0, '');
  hud.showMessage(`${interiorLabel}. Click to look, WASD to walk. L returns to the ship.`, 5000);
  audio.blip(900);
}
function leaveInterior(): void {
  if (view !== 'interior') return;
  interior?.dispose();
  interior = null;
  renderPass.scene = system.scene;
  camera.fov = 62; camera.updateProjectionMatrix();
  view = 'space';
}
async function enterPlace(place: Place, opts: EnterOptions = {}): Promise<void> {
  dialogue.hide();
  if (place !== 'space' && place !== 'city') await enterInterior(place, opts);
  else if (place === 'city') enterCity();
  else { leaveCity(); leaveInterior(); }
  await new Promise((r) => setTimeout(r, 600));
}
/** L: land or return. Explore mode lets you visit any charted landing site. */
function toggleLanding(): void {
  if (jumping || storyLock || mapOpen) return;
  if (view !== 'space') { leaveCity(); leaveInterior(); hud.showMessage(`Back in orbit over ${world.name}.`, 3000); return; }
  if (!orbiting) { hud.showMessage('Enter orbit first.', 2500); return; }
  if (world.id === 'trantor') enterCity();
  else if (world.id === 'radole') void enterInterior('cantina');
  else if (world.id === 'siwenna') void enterInterior('archive');
  else if (world.id === 'sayshell') void enterInterior('terrace');
  else if (world.id === 'comporellon') void enterInterior('vault');
  else if (world.id === 'aurora') void enterInterior('ruins');
  else if (world.id === 'solaria') void enterInterior('estate');
  else if (world.id === 'alpha') void enterInterior('village');
  else if (world.id === 'earth') void enterInterior('moon');
  else hud.showMessage('No landing site is charted here yet.', 3000);
}
dialogue.onSpeaker = (who) => { interior?.focus(who === 'TAREN' ? null : who); };

function openMap(): void {
  if (jumping || storyLock || view !== 'space') return;
  mapOpen = true;
  ship.enabled = false;
  ship.releasePointer();
  hud.hideInfo();
  hud.hideHelp();
  hud.hideJournal();
  map.open();
  renderPass.scene = map.scene;
  renderPass.camera = map.camera;
  bloom.strength = 1.4;
  hud.showMap(true);
  refreshMapTarget(map.selected);
  audio.blip(660);
}

function closeMap(): void {
  mapOpen = false;
  ship.enabled = shipMayFly();
  map.close();
  renderPass.scene = system.scene;
  renderPass.camera = camera;
  bloom.strength = 0.7;
  hud.showMap(false);
  audio.blip(440);
}

function refreshMapTarget(w: World | null): void {
  const hop = map.nextHop();
  hud.setMapTarget(world, w, map.route, hop ? distance(world, hop) : 0, state.fuel);
}

function beginJump(): void {
  const hop = map.nextHop();
  if (!hop || jumping || storyLock) return;
  const d = distance(world, hop);
  if (state.fuel < d) { hud.showMessage('Not enough fuel for this jump.'); return; }
  if (mapOpen) closeMap();
  // a story may have something to say before the jump
  if (story) { storyLock = true; story.fire({ type: 'depart', world: world.id }).then(() => { storyLock = false; executeJump(hop, d); }); }
  else executeJump(hop, d);
}

function executeJump(hop: World, d: number): void {
  jumpTarget = hop;
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
  refreshMapTarget(w);
};
hud.onJump(beginJump);

window.addEventListener('keydown', (e) => {
  if (!started) return;
  if (dialogue.open && e.code !== 'KeyV') return;
  switch (e.code) {
    case 'KeyM': mapOpen ? closeMap() : openMap(); break;
    case 'Escape': if (mapOpen) closeMap(); hud.hideInfo(); hud.hideHelp(); hud.hideJournal(); break;
    case 'KeyJ': if (map.selected) beginJump(); break;
    case 'KeyI': if (!mapOpen) { hud.infoOpen ? hud.hideInfo() : hud.showInfo(world); } break;
    case 'KeyH': hud.toggleHelp(); break;
    case 'KeyL': toggleLanding(); break;
    case 'KeyV': hud.showMessage(voice.toggle() ? 'Voice on.' : 'Voice off.', 2000); break;
    case 'KeyK': if (state.story) { hud.journalOpen ? hud.hideJournal() : hud.showJournal(state.story.journal, state.story.crew.length ? state.story.crew : ['Corin Pellis'], state.story.objective); } break;
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

// ---------------------------------------------------------------- story wiring
function activeStories() {
  const list = state.mode === 'story' ? [SECOND_MIND] : [];
  for (const id of state.story?.contracts ?? []) { const s = storyById(id); if (s) list.push(s); }
  return list;
}

function refreshContracts(): void {
  const st = state.story;
  if (!st) return;
  const items = SIDE_STORIES.map((s) => ({
    id: s.id, title: s.title, world: worldById(s.contract!.world).name, summary: s.contract!.summary, reward: s.contract!.reward,
    status: st.completed.includes(s.id) ? 'done' as const : st.contracts.includes(s.id) ? 'active' as const : 'open' as const,
  })).filter((c) => { const req = storyById(c.id)!.contract!.requires ?? []; return c.status !== 'open' || req.every((f) => st.flags.includes(f)); });
  hud.setContracts(items, acceptContract);
}

function acceptContract(id: string): void {
  const st = state.story; const s = storyById(id);
  if (!st || !s || !s.contract || st.contracts.includes(id) || st.completed.includes(id)) return;
  st.contracts.push(id);
  story?.addStory(s);
  if (state.mode === 'story') { for (const w of s.unlocked) if (!st.unlocked.includes(w)) st.unlocked.push(w); map.allowed = new Set(st.unlocked); map.setCurrent(world); }
  const target = worldById(s.contract.world);
  hud.setObjective(`Contract: ${s.title}. Fly to ${target.name}.`);
  st.objective = `Contract: ${s.title}. Fly to ${target.name}.`;
  hud.showMessage(`Contract accepted: ${s.title}.`, 3500);
  audio.blip(990);
  refreshContracts();
  saveState(state);
}

function attachStory(): void {
  if (!state.story) return;
  const st = state.story;
  story = new StoryEngine(activeStories(), st, {
    say: (who, text) => dialogue.say(who, text),
    choose: (options) => dialogue.choose(options),
    chapter: (title, sub) => { dialogue.hide(); return dialogue.chapter(title, sub); },
    message: (text) => hud.showMessage(text, 4000),
    objective: (text) => hud.setObjective(text),
    journal: () => hud.showMessage('Journal updated. Press K.', 2500),
    strain: (v) => { hud.setStrain(v, true); if (v >= 3) hud.showMessage('Positronic strain is high.', 4000); },
    credits: (d) => { state.credits = Math.max(0, state.credits + d); },
    fuel: (d) => { state.fuel = Math.max(0, Math.min(FUEL_CAPACITY, state.fuel + d)); },
    unlock: (worlds) => { map.allowed = new Set(worlds); map.setCurrent(world); },
    crew: (name) => hud.showMessage(`${name} has joined the crew.`, 3500),
    lock: (locked) => {
      storyLock = locked;
      if (locked) { ship.releasePointer(); ship.enabled = false; hud.hideInfo(); if (mapOpen) closeMap(); }
      else { dialogue.hide(); ship.enabled = shipMayFly(); }
    },
    end: (text) => hud.showMessage(text, 8000),
    enter: (place, opts) => enterPlace(place, opts),
    complete: (id) => { story?.removeStory(id); refreshContracts(); saveState(state); },
    save: () => saveState(state),
  });
  map.allowed = state.mode === 'story' ? new Set(st.unlocked) : null;
  map.setCurrent(world);
  hud.setObjective(st.objective);
  hud.setStrain(st.strain, state.mode === 'story');
  refreshContracts();
}

// ---------------------------------------------------------------- intro / mode select
const intro = document.getElementById('intro')!;
const btnExplore = document.getElementById('btn-explore')!;
const btnStory = document.getElementById('btn-story')!;
const btnStoryNew = document.getElementById('btn-story-new')!;

function describeSaves(): void {
  const ex = loadState('explore');
  const st = loadState('story');
  btnExplore.querySelector('.card-sub')!.textContent = ex ? `Continue at ${worldById(ex.worldId).name}` : 'Free flight. Every world. No rules.';
  btnStory.querySelector('.card-sub')!.textContent = st ? `Continue at ${worldById(st.worldId).name}` : 'The Second Mind. A robot, an archivist, and a world that was erased.';
  btnStoryNew.style.display = st ? 'inline-block' : 'none';
}
describeSaves();

function start(mode: Mode, fresh = false): void {
  if (started) return;
  started = true;
  audio.init();
  const loaded = fresh ? null : loadState(mode);
  state = loaded ?? freshState(mode);
  world = worldById(state.worldId);
  system.dispose();
  system = new StarSystem(world, renderer);
  renderPass.scene = system.scene;
  resize();
  placeShip();
  hud.setSystem(world);
  map.allowed = null;
  map.setCurrent(world);
  hud.setStrain(0, false);
  hud.setObjective('');
  attachStory();
  intro.classList.add('hide');
  setTimeout(() => (intro.style.display = 'none'), 1400);
  ship.enabled = true;
  ship.throttle = 0.2;
  if (mode === 'story') {
    void story!.fire({ type: 'start' });
    // replay a pending arrival scene after a reload
    if (loaded) void story!.fire({ type: 'arrive', world: world.id });
  } else {
    if (loaded) void story!.fire({ type: 'arrive', world: world.id });
    hud.showMessage(`Welcome to ${world.name}. Press H for controls.`, 5000);
  }
}
btnExplore.addEventListener('click', () => start('explore'));
btnStory.addEventListener('click', () => start('story'));
btnStoryNew.addEventListener('click', (e) => { e.stopPropagation(); start('story', true); });

renderPass.scene = system.scene;
hud.setSystem(world);
placeShip();

canvas.addEventListener('click', () => { if (view === 'interior' && !storyLock && !dialogue.open && !document.pointerLockElement) canvas.requestPointerLock(); });

// ---------------------------------------------------------------- sound prompt and debug readout
const soundPrompt = document.getElementById('sound-prompt')!;
soundPrompt.addEventListener('click', () => { audio.unlock(); });
const debugEl = document.getElementById('debug')!;
const debugOn = new URLSearchParams(location.search).has('debug');
debugEl.style.display = debugOn ? 'block' : 'none';
let debugTimer = 0;
function updateDiagnostics(dt: number): void {
  debugTimer += dt;
  if (debugTimer < 0.5) return;
  debugTimer = 0;
  const running = audio.state === 'running';
  soundPrompt.classList.toggle('show', started && audio.ready && !running);
  if (debugOn) {
    debugEl.textContent = `audio: ${audio.state} · clips: ${voice.hasClips ? 'yes' : 'no'} · voice: ${voice.enabled ? 'on' : 'off'} · last: ${voice.lastMode} · pr ${pixelRatio} · ${navigator.userAgent.slice(0, 60)}`;
  }
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
const tmpV = new THREE.Vector3();
let timeAcc = 0;
let saveTimer = 0;
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
      ship.throttle = 0.3;
      ship.enabled = shipMayFly();
      hud.showMessage(`Arrived at ${world.name}.`, 3500);
      story?.fire({ type: 'arrive', world: world.id });
    }
  }

  if (mapOpen) {
    map.update(w, h);
  } else if (view === 'city' && city) {
    ship.enabled = shipMayFly();
    ship.update(dt, 0);
    city.constrain(ship);
    camera.position.copy(ship.position);
    camera.quaternion.copy(ship.quaternion);
    camera.updateMatrixWorld();
    city.update(dt, timeAcc);
    // landmark marker and arrival trigger
    const lm = city.landmarks[0];
    if (lm) {
      tmpV.copy(lm.position).project(camera);
      const behind = tmpV.z > 1;
      let sx = ((tmpV.x + 1) / 2) * w, sy = ((1 - tmpV.y) / 2) * h;
      const margin = 40;
      const off = behind || sx < margin || sx > w - margin || sy < margin || sy > h - margin;
      let angle = 0;
      if (off) {
        let dx = tmpV.x, dy = -tmpV.y; if (behind) { dx = -dx; dy = -dy; }
        angle = Math.atan2(dy, dx);
        const rx = (w / 2 - margin), ry = (h / 2 - margin);
        const k = Math.min(Math.abs(rx / Math.cos(angle)), Math.abs(ry / Math.sin(angle)));
        sx = w / 2 + Math.cos(angle) * k; sy = h / 2 + Math.sin(angle) * k;
      }
      const dist = ship.position.distanceTo(lm.position);
      hud.setMarker(sx, sy, !storyLock && !dialogue.open, off, angle, `${lm.name}  ${(dist / 10).toFixed(0)} km`);
      const here = city.landmarkAt(ship.position);
      if (here && here.id !== lastLandmark) { lastLandmark = here.id; story?.fire({ type: 'landmark', id: here.id }); }
      if (!here) lastLandmark = null;
    }
    hud.setFlight(ship.speed, ship.throttle, ship.boost, ship.position.y / 10, state.fuel, FUEL_CAPACITY, state.credits, dateText());
    audio.setThrottle(ship.throttle, ship.boost);
    hud.setStatus(storyLock ? 'STORY' : ship.isLocked ? 'TRANTOR · ATMOSPHERIC FLIGHT · L TO RETURN' : 'CLICK TO FLY · L TO RETURN TO ORBIT', '');
  } else if (view === 'interior' && interior) {
    ship.update(dt, 0);
    interior.inputEnabled = !storyLock && !dialogue.open;
    interior.setMouthLevel(audio.voiceLevel());
    interior.update(dt, timeAcc, camera);
    camera.updateMatrixWorld();
    audio.setThrottle(0, false);
    hud.setFlight(0, 0, false, 0, state.fuel, FUEL_CAPACITY, state.credits, dateText());
    hud.setStatus(storyLock || dialogue.open ? 'STORY' : document.pointerLockElement ? `${interiorLabel.toUpperCase()} · L TO RETURN` : 'CLICK TO LOOK · WASD TO WALK · L TO RETURN', '');
  } else {
    ship.enabled = shipMayFly();
    ship.update(dt, system.planetRadius);
    camera.position.copy(ship.position);
    camera.quaternion.copy(ship.quaternion);
    system.update(dt, timeAcc, camera);
    if (ship.boost && ship.speed > 1000) {
      const s = 0.4;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
    camera.updateMatrixWorld();

    tmpV.set(0, 0, 0).project(camera);
    const behind = tmpV.z > 1;
    let sx = ((tmpV.x + 1) / 2) * w;
    let sy = ((1 - tmpV.y) / 2) * h;
    const margin = 40;
    const offscreen = behind || sx < margin || sx > w - margin || sy < margin || sy > h - margin;
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
      if (!hud.infoOpen && !story) hud.showInfo(world);
      saveState(state);
      story?.fire({ type: 'orbit', world: world.id });
    } else if (!nowOrbiting && orbiting) {
      orbiting = false;
    }
    const landing = ['trantor', 'radole', 'siwenna', 'sayshell', 'comporellon', 'aurora', 'solaria', 'alpha', 'earth'].includes(world.id);
    if (!jumping) hud.setStatus(storyLock ? 'STORY' : orbiting ? `IN ORBIT · ${world.name.toUpperCase()}${landing ? ' · L TO LAND' : ''}` : ship.isLocked ? 'FLIGHT' : 'CLICK TO FLY · M MAP · H HELP', orbiting ? 'ok' : '');
  }

  if (started && !jumping) adaptQuality(dt);
  updateDiagnostics(dt);
  saveTimer += dt;
  if (saveTimer > 5 && started) { saveTimer = 0; saveState(state); }

  composer.render();
}
frame();

// Debug handle for profiling in the browser console.
(window as unknown as { __fdn: unknown }).__fdn = {
  renderer, composer, bloom, jumpPass, camera, ship, voice,
  get system() { return system; },
  get state() { return state; },
  get story() { return story; },
  get view() { return view; },
  get interior() { return interior; },
  enterCity, enterInterior,
};
