// Renders every story as a pan-and-zoom storyboard: one row per chapter or
// side adventure, one card per scene, with flag links between them.
// Usage: npm run storyboard   -> public/storyboard.html
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAIN_STORY, SIDE_STORIES } from '../src/story/index';
import { WORLDS } from '../src/data/worlds';
import type { Choice, Scene, Step, Story } from '../src/story/types';

interface Line { depth: number; kind: string; who?: string; text: string; meta?: string }
interface SceneCard {
  id: string; trigger: string; chapter?: { title: string; sub?: string }; places: string[]; speakers: string[];
  lines: number; journal: number; sets: string[]; checks: string[]; choices: { text: string; set: string[]; strain?: number; credits?: number; needs?: string[]; maxStrain?: number; goto?: string }[];
  branches: { flags: string[]; lines: number; sets: string[]; else?: number }[]; credits: number; strain: number; complete?: string; end?: string; gotos: string[]; unlocks: string[]; crew: string[]; script: Line[];
}
interface Row { title: string; sub?: string; story: string; scenes: SceneCard[] }
interface StoryOut { id: string; title: string; subtitle: string; main: boolean; contract?: Story['contract']; startWorld: string; rows: Row[] }

const worldName = (id: string) => WORLDS.find((w) => w.id === id)?.name ?? id;

function trigger(s: Scene): string {
  const t = s.trigger;
  if (t.type === 'start') return 'START';
  if (t.type === 'arrive') return `ARRIVE · ${worldName(t.world)}`;
  if (t.type === 'orbit') return `ORBIT · ${worldName(t.world)}`;
  if (t.type === 'depart') return `DEPART · ${worldName(t.world)}`;
  if (t.type === 'landmark') return `LANDMARK · ${t.id}`;
  return `FLAG · ${t.flag}`;
}

function walk(steps: Step[], card: SceneCard, depth: number, counter: { n: number }): void {
  for (const st of steps) {
    if ('say' in st) {
      card.script.push({ depth, kind: 'say', who: st.who ?? 'NARRATOR', text: st.say });
      if (!card.speakers.includes(st.who ?? 'NARRATOR')) card.speakers.push(st.who ?? 'NARRATOR');
      counter.n++;
    } else if ('choice' in st) {
      card.script.push({ depth, kind: 'choice', text: `${st.choice.length} choices` });
      for (const c of st.choice as Choice[]) {
        const meta = [c.strain ? `strain +${c.strain}` : '', c.credits ? `${c.credits > 0 ? '+' : ''}${c.credits} cr` : '', c.needs?.length ? `needs ${c.needs.join(', ')}` : '', c.maxStrain !== undefined ? `strain ≤ ${c.maxStrain}` : '', c.goto ? `→ ${c.goto}` : '', c.set?.length ? `sets ${c.set.join(', ')}` : ''].filter(Boolean).join(' · ');
        card.script.push({ depth: depth + 1, kind: 'option', text: c.text, meta });
        card.choices.push({ text: c.text, set: c.set ?? [], strain: c.strain, credits: c.credits, needs: c.needs, maxStrain: c.maxStrain, goto: c.goto });
        for (const f of c.set ?? []) if (!card.sets.includes(f)) card.sets.push(f);
        for (const f of c.needs ?? []) if (!card.checks.includes(f)) card.checks.push(f);
        if (c.goto) card.gotos.push(c.goto);
      }
    } else if ('set' in st) {
      card.script.push({ depth, kind: 'set', text: `sets ${st.set.join(', ')}` });
      for (const f of st.set) if (!card.sets.includes(f)) card.sets.push(f);
    } else if ('if' in st) {
      for (const f of st.if) if (!card.checks.includes(f)) card.checks.push(f);
      card.script.push({ depth, kind: 'if', text: `if ${st.if.join(' and ')}` });
      const before = counter.n; const setsBefore = card.sets.length;
      walk(st.then, card, depth + 1, counter);
      const br = { flags: st.if, lines: counter.n - before, sets: card.sets.slice(setsBefore) } as SceneCard['branches'][number];
      if (st.else) { card.script.push({ depth, kind: 'if', text: 'else' }); const b2 = counter.n; walk(st.else, card, depth + 1, counter); br.else = counter.n - b2; }
      card.branches.push(br);
    } else if ('objective' in st) card.script.push({ depth, kind: 'objective', text: st.objective || '(cleared)' });
    else if ('journal' in st) { card.journal++; card.script.push({ depth, kind: 'journal', text: st.journal }); }
    else if ('unlock' in st) { card.unlocks.push(...st.unlock.map(worldName)); card.script.push({ depth, kind: 'unlock', text: `unlocks ${st.unlock.map(worldName).join(', ')}` }); }
    else if ('crew' in st) { card.crew.push(st.crew); card.script.push({ depth, kind: 'crew', text: `${st.crew} joins the crew` }); }
    else if ('chapter' in st) { card.chapter = { title: st.chapter, sub: st.sub }; card.script.push({ depth, kind: 'chapter', text: `${st.chapter}${st.sub ? ' · ' + st.sub : ''}` }); }
    else if ('strain' in st) { card.strain += st.strain; card.script.push({ depth, kind: 'strain', text: `strain ${st.strain > 0 ? '+' : ''}${st.strain}` }); }
    else if ('credits' in st) { card.credits += st.credits; card.script.push({ depth, kind: 'credits', text: `${st.credits > 0 ? '+' : ''}${st.credits} credits` }); }
    else if ('fuel' in st) card.script.push({ depth, kind: 'fuel', text: `fuel ${st.fuel > 0 ? '+' : ''}${st.fuel}` });
    else if ('goto' in st) { card.gotos.push(st.goto); card.script.push({ depth, kind: 'goto', text: `→ ${st.goto}` }); }
    else if ('message' in st) card.script.push({ depth, kind: 'message', text: st.message });
    else if ('enter' in st) { const p = st.label ? `${st.enter} · ${st.label}` : st.enter; card.places.push(p); card.script.push({ depth, kind: 'enter', text: `enter ${p}${st.cast ? ' · cast ' + st.cast.join(', ') : ''}${st.extra ? ' + ' + st.extra.map((e) => e.name).join(', ') : ''}` }); }
    else if ('complete' in st) { card.complete = st.complete; card.script.push({ depth, kind: 'complete', text: `complete ${st.complete}` }); }
    else if ('end' in st) { card.end = st.end; card.script.push({ depth, kind: 'end', text: st.end }); }
  }
}

