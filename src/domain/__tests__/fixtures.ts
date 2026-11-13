import type { Farm } from '../types';

/** Minimal valid farm for tests. Override only what a test cares about. */
export function makeFarm(overrides: Partial<Farm> = {}): Farm {
  return {
    id: 'test-farm',
    name: 'Test Farm',
    type: 'farm',
    state: 'NSW',
    locality: 'Testville',
    postcode: '2000',
    lat: -33.9,
    lng: 151.2,
    story: 'Test.',
    products: [{ category: 'honey', name: 'Honey', inStock: true }],
    tags: [],
    hours: { kind: 'always' },
    fulfilment: ['pickup'],
    paymentTypes: ['cash'],
    licences: [],
    isSample: true,
    updatedOn: '2026-11-01',
    ...overrides,
  };
}
