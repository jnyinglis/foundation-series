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
import { IS_TOUCH, TouchControls } from './touch';
import { ComicShader } from './shaders/comic';
import { BARKS } from './story/barks';
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
const MAX_PR = Math.min(window.devicePixelRatio, IS_TOUCH ? 1.0 : 1.5);
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
const comicPass = new ShaderPass(ComicShader);
comicPass.enabled = false;
composer.addPass(comicPass);
// a depth-only render of the scene feeds the comic outlines while capturing
const depthRT = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType) });
comicPass.uniforms.tDepth.value = depthRT.depthTexture;

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

let captureMode = false;
let captureReq: { resolve: (dataUrl: string) => void; frames: number } | null = null;
let captureRig: { key: THREE.SpotLight; rim: THREE.PointLight; scene: THREE.Scene; base: Map<THREE.Light, number> } | null = null;
let captureSize: { w: number; h: number } | null = null;
function shipMayFly(): boolean {
  return started && !mapOpen && !jumping && !storyLock && !dialogue.open && !captureMode && view !== 'interior';
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
const PLACE_NAMES: Record<string, string> = { cantina: 'Twilight City cantina', archive: 'the Siwenna archive', library: 'the Galactic Library', sacratorium: 'the Sacratorium of Mycogen', terrace: 'the Sayshell terrace', vault: 'the Comporellon archive vault', ruins: 'the Fastolfe estate on Aurora', estate: 'the Bander estate on Solaria', village: 'New Earth, on Alpha', moon: 'the chamber under the Moon', salon: 'the Salon of Fortunes in the Warlord\'s Palace', longhouse: 'the Elders\' longhouse on Rossem', timevault: 'the Time Vault on Terminus' };
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
  hud.showMessage(IS_TOUCH ? `${interiorLabel}. Drag left to walk, right to look. Return goes back to the ship.` : `${interiorLabel}. Click to look, WASD to walk. L returns to the ship.`, 5000);
  audio.blip(900);
}
function leaveInterior(): void {
  if (view !== 'interior') return;
  interior?.dispose();
  interior = null;
  hud.setPrompt('');
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
/** E: talk to the figure in front of the player, outside a story scene. */
const barkIndex = new Map<string, number>();
let talking = false;
async function talk(): Promise<void> {
  if (view !== 'interior' || !interior || storyLock || dialogue.open || talking || captureMode) return;
  const who = interior.target(); if (!who) return;
  const lines = BARKS[who]; if (!lines?.length) { hud.showMessage(`${who} has nothing to say.`, 2000); return; }
  const i = barkIndex.get(who) ?? 0; barkIndex.set(who, (i + 1) % lines.length);
  talking = true; hud.setPrompt('');
  interior.focus(who);
  await dialogue.say(who, lines[i]);
  dialogue.hide(); interior.focus(null); talking = false;
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
  else if (world.id === 'kalgan') void enterInterior('salon');
  else if (world.id === 'rossem') void enterInterior('longhouse');
  else if (world.id === 'terminus') void enterInterior('timevault');
  else if (world.id === 'melpomenia') void enterInterior('ruins', { label: 'the Hall of the Fifty Worlds on Melpomenia', cast: ['WRECK'] });
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
    case 'KeyE': void talk(); break;
    case 'KeyV': hud.showMessage(voice.toggle() ? 'Voice on.' : 'Voice off.', 2000); break;
    case 'KeyK': if (state.story) { hud.journalOpen ? hud.hideJournal() : hud.showJournal(state.story.journal, state.story.crew.length ? state.story.crew : ['Corin Pellis'], state.story.objective); } break;
  }
});

function resize(): void {
  const w = captureSize?.w ?? window.innerWidth, h = captureSize?.h ?? window.innerHeight;
  renderer.setPixelRatio(captureSize ? 1 : pixelRatio);
  composer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  system.setPixelRatio(pixelRatio);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  map.resize(w, h);
  jumpPass.uniforms.uAspect.value = w / h;
  comicPass.uniforms.uResolution.value = [w, h];
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
    hud.showMessage(IS_TOUCH ? `Welcome to ${world.name}. Landscape works best. Tap HELP for the controls.` : `Welcome to ${world.name}. Press H for controls.`, 5000);
  }
}
btnExplore.addEventListener('click', () => start('explore'));
btnStory.addEventListener('click', () => start('story'));
btnStoryNew.addEventListener('click', (e) => { e.stopPropagation(); start('story', true); });

renderPass.scene = system.scene;
hud.setSystem(world);
placeShip();

canvas.addEventListener('click', () => { if (!IS_TOUCH && canvas.requestPointerLock && view === 'interior' && !storyLock && !dialogue.open && !document.pointerLockElement) canvas.requestPointerLock(); });

