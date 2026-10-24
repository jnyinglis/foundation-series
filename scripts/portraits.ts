// Generates one portrait per character with OpenAI image generation.
// Usage: npm run portraits     (reads OPENAI_API_KEY from .env or the shell)
// Images go to public/portraits/<key>.webp. Existing files are kept.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CAST, PORTRAIT_STYLE } from '../src/story/voice';

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
if (!key) { console.error('No OPENAI_API_KEY. Put it in .env or export it.'); process.exit(1); }

const outDir = join(process.cwd(), 'public', 'portraits');
mkdirSync(outDir, { recursive: true });

async function generate(k: string, prompt: string): Promise<void> {
  const file = join(outDir, `${k}.webp`);
  if (existsSync(file)) { console.log(`  ${k}: exists`); return; }
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-2', prompt: `${prompt} ${PORTRAIT_STYLE}`, size: '768x1024', quality: 'medium', output_format: 'webp', output_compression: 80 }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { data: { b64_json: string }[] };
  writeFileSync(file, Buffer.from(json.data[0].b64_json, 'base64'));
  console.log(`  ${k}: written`);
}

async function main(): Promise<void> {
  const jobs = Object.values(CAST).filter((c) => c.portrait).map((c) => generate(c.portrait!.key, c.portrait!.prompt).catch((e) => console.error(`  FAILED ${c.portrait!.key}: ${(e as Error).message}`)));
  await Promise.all(jobs);
  console.log('Done.');
}
void main();
