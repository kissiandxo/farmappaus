jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { bundledFarms } from '../repository';
import { REAL_FARMS } from '../realFarms';

describe('bundledFarms (no backend configured)', () => {
  it('is the real, unclaimed places and never sample data', () => {
    const farms = bundledFarms();
    expect(farms).toBe(REAL_FARMS);
    expect(farms.length).toBeGreaterThan(0);
    expect(farms.every((f) => !f.isSample && f.unclaimed === true)).toBe(true);
  });
});
