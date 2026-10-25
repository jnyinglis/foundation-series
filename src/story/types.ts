// Data format for story scripts. A story is a list of scenes. Each scene fires
// once when its trigger happens, and runs its steps in order.

export type Place = 'space' | 'city' | 'cantina' | 'archive' | 'library' | 'sacratorium' | 'terrace' | 'vault' | 'ruins' | 'estate' | 'village' | 'moon' | 'salon';

export type Trigger =
  | { type: 'start' }
  | { type: 'arrive'; world: string }
  | { type: 'orbit'; world: string }
  | { type: 'depart'; world: string }
  | { type: 'landmark'; id: string }
  | { type: 'flag'; flag: string };

export interface Choice {
  text: string;
  set?: string[];
  strain?: number;
  credits?: number;
  fuel?: number;
  goto?: string;
  /** Only show this choice when all of these flags are set. */
  needs?: string[];
  /** Only show this choice when strain is at or below this value. */
  maxStrain?: number;
}

export type Step =
  | { say: string; who?: string }
  | { choice: Choice[] }
  | { set: string[] }
  | { if: string[]; then: Step[]; else?: Step[] }
  | { objective: string }
  | { journal: string }
  | { unlock: string[] }
  | { crew: string }
  | { chapter: string; sub?: string }
  | { strain: number }
  | { credits: number }
  | { fuel: number }
  | { goto: string }
  | { message: string }
  | { enter: Place; label?: string; cast?: string[]; extra?: FigureSpec[] }
  | { complete: string }
  | { end: string };

export interface Scene {
  id: string;
  trigger: Trigger;
  steps: Step[];
  /** Scenes run once by default. */
  repeat?: boolean;
}

export interface FigureSpec { name: string; pos: number[]; yaw: number; seated: boolean }

export interface EnterOptions { label?: string; cast?: string[]; extra?: FigureSpec[] }

export interface Contract {
  /** World where the contract plays out. */
  world: string;
  summary: string;
  reward: string;
  /** Flags that must be set before the contract is offered. */
  requires?: string[];
}

export interface Story {
  id: string;
  title: string;
  subtitle: string;
  /** Present on side adventures offered from the contracts board. */
  contract?: Contract;
  startWorld: string;
  /** Foundation Era year at day zero. */
  baseYear: number;
  startCredits: number;
  unlocked: string[];
  scenes: Scene[];
}

export interface StoryState {
  flags: string[];
  done: string[];
  strain: number;
  crew: string[];
  objective: string;
  journal: string[];
  unlocked: string[];
  ended: boolean;
  /** Accepted side adventures, by story id. */
  contracts: string[];
  completed: string[];
}

export function newStoryState(story: Story | null): StoryState {
  return { flags: [], done: [], strain: 0, crew: story ? ['Ilen Sarvo'] : [], objective: '', journal: [], unlocked: story ? [...story.unlocked] : [], ended: false, contracts: [], completed: [] };
}
