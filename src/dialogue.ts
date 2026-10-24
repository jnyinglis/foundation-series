import type { Choice } from './story/types';
import type { VoicePlayer } from './voice';
import { castFor } from './story/voice';

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing element #${id}`);
  return e as T;
}

/** Visual-novel style dialogue panel with typewriter text and choices. */
export class Dialogue {
  private panel = el('dialogue');
  private speaker = el('dlg-speaker');
  private text = el('dlg-text');
  private hint = el('dlg-hint');
  private choices = el('dlg-choices');
  private chapterEl = el('chapter');
  private portrait = el<HTMLImageElement>('dlg-portrait');
  private portraitWrap = el('dlg-portrait-wrap');
  private missingPortraits = new Set<string>();
  private advance: (() => void) | null = null;
  private typing = false;
  private full = '';
  private timer = 0;
  voice: VoicePlayer | null = null;
  /** Called with the speaker name when a line starts, and null when the panel hides. */
  onSpeaker: ((who: string | null) => void) | null = null;

  constructor() {
    this.panel.addEventListener('click', () => this.onAdvance());
    window.addEventListener('keydown', (e) => {
      if (!this.panel.classList.contains('show')) return;
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); this.onAdvance(); }
    });
  }

  get open(): boolean { return this.panel.classList.contains('show'); }

  private onAdvance(): void {
    if (this.typing) {
      this.typing = false;
      clearInterval(this.timer);
      this.text.textContent = this.full;
      this.hint.style.visibility = 'visible';
      return;
    }
    this.voice?.stop();
    if (this.advance) { const a = this.advance; this.advance = null; a(); }
  }

  say(who: string, text: string): Promise<void> {
    this.panel.classList.add('show');
    this.choices.innerHTML = '';
    this.speaker.textContent = who;
    this.speaker.style.display = who ? 'block' : 'none';
    this.onSpeaker?.(who || null);
    this.panel.classList.toggle('narration', !who);
    const key = castFor(who).portrait?.key;
    if (who && key && !this.missingPortraits.has(key)) {
      const src = `${import.meta.env.BASE_URL}portraits/${key}.webp`;
      if (!this.portrait.src.endsWith(src.replace(/^\./, ''))) {
        this.portrait.onerror = () => { this.missingPortraits.add(key); this.portraitWrap.classList.remove('show'); };
        this.portrait.src = src;
      }
      this.portraitWrap.classList.add('show');
    } else {
      this.portraitWrap.classList.remove('show');
    }
    this.full = text;
    this.text.textContent = '';
    this.hint.style.visibility = 'hidden';
    this.typing = true;
    let i = 0;
    clearInterval(this.timer);
    const startTyping = (msPerStep: number) => {
      clearInterval(this.timer);
      this.timer = window.setInterval(() => {
        i += 2;
        this.text.textContent = text.slice(0, i);
        if (i >= text.length) {
          this.typing = false;
          clearInterval(this.timer);
          this.hint.style.visibility = 'visible';
        }
      }, msPerStep);
    };
    startTyping(22);
    // pace the text to the voice clip when one exists
    if (this.voice) {
      void this.voice.speak(who, text).then((seconds) => {
        if (!this.typing || seconds <= 0) return;
        const remaining = Math.max(0, text.length - i);
        const ms = Math.max(8, Math.min(60, (seconds * 0.92 * 1000) / (remaining / 2)));
        startTyping(ms);
      });
    }
    return new Promise((resolve) => { this.advance = resolve; });
  }

  choose(options: Choice[]): Promise<Choice> {
    this.panel.classList.add('show');
    this.hint.style.visibility = 'hidden';
    this.choices.innerHTML = '';
    return new Promise((resolve) => {
      const pick = (c: Choice) => { window.removeEventListener('keydown', onKey); this.choices.innerHTML = ''; resolve(c); };
      options.forEach((c, i) => {
        const b = document.createElement('button');
        b.className = 'dlg-choice';
        b.innerHTML = `<span class="num">${i + 1}</span>${c.text}`;
        b.addEventListener('click', (e) => { e.stopPropagation(); pick(c); });
        this.choices.appendChild(b);
      });
      const onKey = (e: KeyboardEvent) => {
        const n = Number(e.key);
        if (n >= 1 && n <= options.length) pick(options[n - 1]);
      };
      window.addEventListener('keydown', onKey);
    });
  }

  hide(): void {
    this.panel.classList.remove('show');
    this.choices.innerHTML = '';
    this.voice?.stop();
    this.onSpeaker?.(null);
  }

  chapter(title: string, sub: string): Promise<void> {
    this.chapterEl.innerHTML = `<div class="ch-title">${title}</div><div class="ch-sub">${sub}</div>`;
    this.chapterEl.classList.add('show');
    return new Promise((resolve) => {
      setTimeout(() => { this.chapterEl.classList.remove('show'); setTimeout(resolve, 600); }, 2800);
    });
  }
}
