import { readFileSync } from 'fs';
import { join } from 'path';

import { SCREENSHOT_SAVED_IDS, SCREENSHOT_SCENES } from '../../config';
import { REAL_FARMS } from '../../data/realFarms';
import { sellsMeat } from '../filters';
import { countTick, presetFilters, sceneIndexForTicks } from '../screenshotTour';
import { MEAT_CATEGORIES } from '../types';

const WORKFLOW = join(__dirname, '..', '..', '..', '.github', 'workflows', 'screenshots.yml');

/** The screenshot names the workflow takes, in order (`shot <name>` lines in the run script). */
function workflowShots(): string[] {
  return [...readFileSync(WORKFLOW, 'utf8').matchAll(/^\s*shot\s+"?([0-9]{2}-[a-z-]+)"?\s*$/gm)].map((m) => m[1]);
}

const farmFor = (href: string) => REAL_FARMS.find((f) => `/farm/${f.id}` === href);

describe('screenshot tour', () => {
  it('counts a tick only when the appearance goes from dark to light', () => {
    expect(countTick('dark', 'light', 0)).toBe(1);
    expect(countTick('light', 'dark', 1)).toBe(1);
    expect(countTick('light', 'light', 1)).toBe(1);
    expect(countTick(null, 'light', 1)).toBe(1);
    expect(countTick('dark', 'dark', 2)).toBe(2);
  });

  it('maps ticks to scenes, starting at 0 and staying on the last scene', () => {
    expect(sceneIndexForTicks(0, 7)).toBe(0);
    expect(sceneIndexForTicks(3, 7)).toBe(3);
    expect(sceneIndexForTicks(6, 7)).toBe(6);
    expect(sceneIndexForTicks(20, 7)).toBe(6);
    expect(sceneIndexForTicks(-1, 7)).toBe(0);
    expect(sceneIndexForTicks(Number.NaN, 7)).toBe(0);
    expect(sceneIndexForTicks(0, 0)).toBe(-1);
  });

  it('the scene list and the workflow take the same shots in the same order', () => {
    const shots = workflowShots();
    // One shot per scene, then the last scene (the map) again in dark appearance.
    expect(shots).toEqual([...SCREENSHOT_SCENES.map((s) => s.shot), '07-map-dark']);
    expect(SCREENSHOT_SCENES[SCREENSHOT_SCENES.length - 1].href).toBe('/map');
  });

  it('the workflow ticks once between each pair of shots', () => {
    const script = readFileSync(WORKFLOW, 'utf8');
    const ticks = [...script.matchAll(/^\s*next\s+\d+\s*$/gm)].length;
    expect(ticks).toBe(SCREENSHOT_SCENES.length - 1);
  });

  it('the meat preset selects every meat category some place offers, and nothing else', () => {
    const filters = presetFilters('meat', REAL_FARMS);
    expect(filters.products.length).toBeGreaterThan(0);
    expect(filters.products.every((c) => MEAT_CATEGORIES.includes(c))).toBe(true);
    expect(filters).toMatchObject({ maxKm: null, when: 'any', tags: [], types: [] });
    expect(presetFilters('meat', [{ products: [{ category: 'beef', name: 'Beef', inStock: true }] }]).products).toEqual(['beef']);
    expect(presetFilters('none', REAL_FARMS)).toEqual({ products: [], maxKm: null, when: 'any', tags: [], types: [] });
  });

  it('every place the tour or Saved shows is a real listing', () => {
    for (const scene of SCREENSHOT_SCENES.filter((s) => s.href.startsWith('/farm/'))) {
      expect(farmFor(scene.href)).toBeDefined();
    }
    for (const id of SCREENSHOT_SAVED_IDS) expect(REAL_FARMS.some((f) => f.id === id)).toBe(true);
  });

  it('the meat place is a farm shop, stall or farm with a street address and weekly hours, and is pre-saved', () => {
    const scene = SCREENSHOT_SCENES.find((s) => s.shot === '03-place-meat')!;
    const farm = farmFor(scene.href)!;
    expect(farm.type).not.toBe('farmers_market');
    expect(farm.products.some((p) => p.category === 'beef' || p.category === 'lamb')).toBe(true);
    expect(farm.locationApprox).toBeFalsy();
    expect(farm.hours.kind).toBe('weekly');
    expect(farm.hours.kind === 'weekly' && !farm.hours.irregular).toBe(true);
    expect(SCREENSHOT_SAVED_IDS).toContain(farm.id);
  });

  it('the market scene is a weekly farmers market that lists meat', () => {
    const scene = SCREENSHOT_SCENES.find((s) => s.shot === '04-place-market')!;
    const farm = farmFor(scene.href)!;
    expect(farm.type).toBe('farmers_market');
    expect(farm.hours.kind).toBe('weekly');
    expect(sellsMeat(farm)).toBe(true);
  });
});
