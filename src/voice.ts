import type { AudioEngine } from './audio';
import { castFor, voiceId } from './story/voice';

interface Manifest { story: string; lines: Record<string, { who: string; chars: number }> }

/** Plays a generated clip for a dialogue line, or falls back to the browser's own voices. */
export class VoicePlayer {
  private manifest: Manifest | null = null;
  private manifestLoaded: Promise<void>;
  private buffers = new Map<string, AudioBuffer>();
  private stopCurrent: (() => void) | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  enabled = true;

  constructor(private audio: AudioEngine) {
    try { this.enabled = localStorage.getItem('foundation-voice') !== 'off'; } catch { /* ignore */ }
    this.manifestLoaded = fetch(`${import.meta.env.BASE_URL}voice/manifest.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { this.manifest = m as Manifest | null; })
      .catch(() => { this.manifest = null; });
  }

  get hasClips(): boolean { return !!this.manifest && Object.keys(this.manifest.lines).length > 0; }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stop();
    try { localStorage.setItem('foundation-voice', this.enabled ? 'on' : 'off'); } catch { /* ignore */ }
    return this.enabled;
  }

  /** Starts speaking. Resolves with the clip length in seconds, or 0 when unknown. */
  async speak(who: string, text: string): Promise<number> {
    this.stop();
    if (!this.enabled) return 0;
    await this.manifestLoaded;
    const id = voiceId(who, text);
    const cast = castFor(who);
    if (this.manifest?.lines[id] && this.audio.ready) {
      try {
        let buf = this.buffers.get(id);
        if (!buf) {
          const res = await fetch(`${import.meta.env.BASE_URL}voice/${id}.mp3`);
          buf = await this.audio.decode(await res.arrayBuffer());
          this.buffers.set(id, buf);
        }
        this.stopCurrent = this.audio.playVoice(buf, cast.fx);
        return buf.duration;
      } catch { /* fall through to the browser voice */ }
    }
    return this.speakFallback(who, text);
  }

  private speakFallback(who: string, text: string): number {
    if (!('speechSynthesis' in window)) return 0;
    const cast = castFor(who);
    const u = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
    const pick = cast.fallback.names.map((n) => voices.find((v) => v.name.startsWith(n))).find(Boolean);
    if (pick) u.voice = pick;
    u.pitch = cast.fallback.pitch;
    u.rate = cast.fallback.rate;
    u.volume = 0.9;
    this.utterance = u;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    // rough estimate: 15 characters per second at rate 1
    return text.length / (15 * cast.fallback.rate);
  }

  stop(): void {
    if (this.stopCurrent) { this.stopCurrent(); this.stopCurrent = null; }
    if (this.utterance && 'speechSynthesis' in window) { speechSynthesis.cancel(); this.utterance = null; }
  }
}
