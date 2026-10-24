import type { Story, StoryState, Scene, Step, Trigger, Choice } from './types';

export interface StoryHooks {
  say(who: string, text: string): Promise<void>;
  choose(options: Choice[]): Promise<Choice>;
  chapter(title: string, sub: string): Promise<void>;
  message(text: string): void;
  objective(text: string): void;
  journal(text: string): void;
  strain(value: number): void;
  credits(delta: number): void;
  fuel(delta: number): void;
  unlock(worlds: string[]): void;
  crew(name: string): void;
  lock(locked: boolean): void;
  end(text: string): void;
  save(): void;
}

function triggerMatches(a: Trigger, b: Trigger): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'start') return true;
  if (a.type === 'flag') return a.flag === (b as { flag: string }).flag;
  return (a as { world: string }).world === (b as { world: string }).world;
}

export class StoryEngine {
  private running = false;
  private queue: Trigger[] = [];

  constructor(readonly story: Story, readonly state: StoryState, private hooks: StoryHooks) {}

  get busy(): boolean { return this.running; }

  hasFlag(f: string): boolean { return this.state.flags.includes(f); }

  private waiters: (() => void)[] = [];

  /** Queues a trigger. Resolves when the queue has drained. */
  fire(t: Trigger): Promise<void> {
    this.queue.push(t);
    // register the waiter first: a drain with no matching scene completes synchronously
    const done = new Promise<void>((resolve) => this.waiters.push(resolve));
    if (!this.running) void this.drain();
    return done;
  }

  private async drain(): Promise<void> {
    this.running = true;
    try {
      while (this.queue.length) {
        const t = this.queue.shift()!;
        const scene = this.story.scenes.find((s) => !this.state.done.includes(s.id) && triggerMatches(s.trigger, t));
        if (!scene) continue;
        await this.runScene(scene);
      }
    } finally {
      this.running = false;
      const w = this.waiters; this.waiters = [];
      for (const r of w) r();
    }
  }

  private async runScene(scene: Scene): Promise<void> {
    if (!scene.repeat) this.state.done.push(scene.id);
    this.hooks.lock(true);
    try {
      let next: string | null = await this.runSteps(scene.steps);
      while (next) {
        const target = this.story.scenes.find((s) => s.id === next);
        if (!target) break;
        if (!target.repeat) this.state.done.push(target.id);
        next = await this.runSteps(target.steps);
      }
    } finally {
      this.hooks.lock(false);
      this.hooks.save();
    }
  }

  private setFlags(flags: string[]): void {
    for (const f of flags) {
      if (!this.state.flags.includes(f)) {
        this.state.flags.push(f);
        this.queue.push({ type: 'flag', flag: f });
      }
    }
  }

  /** Runs steps. Returns a scene id to jump to, or null. */
  private async runSteps(steps: Step[]): Promise<string | null> {
    for (const step of steps) {
      if ('say' in step) {
        await this.hooks.say(step.who ?? '', step.say);
      } else if ('choice' in step) {
        const options = step.choice.filter((c) => !c.needs || c.needs.every((f) => this.hasFlag(f)));
        const c = await this.hooks.choose(options);
        if (c.set) this.setFlags(c.set);
        if (c.strain) { this.state.strain += c.strain; this.hooks.strain(this.state.strain); }
        if (c.credits) this.hooks.credits(c.credits);
        if (c.fuel) this.hooks.fuel(c.fuel);
        if (c.goto) return c.goto;
      } else if ('set' in step) {
        this.setFlags(step.set);
      } else if ('if' in step) {
        const ok = step.if.every((f) => this.hasFlag(f));
        const r = await this.runSteps(ok ? step.then : (step.else ?? []));
        if (r) return r;
      } else if ('objective' in step) {
        this.state.objective = step.objective;
        this.hooks.objective(step.objective);
      } else if ('journal' in step) {
        this.state.journal.push(step.journal);
        this.hooks.journal(step.journal);
      } else if ('unlock' in step) {
        for (const w of step.unlock) if (!this.state.unlocked.includes(w)) this.state.unlocked.push(w);
        this.hooks.unlock(this.state.unlocked);
      } else if ('crew' in step) {
        if (!this.state.crew.includes(step.crew)) this.state.crew.push(step.crew);
        this.hooks.crew(step.crew);
      } else if ('chapter' in step) {
        await this.hooks.chapter(step.chapter, step.sub ?? '');
      } else if ('strain' in step) {
        this.state.strain += step.strain;
        this.hooks.strain(this.state.strain);
      } else if ('credits' in step) {
        this.hooks.credits(step.credits);
      } else if ('fuel' in step) {
        this.hooks.fuel(step.fuel);
      } else if ('goto' in step) {
        return step.goto;
      } else if ('message' in step) {
        this.hooks.message(step.message);
      } else if ('end' in step) {
        this.state.ended = true;
        this.hooks.end(step.end);
      }
    }
    return null;
  }
}
