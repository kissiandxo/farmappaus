import { REQUIRED_LICENCE } from './compliance';
import type { Farm, Licence, LicenceCategory, ListingStatus, Product } from './types';

export const STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Draft',
  pending: 'Waiting for review',
  live: 'Live',
  rejected: 'Not approved',
};

/** What a farmer should know about their listing's status, in plain words. */
export function statusAdvice(status: ListingStatus, reviewNote?: string | null): string {
  const note = reviewNote?.trim();
  switch (status) {
    case 'draft':
      return note
        ? `We asked for changes: ${note}`
        : 'Only you can see this. Finish it, then send it for review.';
    case 'pending':
      return 'We’re checking your listing and will publish it as soon as we can. You can still update your stock.';
    case 'live':
      return 'Customers can see this listing. Stock, price, hours and story changes appear straight away.';
    case 'rejected':
      return `This listing was not approved${note ? `: ${note}` : '.'} Fix the problems, then send it again.`;
  }
}

export function blankFarm(now: Date = new Date()): Farm {
  return {
    id: '',
    name: '',
    type: 'farm',
    state: 'NSW',
    locality: '',
    postcode: '',
    lat: 0,
    lng: 0,
    story: '',
    photos: [],
    products: [],
    tags: [],
    hours: { kind: 'appointment' },
    fulfilment: ['pickup'],
    paymentTypes: ['cash'],
    licences: [],
    isSample: false,
    updatedOn: now.toISOString().slice(0, 10),
    status: 'draft',
  };
}

export function blankProduct(): Product {
  return { category: 'honey', name: '', inStock: true };
}

export function blankLicence(category: LicenceCategory = 'meat'): Licence {
  return { category, regulator: '', licenceNumber: '', status: 'self_declared' };
}

/** Licence categories the farm's products need but that have no entry yet. */
export function missingLicenceCategories(farm: Pick<Farm, 'products' | 'licences'>): LicenceCategory[] {
  const needed = new Set<LicenceCategory>();
  for (const p of farm.products) {
    const category = REQUIRED_LICENCE[p.category];
    if (category) needed.add(category);
  }
  return [...needed].filter((c) => !farm.licences.some((l) => l.category === c));
}

const ISSUE_PHRASES: Record<string, string> = {
  raw_milk_not_allowed: 'milk must be pasteurised (raw milk can’t be sold for drinking)',
  licence_missing: 'a licence is missing',
  licence_expired: 'a licence has expired',
};

/**
 * Turns database error text into something a person can act on.
 * e.g. "Listing has food-safety issues: {licence_missing:meat}" -> "…a meat licence is missing".
 */
export function friendlyDbError(message: string | undefined): string {
  const m = message ?? '';
  const codes = m.match(/(raw_milk_not_allowed|licence_missing:\w+|licence_expired:\w+)/g);
  if (codes) {
    const phrases = [...new Set(codes)].map((code) => {
      const [kind, category] = code.split(':');
      const base = ISSUE_PHRASES[kind] ?? code;
      return category ? base.replace('a licence', `a ${category} licence`) : base;
    });
    return `This listing can’t go ahead yet: ${phrases.join('; ')}.`;
  }
  if (/limit of 5/i.test(m)) return 'You’ve reached today’s limit of 5 suggestions. Please try again tomorrow.';
  if (/duplicate key|already exists|unique/i.test(m)) return 'You’ve already done that.';
  if (/row-level security|permission denied/i.test(m)) return 'You don’t have permission to do that.';
  if (/network|fetch|timeout|failed to fetch/i.test(m)) return 'No connection right now. Please try again when you have reception.';
  return 'Something went wrong. Please try again.';
}
