import type { VoiceFx } from './story/voice';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private master: GainNode | null = null;
  private voiceBus: GainNode | null = null;

  private unmuteEl: HTMLAudioElement | null = null;

  get ready(): boolean { return !!this.ctx; }
  get state(): string { return this.ctx ? this.ctx.state : 'none'; }

  /** Call from any user gesture: resumes a suspended context and lifts the iOS silent switch for Web Audio. */
  unlock(): void {
    if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume();
    if (!this.unmuteEl) {
      // A looping silent clip in an <audio> element moves iOS to the playback audio session,
      // so Web Audio is no longer muted by the ringer switch.
      const el = document.createElement('audio');
      el.setAttribute('playsinline', '');
      el.loop = true;
      el.volume = 0.01;
      el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
      this.unmuteEl = el;
    }
    void this.unmuteEl.play().catch(() => undefined);
  }

  init(): void {
    if (this.ctx) return;
    const ctx = new AudioContext();
    this.ctx = ctx;
    void ctx.resume();
    const onGesture = () => this.unlock();
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('touchend', onGesture, { passive: true });
    window.addEventListener('keydown', onGesture);
    this.unlock();
    this.master = ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(ctx.destination);
    this.voiceBus = ctx.createGain();
    this.voiceBus.gain.value = 1.0;
    this.voiceBus.connect(ctx.destination);

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

  decode(data: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.ctx) throw new Error('audio not ready');
    return this.ctx.decodeAudioData(data);
  }

  /** Plays a voice clip through a character effect chain. Returns a stop function. */
  playVoice(buffer: AudioBuffer, fx: VoiceFx): () => void {
    if (!this.ctx || !this.voiceBus) return () => undefined;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const out = ctx.createGain();
    out.gain.value = 1.0;
    out.connect(this.voiceBus);
    const extras: AudioScheduledSourceNode[] = [];
    if (fx === 'robot') {
      // subtle chorus and a narrowed band: precise, not quite human
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 160;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500;
      const dry = ctx.createGain(); dry.gain.value = 0.75;
      const wet = ctx.createGain(); wet.gain.value = 0.45;
      const delay = ctx.createDelay(0.05); delay.delayTime.value = 0.012;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.8;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.0025;
      lfo.connect(lfoGain).connect(delay.delayTime);
      lfo.start(); extras.push(lfo);
      src.connect(hp).connect(lp);
      lp.connect(dry).connect(out);
      lp.connect(delay).connect(wet).connect(out);
    } else if (fx === 'radio') {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.9;
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = (i / 127.5) - 1; curve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
      shaper.curve = curve;
      const g = ctx.createGain(); g.gain.value = 0.9;
      src.connect(bp).connect(shaper).connect(g).connect(out);
      // static bed under the transmission
      const len = ctx.sampleRate * 2;
      const nb = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.35;
      const noise = ctx.createBufferSource(); noise.buffer = nb; noise.loop = true;
      const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2200; nf.Q.value = 0.5;
      const ng = ctx.createGain(); ng.gain.value = 0.05;
      noise.connect(nf).connect(ng).connect(out);
      noise.start(); extras.push(noise);
    } else {
      src.connect(out);
    }
    src.start();
    const stopAll = () => {
      try { src.stop(); } catch { /* already stopped */ }
      for (const e of extras) { try { e.stop(); } catch { /* ignore */ } }
      out.disconnect();
    };
    src.onended = () => { for (const e of extras) { try { e.stop(); } catch { /* ignore */ } } };
    return stopAll;
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
