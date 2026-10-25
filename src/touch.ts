// Touch controls for phones and tablets: a floating stick, a throttle slider,
// a look zone, and a command bar that stands in for the keyboard.

export const IS_TOUCH = typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || new URLSearchParams(window.location.search).has('touch'));

export type TouchMode = 'none' | 'flight' | 'walk';

export interface TouchState {
  /** Stick deflection, -1..1 on each axis (x right, y up). */
  stickX: number;
  stickY: number;
  /** Look drag since the last frame, in pixels. */
  lookDX: number;
  lookDY: number;
  /** Throttle slider, 0..1, or null when untouched this frame. */
  throttle: number | null;
  boost: boolean;
}

const STICK_RADIUS = 56;
const capture = (el: Element, id: number) => { try { el.setPointerCapture(id); } catch { /* synthetic or stale pointer */ } };

export class TouchControls {
  readonly state: TouchState = { stickX: 0, stickY: 0, lookDX: 0, lookDY: 0, throttle: null, boost: false };
  private root = document.getElementById('touch')!;
  private left = document.getElementById('touch-left')!;
  private right = document.getElementById('touch-right')!;
  private stick = document.getElementById('stick')!;
  private knob = document.getElementById('stick-knob')!;
  private throttle = document.getElementById('throttle')!;
  private throttleFill = document.getElementById('throttle-fill')!;
  private boost = document.getElementById('boost')!;
  private bar = document.getElementById('cmdbar')!;
  private landBtn = document.getElementById('cmd-land')!;
  private stickId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private throttleId: number | null = null;
  private mode: TouchMode = 'none';

  constructor(onCommand: (code: string) => void) {
    document.body.classList.add('touch');
    document.getElementById('dlg-hint')!.textContent = 'TAP ▸';
    for (const b of this.bar.querySelectorAll<HTMLButtonElement>('button[data-code]')) {
      b.addEventListener('click', (e) => { e.stopPropagation(); onCommand(b.dataset.code!); });
    }
    // floating stick on the left zone
    this.left.addEventListener('pointerdown', (e) => {
      if (this.stickId !== null) return;
      this.stickId = e.pointerId;
      capture(this.left, e.pointerId);
      this.stickOrigin = { x: e.clientX, y: e.clientY };
      this.stick.style.left = `${e.clientX}px`; this.stick.style.top = `${e.clientY}px`; this.stick.classList.add('show');
      this.setKnob(0, 0);
    });
    this.left.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stickId) return;
      let dx = e.clientX - this.stickOrigin.x, dy = e.clientY - this.stickOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > STICK_RADIUS) { dx *= STICK_RADIUS / len; dy *= STICK_RADIUS / len; }
      this.setKnob(dx, dy);
      this.state.stickX = dx / STICK_RADIUS; this.state.stickY = -dy / STICK_RADIUS;
    });
    const stickUp = (e: PointerEvent) => { if (e.pointerId !== this.stickId) return; this.stickId = null; this.state.stickX = 0; this.state.stickY = 0; this.stick.classList.remove('show'); };
    this.left.addEventListener('pointerup', stickUp); this.left.addEventListener('pointercancel', stickUp);
    // look drag on the right zone
    this.right.addEventListener('pointerdown', (e) => { if (this.lookId !== null) return; this.lookId = e.pointerId; capture(this.right, e.pointerId); this.lookLast = { x: e.clientX, y: e.clientY }; });
    this.right.addEventListener('pointermove', (e) => { if (e.pointerId !== this.lookId) return; this.state.lookDX += e.clientX - this.lookLast.x; this.state.lookDY += e.clientY - this.lookLast.y; this.lookLast = { x: e.clientX, y: e.clientY }; });
    const lookUp = (e: PointerEvent) => { if (e.pointerId === this.lookId) this.lookId = null; };
    this.right.addEventListener('pointerup', lookUp); this.right.addEventListener('pointercancel', lookUp);
    // throttle slider: drag or tap sets the level
    const setThrottle = (e: PointerEvent) => { const r = this.throttle.getBoundingClientRect(); const t = 1 - (e.clientY - r.top) / r.height; this.state.throttle = Math.min(1, Math.max(0, t)); this.throttleFill.style.height = `${this.state.throttle * 100}%`; };
    this.throttle.addEventListener('pointerdown', (e) => { capture(this.throttle, e.pointerId); this.throttleId = e.pointerId; setThrottle(e); });
    this.throttle.addEventListener('pointermove', (e) => { if (e.pointerId === this.throttleId) setThrottle(e); });
    const throttleUp = (e: PointerEvent) => { if (e.pointerId === this.throttleId) this.throttleId = null; };
    this.throttle.addEventListener('pointerup', throttleUp); this.throttle.addEventListener('pointercancel', throttleUp);
    // boost while held
    this.boost.addEventListener('pointerdown', (e) => { capture(this.boost, e.pointerId); this.state.boost = true; this.boost.classList.add('on'); });
    const boostUp = () => { this.state.boost = false; this.boost.classList.remove('on'); };
    this.boost.addEventListener('pointerup', boostUp); this.boost.addEventListener('pointercancel', boostUp);
    for (const el of [this.left, this.right, this.throttle, this.boost, this.bar]) el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private setKnob(dx: number, dy: number): void { this.knob.style.transform = `translate(${dx}px, ${dy}px)`; }

  /** Shows the controls that fit the current view. The bar stays while the game runs. */
  setMode(mode: TouchMode, barVisible: boolean, landLabel: string, throttleLevel: number): void {
    if (mode !== this.mode) {
      this.mode = mode;
      this.root.dataset.mode = mode;
      if (mode !== 'flight') { this.state.boost = false; this.boost.classList.remove('on'); }
      if (mode === 'none') { this.state.stickX = 0; this.state.stickY = 0; this.stickId = null; this.lookId = null; this.stick.classList.remove('show'); }
    }
    this.bar.classList.toggle('show', barVisible);
    if (this.landBtn.textContent !== landLabel) this.landBtn.textContent = landLabel;
    if (this.state.throttle === null) this.throttleFill.style.height = `${throttleLevel * 100}%`;
  }

  /** Reads and clears the per-frame deltas. */
  consume(): { lookDX: number; lookDY: number; throttle: number | null } {
    const r = { lookDX: this.state.lookDX, lookDY: this.state.lookDY, throttle: this.state.throttle };
    this.state.lookDX = 0; this.state.lookDY = 0; this.state.throttle = null;
    return r;
  }
}
