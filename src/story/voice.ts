// Shared between the voice generation script and the game: which voice speaks
// each character, and a stable id for every line so clips can be cached.

export type VoiceFx = 'plain' | 'robot' | 'radio';

export interface CastEntry {
  /** OpenAI voice name. */
  voice: string;
  /** Tone instructions for gpt-4o-mini-tts. */
  instructions: string;
  /** In-browser processing applied on playback. */
  fx: VoiceFx;
  /** Browser fallback: preferred voice names, pitch and rate. */
  fallback: { names: string[]; pitch: number; rate: number };
  /** Portrait file key and image prompt. Narration has none. */
  portrait?: { key: string; prompt: string };
}

export const PORTRAIT_STYLE = 'Painterly science-fiction character portrait, head and shoulders, three-quarter view, looking slightly off camera. Muted palette of steel blue, slate and amber. Soft directional light from the left, dark atmospheric background with faint instrument glow. Serious, literary tone, like a book cover for a classic space novel. No text, no watermark, no frame.';

export const NARRATOR = '';

export const CAST: Record<string, CastEntry> = {
  [NARRATOR]: {
    voice: 'ash',
    instructions: 'A calm, measured narrator for a science fiction novel. Slow pace, quiet gravity, no drama. Let sentences land.',
    fx: 'plain',
    fallback: { names: ['Daniel', 'Oliver', 'Google UK English Male'], pitch: 0.95, rate: 0.92 },
  },
  TAREN: {
    voice: 'alloy',
    instructions: 'A thoughtful android speaking to itself. Calm, precise, even, gentle. Never raises the voice. Slight detachment, as if observing its own feelings from a short distance.',
    fx: 'robot',
    fallback: { names: ['Alex', 'Fred', 'Google US English'], pitch: 0.9, rate: 0.95 },
    portrait: { key: 'taren', prompt: 'A humanoid robot that passes for a man of about forty: calm, precise, symmetrical face, short dark hair, very still grey eyes, a plain dark pilot jacket with a small Trader house patch. Only a faint seam at the temple and an unnatural evenness hint that he is not human.' },
  },
  'ILEN SARVO': {
    voice: 'coral',
    instructions: 'A guarded, intelligent archivist in her thirties. Tired, controlled, with quiet urgency underneath. Dry and exact.',
    fx: 'plain',
    fallback: { names: ['Samantha', 'Karen', 'Moira', 'Google UK English Female'], pitch: 1.0, rate: 1.0 },
    portrait: { key: 'ilen', prompt: 'A guarded, intelligent archivist in her early thirties, tired eyes, dark hair tied back, a high-collared grey scholar\'s coat with a small Encyclopedia Galactica pin, holding the strap of a sealed archive case. Controlled, watchful expression.' },
  },
  'CORIN PELLIS': {
    voice: 'sage',
    instructions: 'A brisk, confident trader pilot. Dry humour, a little amused, fast and sure. Warm underneath.',
    fx: 'plain',
    fallback: { names: ['Tessa', 'Fiona', 'Victoria', 'Google UK English Female'], pitch: 1.05, rate: 1.08 },
    portrait: { key: 'corin', prompt: 'A brisk, confident trader pilot in her late twenties, weathered skin, cropped sun-bleached hair, a worn brown Trader flight jacket with the patches cut off, a half-smile, dry amusement in her eyes. A cold cavern port with fuel lights behind her.' },
  },
  'SENNET BARR': {
    voice: 'shimmer',
    instructions: 'An old woman, keeper of a dead archive. Slow, dry, precise, a little amused by the living. Long pauses. Never hurried.',
    fx: 'plain',
    fallback: { names: ['Moira', 'Karen', 'Samantha'], pitch: 0.9, rate: 0.88 },
    portrait: { key: 'sennet', prompt: 'A very old woman, keeper of a ruined Imperial archive, white hair in a tight bun, deep lines, sharp pale eyes, a worn dark robe with a brass reading lamp beside her and shelves of rotting index boxes behind. Patient, unimpressed, watchful.' },
  },
  'GREY COAT': {
    voice: 'echo',
    instructions: 'A courteous man with no emotion at all. Perfectly even pace, soft, unhurried, every word placed exactly. Never rises, never falls. Not cold: absent.',
    fx: 'plain',
    fallback: { names: ['Daniel', 'Alex'], pitch: 0.95, rate: 0.9 },
    portrait: { key: 'greycoat', prompt: 'A neat man of indeterminate age in a plain grey coat buttoned to the throat, smooth unlined face, short grey hair, pale eyes that give nothing back, standing in the doorway of a dark stone hall with cold light behind him. Calm, polite, utterly still.' },
  },
  COMMS: {
    voice: 'onyx',
    instructions: 'A flat, clipped port-authority radio operator. Bored, procedural, no emotion. Short pauses between clauses.',
    fx: 'radio',
    fallback: { names: ['Daniel', 'Alex'], pitch: 0.85, rate: 1.1 },
    portrait: { key: 'comms', prompt: 'A port authority communications console: a dark panel with an amber waveform display, a worn microphone grille, status lamps and a stencilled Terminus Port Authority emblem. No people.' },
  },
};

export function castFor(who: string): CastEntry {
  return CAST[who] ?? CAST[NARRATOR];
}

/** FNV-1a hash of the speaker and text, as 8 hex characters. */
export function voiceId(who: string, text: string): string {
  const s = `${who}|${text}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
