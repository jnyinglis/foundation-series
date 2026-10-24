// Prints the connected components of the galaxy map at a given jump range.
// Usage: npx tsx scripts/connectivity.ts [range]
import { WORLDS, distance, JUMP_RANGE } from '../src/data/worlds';
const R = Number(process.argv[2] ?? JUMP_RANGE);
const seen = new Set<string>(); const comps: string[][] = [];
for (const w of WORLDS) { if (seen.has(w.id)) continue; const comp: string[] = []; const stack = [w];
  while (stack.length) { const x = stack.pop()!; if (seen.has(x.id)) continue; seen.add(x.id); comp.push(x.id);
    for (const y of WORLDS) if (!seen.has(y.id) && distance(x, y) <= R) stack.push(y); }
  comps.push(comp); }
console.log(`range ${R}: ${comps.length} components`); for (const c of comps) console.log(' -', c.join(', '));
