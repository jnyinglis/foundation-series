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
  'DIRA VELM': {
    voice: 'nova',
    instructions: 'A nervous, precise assistant librarian in her forties. Quick, quiet, careful with every word, glancing over her shoulder. Warms when she talks about the catalogue.',
    fx: 'plain',
    fallback: { names: ['Karen', 'Samantha', 'Moira'], pitch: 1.05, rate: 1.05 },
    portrait: { key: 'dira', prompt: 'A nervous, precise librarian in her forties of East Asian descent, blunt black bob, a dark formal suit with a Galactic Library sigil, lit from below by the blue glow of a catalogue console, surrounded by the galleries of a vast reading rotunda. Watchful, intelligent, afraid.' },
  },
  'SUNMASTER TWENTY-ONE': {
    voice: 'onyx',
    instructions: 'An old ceremonial leader of a closed sect. Very slow, deep, formal, every sentence a pronouncement. Dry contempt for outsiders, and under it a deep sadness.',
    fx: 'plain',
    fallback: { names: ['Daniel', 'Alex', 'Fred'], pitch: 0.75, rate: 0.82 },
    portrait: { key: 'sunmaster', prompt: 'A very old bald man with no eyebrows, in a plain grey kirtle robe, the elder of a secretive sect, standing in a dark stone hall lit by candles with a dim metal statue of a humanoid robot behind him. Severe, formal, grieving.' },
  },
  'VASK OREN': {
    voice: 'ash',
    instructions: 'A big, patient debt collector. Low, slow, almost friendly, which is worse. Never threatens directly. Enjoys the pause before the point.',
    fx: 'plain',
    fallback: { names: ['Fred', 'Alex', 'Daniel'], pitch: 0.75, rate: 0.9 },
    portrait: { key: 'vask', prompt: 'A huge, calm debt collector of African descent, shaved head, heavy shoulders in a dark fitted suit, a small Kalganian lender\'s pin on the lapel, standing on a café terrace at dusk with city lights far below. Patient, amused, dangerous.' },
  },
  QUINTESETZ: {
    voice: 'verse',
    instructions: 'An elderly scholar of Sayshell, cheerful and sly, fond of his own stories. Light, quick, a little wheezy, delighted to be asked.',
    fx: 'plain',
    fallback: { names: ['Daniel', 'Oliver'], pitch: 1.05, rate: 1.0 },
    portrait: { key: 'quintesetz', prompt: 'An elderly scholar of East Asian descent, round face, short white hair, a loose embroidered Sayshellian jacket, seated at a café table at dusk with a glass of wine, flowering shrubs and string lights around him. Sly, cheerful, curious.' },
  },
  'ALDO DENIADOR': {
    voice: 'echo',
    instructions: 'A thin, careful archivist on a cold puritan world. Flat, precise, slightly pedantic, lowering his voice for anything that matters. Dry wit, rare.',
    fx: 'plain',
    fallback: { names: ['Daniel', 'Alex'], pitch: 0.95, rate: 0.95 },
    portrait: { key: 'deniador', prompt: 'A thin, pale archivist in his sixties, close-cropped grey hair, a severe dark suit buttoned high, in a cold grey vault of steel cabinets under white strip lights, a terminal glowing beside him. Careful, pedantic, quietly brave.' },
  },
  'CAPTAIN VOS': {
    voice: 'sage',
    instructions: 'A port authority captain on a strict world. Clipped, formal, correct, impatient with foreigners, and uneasy about the orders she is carrying out.',
    fx: 'plain',
    fallback: { names: ['Karen', 'Samantha'], pitch: 0.95, rate: 1.05 },
    portrait: { key: 'vos', prompt: 'A port authority captain in her forties, auburn hair in a tight ponytail, a dark grey uniform with a high collar and a Comporellon state badge, standing at a heavy steel door under a red lamp. Formal, correct, uneasy.' },
  },
  'RYDEL BANDER': {
    voice: 'ballad',
    instructions: 'A Solarian who has never met another person face to face. Childlike and imperious at once, curious, utterly without fear or manners. Slow, musing, delighted by its own cleverness.',
    fx: 'plain',
    fallback: { names: ['Samantha', 'Alex'], pitch: 1.1, rate: 0.92 },
    portrait: { key: 'bander', prompt: 'A tall, hairless, androgynous Solarian with pale skin, no eyebrows, faint ridged lobes behind the ears, in a white high-collared suit, standing in a white immaculate hall with ivory robots in alcoves behind. Curious, imperious, utterly alone.' },
  },
  SANYA: {
    voice: 'shimmer',
    instructions: 'An island elder, warm, unhurried, laughing easily, with a terrible kindness underneath. Speaks as a host who has decided everything already.',
    fx: 'plain',
    fallback: { names: ['Moira', 'Samantha'], pitch: 0.95, rate: 0.92 },
    portrait: { key: 'sanya', prompt: 'An island elder in her seventies of Polynesian descent, long grey hair loose, a bright printed wrap, seated by a beach fire at night with palms and huts behind, firelight on her face. Warm, amused, and quietly resolved.' },
  },
  DANEEL: {
    voice: 'ash',
    instructions: 'A voice twenty thousand years old that has never once been raised. Gentle, exact, infinitely patient, a little tired. Every sentence is kind, and none of them is negotiable.',
    fx: 'robot',
    fallback: { names: ['Daniel', 'Oliver'], pitch: 0.9, rate: 0.88 },
    portrait: { key: 'daneel', prompt: 'A man of indeterminate age with a calm, perfectly symmetrical face, short dark hair, in a plain dark suit, standing in a dim chamber of dark glass with the Earth hanging in a great window behind him. Gentle, ancient, immovable.' },
  },
  MEMORY: {
    voice: 'fable',
    instructions: 'A faint recorded voice from very long ago. Old, kind, patient, slightly worn, as if played from a damaged medium. Speaks as a teacher to a child it will never meet.',
    fx: 'robot',
    fallback: { names: ['Daniel', 'Oliver'], pitch: 0.85, rate: 0.85 },
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
