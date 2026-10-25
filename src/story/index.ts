import type { Story } from './types';
import { SECOND_MIND } from './second-mind';
import { ASKONE_TABOO } from './askone';
import { KALGAN_WAGER } from './kalgan';
import { TAZENDA_TITHE } from './rossem';
import { ENCYCLOPEDIA_ERRAND } from './melpomenia';
import { TIME_VAULT } from './terminus';

export const MAIN_STORY: Story = SECOND_MIND;

/** Side adventures offered from the contracts board, in display order. */
export const SIDE_STORIES: Story[] = [ASKONE_TABOO, KALGAN_WAGER, TAZENDA_TITHE, ENCYCLOPEDIA_ERRAND, TIME_VAULT];

export function storyById(id: string): Story | undefined {
  return [MAIN_STORY, ...SIDE_STORIES].find((s) => s.id === id);
}
