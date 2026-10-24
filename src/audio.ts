export class AudioEngine {
  private ctx: AudioContext | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private master: GainNode | null = null;

  get ready(): boolean { return !!this.ctx; }

  init(): void {
    if (this.ctx) return;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(ctx.destination);

    // deep drone
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.045;
    droneGain.connect(this.master);
    for (const f of [55, 55.7, 82.4, 110.3]) {
      const o = ctx.createOscillator();
      o.type = f > 100 ? 'sine' : 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = f > 100 ? 0.3 : 1;
      o.connect(g).connect(droneGain);
      o.start();
    }
    // slow shimmer
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain).connect(droneGain.gain);
    lfo.start();

    // engine: filtered noise
    const noise = ctx.createBufferSource();
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    noise.buffer = buf;
    noise.loop = true;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'bandpass';
    this.engineFilter.frequency.value = 120;
    this.engineFilter.Q.value = 0.8;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    noise.connect(this.engineFilter).connect(this.engineGain).connect(this.master);
    noise.start();
  }

  setThrottle(t: number, boost: boolean): void {
    if (!this.ctx || !this.engineGain || !this.engineFilter) return;
    const now = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(0.02 + t * (boost ? 0.35 : 0.18), now, 0.2);
    this.engineFilter.frequency.setTargetAtTime(90 + t * (boost ? 700 : 260), now, 0.3);
  }

  jump(duration: number): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(60, now);
    o.frequency.exponentialRampToValueAtTime(1800, now + duration * 0.5);
    o.frequency.exponentialRampToValueAtTime(40, now + duration);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(300, now);
    f.frequency.exponentialRampToValueAtTime(4000, now + duration * 0.5);
    f.frequency.exponentialRampToValueAtTime(200, now + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.25, now + duration * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    o.connect(f).connect(g).connect(this.master);
    o.start(now);
    o.stop(now + duration + 0.1);

    // impact at the mid point
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(220, now + duration * 0.5);
    o2.frequency.exponentialRampToValueAtTime(30, now + duration * 0.5 + 1.2);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, now);
    g2.gain.setValueAtTime(0.5, now + duration * 0.5);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.5 + 1.4);
    o2.connect(g2).connect(this.master);
    o2.start(now);
    o2.stop(now + duration + 1.5);
  }

  blip(freq = 880): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.04, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    o.connect(g).connect(this.master);
    o.start(now);
    o.stop(now + 0.15);
  }
}
