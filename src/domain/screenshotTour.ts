// Pure logic for the screenshot build's tour (see SCREENSHOT_SCENES in src/config.ts and
// .github/workflows/screenshots.yml). The simulator is too slow for a timetable, so the workflow moves the app on
// one scene at a time by switching the system appearance to dark and back to light.

import { DEFAULT_FILTERS, type FarmFilters } from './filters';
import { MEAT_CATEGORIES, type Farm } from './types';

/** "none" clears every filter; "meat" clears them and then selects every meat category on offer. */
export type ScreenshotFilterPreset = 'none' | 'meat';

export interface ScreenshotScene {
  /** The screenshot file name the workflow saves for this scene, e.g. "02-explore-meat". */
  shot: string;
  /** Where the app goes for this scene. */
  href: string;
  /** Applied with setFilters when set; left alone when not. */
  filters?: ScreenshotFilterPreset;
  /** Applied with setQuery when set; left alone when not. */
  query?: string;
}

export type Appearance = 'light' | 'dark' | null | undefined;

/** One tick each time the appearance goes from dark back to light. Anything else leaves the count alone. */
export function countTick(previous: Appearance, next: Appearance, ticks: number): number {
  return previous === 'dark' && next === 'light' ? ticks + 1 : ticks;
}

/** The scene to show after `ticks` ticks: scene 0 at launch, then one per tick, staying on the last scene. */
export function sceneIndexForTicks(ticks: number, sceneCount: number): number {
  if (sceneCount <= 0) return -1;
  if (!Number.isFinite(ticks) || ticks < 0) return 0;
  return Math.min(Math.floor(ticks), sceneCount - 1);
}

/** The filters a preset stands for, given the places in the app (only meat categories some place offers). */
export function presetFilters(preset: ScreenshotFilterPreset, farms: readonly Pick<Farm, 'products'>[]): FarmFilters {
  if (preset === 'none') return { ...DEFAULT_FILTERS, products: [], tags: [], types: [] };
  const offered = MEAT_CATEGORIES.filter((c) => farms.some((f) => f.products.some((p) => p.inStock && p.category === c)));
  return { ...DEFAULT_FILTERS, products: [...offered], tags: [], types: [] };
}
