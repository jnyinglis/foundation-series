// Generates one audio clip per dialogue line with OpenAI text-to-speech.
// Usage: npm run voice            (reads OPENAI_API_KEY from .env or the shell)
// Clips go to public/voice/<id>.mp3 with a manifest. Existing clips are kept.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SECOND_MIND } from '../src/story/second-mind';
import { castFor, voiceId } from '../src/story/voice';
import type { Step } from '../src/story/types';

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
if (!key) {
  console.error('No OPENAI_API_KEY. Put it in .env (OPENAI_API_KEY=sk-...) or export it in the shell.');
  process.exit(1);
}

interface Line { id: string; who: string; text: string }
const lines = new Map<string, Line>();
function collect(steps: Step[]): void {
  for (const s of steps) {
    if ('say' in s) { const who = s.who ?? ''; const id = voiceId(who, s.say); lines.set(id, { id, who, text: s.say }); }
    else if ('if' in s) { collect(s.then); if (s.else) collect(s.else); }
  }
}
for (const scene of SECOND_MIND.scenes) collect(scene.steps);

const outDir = join(process.cwd(), 'public', 'voice');
mkdirSync(outDir, { recursive: true });
const todo = [...lines.values()].filter((l) => !existsSync(join(outDir, `${l.id}.mp3`)));
console.log(`${lines.size} lines, ${todo.length} to generate.`);

async function generate(l: Line): Promise<void> {
  const cast = castFor(l.who);
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', input: l.text, voice: cast.voice, instructions: cast.instructions, response_format: 'mp3' }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${(await res.text()).slice(0, 200)}`);
  writeFileSync(join(outDir, `${l.id}.mp3`), Buffer.from(await res.arrayBuffer()));
  console.log(`  ${l.id}  ${l.who || 'NARRATOR'}  ${l.text.slice(0, 50)}...`);
}

async function main(): Promise<void> {
  const queue = [...todo];
  let failed = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const l = queue.shift()!;
      try { await generate(l); } catch (e) { failed++; console.error(`  FAILED ${l.id}: ${(e as Error).message}`); }
    }
  }));
  const manifest: Record<string, { who: string; chars: number }> = {};
  for (const l of lines.values()) if (existsSync(join(outDir, `${l.id}.mp3`))) manifest[l.id] = { who: l.who, chars: l.text.length };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ story: SECOND_MIND.id, lines: manifest }, null, 0));
  console.log(`Done. ${Object.keys(manifest).length} clips in public/voice. ${failed ? failed + ' failed.' : ''}`);
}
void main();