// ---------------------------------------------------------------- touch controls
const touch = IS_TOUCH ? new TouchControls((code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }))) : null;
document.getElementById('map-close-btn')!.addEventListener('click', () => closeMap());
/** Status hints differ between keyboard and touch. */
const HINT = IS_TOUCH
  ? { fly: 'DRAG LEFT TO STEER · SLIDER FOR THROTTLE', city: 'TRANTOR · ATMOSPHERIC FLIGHT · LAND BUTTON TO RETURN', walk: 'DRAG LEFT TO WALK · DRAG RIGHT TO LOOK' }
  : { fly: 'CLICK TO FLY · M MAP · H HELP', city: 'CLICK TO FLY · L TO RETURN TO ORBIT', walk: 'CLICK TO LOOK · WASD TO WALK · L TO RETURN' };
function updateTouch(): void {
  if (!touch) return;
  const active = started && !mapOpen && !jumping && !storyLock && !dialogue.open;
  const mode = !active ? 'none' : view === 'interior' ? 'walk' : 'flight';
  touch.setMode(mode, started && !jumping, view === 'space' ? 'LAND' : 'RETURN', ship.throttle, mode === 'walk' && !!interior?.target());
  const t = touch.consume();
  if (mode === 'flight') {
    ship.touchPitch = touch.state.stickY; ship.touchYaw = touch.state.stickX; ship.touchBoost = touch.state.boost;
    if (t.throttle !== null) ship.throttle = t.throttle;
  } else { ship.touchPitch = 0; ship.touchYaw = 0; ship.touchBoost = false; }
  if (interior) {
    if (mode === 'walk') { interior.touchMove.x = touch.state.stickX; interior.touchMove.y = touch.state.stickY; interior.addLook(t.lookDX, t.lookDY); }
    else { interior.touchMove.x = 0; interior.touchMove.y = 0; }
  }
}

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
  updateTouch();

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
    hud.setStatus(storyLock ? 'STORY' : ship.isLocked ? 'TRANTOR · ATMOSPHERIC FLIGHT · L TO RETURN' : HINT.city, '');
  } else if (view === 'interior' && interior) {
    ship.update(dt, 0);
    interior.inputEnabled = !storyLock && !dialogue.open && !captureMode;
    interior.setMouthLevel(audio.voiceLevel());
    interior.update(dt, timeAcc, camera);
    camera.updateMatrixWorld();
    audio.setThrottle(0, false);
    hud.setFlight(0, 0, false, 0, state.fuel, FUEL_CAPACITY, state.credits, dateText());
    hud.setStatus(storyLock || dialogue.open ? 'STORY' : document.pointerLockElement ? `${interiorLabel.toUpperCase()} · L TO RETURN` : HINT.walk, '');
    const near = !storyLock && !dialogue.open && !captureMode ? interior.target() : null;
    hud.setPrompt(near ? (IS_TOUCH ? `TALK · ${near}` : `E · TALK TO ${near}`) : '');
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
      if (started) saveState(state);
      story?.fire({ type: 'orbit', world: world.id });
    } else if (!nowOrbiting && orbiting) {
      orbiting = false;
    }
    const landing = ['trantor', 'radole', 'siwenna', 'sayshell', 'comporellon', 'aurora', 'solaria', 'alpha', 'earth', 'kalgan', 'rossem', 'terminus', 'melpomenia'].includes(world.id);
    if (!jumping) hud.setStatus(storyLock ? 'STORY' : orbiting ? `IN ORBIT · ${world.name.toUpperCase()}${landing ? (IS_TOUCH ? ' · LAND BUTTON' : ' · L TO LAND') : ''}` : ship.isLocked ? 'FLIGHT' : HINT.fly, orbiting ? 'ok' : '');
  }

  if (started && !jumping) adaptQuality(dt);
  updateDiagnostics(dt);
  saveTimer += dt;
  if (saveTimer > 5 && started) { saveTimer = 0; saveState(state); }

  if (comicPass.enabled) {
    const cam = renderPass.camera as THREE.PerspectiveCamera;
    const w = captureSize?.w ?? window.innerWidth, h = captureSize?.h ?? window.innerHeight;
    if (depthRT.width !== w || depthRT.height !== h) depthRT.setSize(w, h);
    comicPass.uniforms.uNear.value = cam.near; comicPass.uniforms.uFar.value = cam.far;
    renderer.setRenderTarget(depthRT); renderer.render(renderPass.scene, cam); renderer.setRenderTarget(null);
  }
  composer.render();
  if (captureReq && --captureReq.frames <= 0) { const r = captureReq; captureReq = null; r.resolve(renderer.domElement.toDataURL('image/png')); }
}
frame();

// Debug handle for profiling in the browser console.

