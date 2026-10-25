// Generates the drawn panels of the comic pilot: a cover, the ship-interior
// panels with the character portraits as references, and the back-matter plate.
// Usage: npm run comic:art   (reads OPENAI_API_KEY from .env). Existing files are kept.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function loadEnv(): void {
  const p = join(process.cwd(), '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();
const key = process.env.OPENAI_API_KEY;
if (!key) { console.error('No OPENAI_API_KEY.'); process.exit(1); }

const STYLE = 'Graphic novel panel in the manner of a 1980s literary comic: confident black ink line work, flat colour fills, visible halftone dot shading in the shadows, a restrained palette of steel blue, slate grey, amber and bone white, strong directional light, no text, no speech balloons, no lettering, no borders, no watermark.';
const outDir = join(process.cwd(), 'public', 'comic', 'art');
mkdirSync(outDir, { recursive: true });
const portrait = (k: string) => join(process.cwd(), 'public', 'portraits', `${k}.webp`);

interface Job { key: string; prompt: string; size: string; refs?: string[] }
const JOBS: Job[] = [
  { key: 'cover', size: '1024x1536', prompt: `Cover illustration: Twilight City on the ribbon world Radole, a Trader city of lamps and gantries hanging from black cliffs at the edge of a sheet of ice, under a sky split between a burning sunward horizon and a cold starry night; a small freighter descends toward the docks. Vast scale, tiny ship. ${STYLE}` },
  { key: 'ilen-case', size: '1536x1024', refs: ['ilen'], prompt: `The woman in the reference image, an archivist in her thirties in a dark elegant suit, kneels in a cramped freighter cabin and opens a sealed metal case; inside, a single tape reel and an antique reader lie in grey foam; her face is lit from below by the reader's amber glow. Keep her face exactly as in the reference. ${STYLE}` },
  { key: 'reader', size: '1536x1024', prompt: `Extreme close-up of an antique data reader older than an empire: brass and black glass, one tape reel threaded through it, a small amber screen showing a dense index of worlds in an unreadable script, one entry glowing brighter. ${STYLE}` },
  { key: 'taren-mirror', size: '1024x1024', refs: ['taren'], prompt: `The man in the reference image, a calm precise pilot of about forty in a dark pilot jacket, seen reflected in the dark glass of a dock window at night, lamps of a cavern dock behind him; his reflection looks back at him with no expression at all. Keep his face exactly as in the reference. Quiet, uncanny. ${STYLE}` },
  { key: 'grey-coat', size: '1024x1536', refs: ['greycoat'], prompt: `The man in the reference image, in a long grey coat, stands at a dockmaster's counter in a cavern dock of fuel drums and cold lamps, speaking politely to a clerk; he is seen from behind and to the side, face half turned away; nothing about him is remarkable. Keep his features as in the reference. ${STYLE}` },
  { key: 'plate', size: '1024x1536', prompt: `An engraved encyclopedia plate: a cross-section diagram of the ribbon world Radole showing the sunward face, the twilight strip with a cliff-hung city, and the ice face, with fine hatched engraving, a scale bar and empty label boxes with no text. Antique scientific illustration, sepia ink on bone paper, no text.` },
];

async function run(job: Job): Promise<void> {
  const file = join(outDir, `${job.key}.webp`);
  if (existsSync(file)) { console.log(`  ${job.key}: exists`); return; }
  let res: Response;
  if (job.refs?.length) {
    const form = new FormData();
    form.append('model', 'gpt-image-2'); form.append('prompt', job.prompt); form.append('size', job.size); form.append('quality', 'medium'); form.append('output_format', 'webp');
    for (const r of job.refs) form.append('image[]', new Blob([readFileSync(portrait(r))], { type: 'image/webp' }), `${r}.webp`);
    res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  } else {
    res = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-image-2', prompt: job.prompt, size: job.size, quality: 'medium', output_format: 'webp', output_compression: 85 }) });
  }
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { data: { b64_json: string }[] };
  writeFileSync(file, Buffer.from(json.data[0].b64_json, 'base64'));
  console.log(`  ${job.key}: written`);
}
void Promise.all(JOBS.map((j) => run(j).catch((e) => console.error(`  FAILED ${j.key}: ${(e as Error).message}`)))).then(() => console.log('Done.'));