function build(story: Story, main: boolean): StoryOut {
  const cards: SceneCard[] = story.scenes.map((s) => {
    const card: SceneCard = { id: s.id, trigger: trigger(s), places: [], speakers: [], lines: 0, journal: 0, sets: [], checks: [], choices: [], branches: [], credits: 0, strain: 0, gotos: [], unlocks: [], crew: [], script: [] };
    if (s.trigger.type === 'flag') card.checks.push(s.trigger.flag);
    const counter = { n: 0 };
    walk(s.steps, card, 0, counter);
    card.lines = counter.n;
    return card;
  });
  const rows: Row[] = [];
  if (main) {
    let row: Row | null = null;
    for (const c of cards) {
      if (c.chapter || !row) { row = { title: c.chapter?.title ?? 'Prologue', sub: c.chapter?.sub, story: story.id, scenes: [] }; rows.push(row); }
      row.scenes.push(c);
    }
  } else rows.push({ title: story.title, sub: story.contract ? worldName(story.contract.world) : undefined, story: story.id, scenes: cards });
  return { id: story.id, title: story.title, subtitle: story.subtitle, main, contract: story.contract, startWorld: worldName(story.startWorld), rows };
}

const data = { generated: new Date().toISOString().slice(0, 10), stories: [build(MAIN_STORY, true), ...SIDE_STORIES.map((s) => build(s, false))] };
const template = readFileSync(join(process.cwd(), 'scripts', 'storyboard.html'), 'utf8');
const html = template.replace('/*__DATA__*/null', JSON.stringify(data));
// the site copy carries its own document skeleton; a bare copy is kept for publishing as an artifact
writeFileSync(join(process.cwd(), 'public', 'storyboard.html'), `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>\n${html}\n</body></html>\n`);
if (process.env.STORYBOARD_BARE) writeFileSync(process.env.STORYBOARD_BARE, html);
const scenes = data.stories.reduce((n, s) => n + s.rows.reduce((m, r) => m + r.scenes.length, 0), 0);
const lines = data.stories.reduce((n, s) => n + s.rows.reduce((m, r) => m + r.scenes.reduce((k, c) => k + c.lines, 0), 0), 0);
console.log(`storyboard: ${data.stories.length} stories, ${scenes} scenes, ${lines} lines -> public/storyboard.html`);