// ---------------------------------------------------------------- comic capture (debug handle)
function requestCapture(w: number, h: number): Promise<string> {
  captureSize = { w, h }; resize();
  return new Promise((resolve) => { captureReq = { resolve: (d) => { captureSize = null; resize(); resolve(d); }, frames: 3 }; });
}
const capture = {
  begin(): void { captureMode = true; ship.enabled = false; hud.hideInfo(); hud.hideHelp(); comicPass.enabled = true; bloom.strength = 0.25; renderer.toneMappingExposure = 0.85; },
  end(): void { captureMode = false; comicPass.enabled = false; ship.enabled = shipMayFly(); bloom.strength = 0.7; renderer.toneMappingExposure = 1.0; },
  async place(name: string, opts: EnterOptions = {}): Promise<void> { if (mapOpen) closeMap(); if (name === 'space') { leaveCity(); leaveInterior(); } else if (name === 'city') enterCity(); else await enterInterior(name, opts); },
  view(pos: [number, number, number], yaw: number, pitch: number, fov = 50): void { interior?.setView(pos, yaw, pitch, fov); },
  actor(name: string, o: { talking?: boolean; mouth?: number; face?: boolean; look?: boolean }): void {
    const a = interior?.figures.get(name); if (!a || !interior) return;
    if (o.talking !== undefined) a.talking = o.talking; if (o.mouth !== undefined) a.mouthOpen = o.mouth;
    if (o.face !== undefined) a.face(o.face ? interior.playerPos : null); if (o.look !== undefined) a.lookAt(o.look ? interior.playerPos : null);
  },
  ship(pos: [number, number, number], lookAt: [number, number, number], fov = 55): void { ship.reset(new THREE.Vector3(...pos), new THREE.Vector3(...lookAt)); ship.throttle = 0; ship.speed = 0; camera.fov = fov; camera.updateProjectionMatrix(); },
  chart(pos: [number, number, number], target: [number, number, number], select?: string): void { if (!mapOpen) openMap(); if (select) map.select(worldById(select)); map.camera.position.set(...pos); map.controls.target.set(...target); map.controls.update(); },
  worldPos(id: string): number[] { return worldById(id).pos; },
  /** A key and rim light for one actor, placed relative to the camera. The room's own lights can be dimmed. */
  rig(name: string, o: Partial<{ key: number; rim: number; keyColor: number; rimColor: number; room: number; side: number; height: number }> = {}): void {
    if (!interior) return;
    const a = interior.figures.get(name); if (!a) return;
    if (!captureRig || captureRig.scene !== interior.scene) {
      const key = new THREE.SpotLight(0xfff0dc, 0, 40, 0.75, 0.6, 1.0); const rim = new THREE.PointLight(0x9fd0ff, 0, 24, 1.4);
      interior.scene.add(key, key.target, rim); captureRig = { key, rim, scene: interior.scene, base: new Map() };
    }
    const head = a.root.position.clone(); head.y = 1.5;
    const dir = interior.playerPos.clone().sub(head); dir.y = 0; dir.normalize();
    const left = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(o.side ?? 1);
    const kp = head.clone().addScaledVector(dir, 2.2).addScaledVector(left, 1.6); kp.y = (o.height ?? 2.6);
    const rp = head.clone().addScaledVector(dir, -1.6).addScaledVector(left, -0.9); rp.y = 2.3;
    captureRig.key.position.copy(kp); captureRig.key.target.position.copy(head); captureRig.key.intensity = o.key ?? 6; captureRig.key.color.set(o.keyColor ?? 0xfff0dc);
    captureRig.rim.position.copy(rp); captureRig.rim.intensity = o.rim ?? 3; captureRig.rim.color.set(o.rimColor ?? 0x9fd0ff);
    if (o.room !== undefined) interior.scene.traverse((obj) => { const l = obj as THREE.Light; if (!(l as THREE.Light).isLight || l === captureRig!.key || l === captureRig!.rim) return; if (!captureRig!.base.has(l)) captureRig!.base.set(l, l.intensity); l.intensity = captureRig!.base.get(l)! * o.room!; });
  },
  comic(o: Partial<{ levels: number; edge: number; lo: number; hi: number; halftone: number; dot: number; saturation: number; enabled: boolean }>): void {
    const u = comicPass.uniforms; if (o.levels !== undefined) u.uLevels.value = o.levels; if (o.edge !== undefined) u.uEdge.value = o.edge; if (o.lo !== undefined) u.uEdgeLo.value = o.lo; if (o.hi !== undefined) u.uEdgeHi.value = o.hi;
    if (o.halftone !== undefined) u.uHalftone.value = o.halftone; if (o.dot !== undefined) u.uDot.value = o.dot; if (o.saturation !== undefined) u.uSaturation.value = o.saturation; if (o.enabled !== undefined) comicPass.enabled = o.enabled;
  },
  async shot(name: string, w = 1200, h = 800): Promise<{ name: string; bytes: number }> {
    const dataUrl = await requestCapture(w, h);
    const blob = await (await fetch(dataUrl)).blob();
    const res = await fetch(`/__capture?name=${encodeURIComponent(name)}`, { method: 'POST', body: blob });
    return res.json() as Promise<{ name: string; bytes: number }>;
  },
  get planetRadius() { return system.planetRadius; },
};
(window as unknown as { __fdn: unknown }).__fdn = {
  renderer, composer, bloom, jumpPass, camera, ship, voice,
  get system() { return system; },
  get state() { return state; },
  get story() { return story; },
  get view() { return view; },
  get interior() { return interior; },
  enterCity, enterInterior, capture,
};
