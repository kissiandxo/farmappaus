import type { Farm, LicenceCategory, ProductCategory } from './types';

/**
 * Licence category a product needs before it can go live.
 * See docs/COMPLIANCE.md. Not legal advice; rules vary by state.
 */
export const REQUIRED_LICENCE: Partial<Record<ProductCategory, LicenceCategory>> = {
  milk: 'dairy',
  eggs: 'eggs',
  chicken: 'poultry',
  beef: 'meat',
  lamb: 'meat',
  pork: 'meat',
};

/** True for products that need licence details before they can be listed (milk, eggs, chicken, beef, lamb, pork). */
export function isLicenceControlled(category: ProductCategory): boolean {
  return REQUIRED_LICENCE[category] !== undefined;
}

/**
 * Categories that are left off places loaded from public sources: nothing that needs a licence goes
 * live without licence details (docs/COMPLIANCE.md), and an unclaimed place has none.
 */
export const LICENCE_CONTROLLED_CATEGORIES: readonly ProductCategory[] = [
  'milk',
  'eggs',
  'chicken',
  'beef',
  'lamb',
  'pork',
];

export type ComplianceIssueCode = 'raw_milk_not_allowed' | 'licence_missing' | 'licence_expired';

export interface ComplianceIssue {
  code: ComplianceIssueCode;
  category?: LicenceCategory;
  message: string;
}

/** ISO dates (YYYY-MM-DD) compare correctly as strings. */
function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function validateListing(farm: Farm, now: Date = new Date()): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const today = todayIso(now);

  if (farm.products.some((p) => p.category === 'milk' && p.pasteurised !== true)) {
    issues.push({
      code: 'raw_milk_not_allowed',
      category: 'dairy',
      message: 'Milk must be pasteurised. Raw milk cannot be sold for drinking in Australia.',
    });
  }

  const needed = new Set<LicenceCategory>();
  for (const product of farm.products) {
    const category = REQUIRED_LICENCE[product.category];
    if (category) needed.add(category);
  }

  for (const category of needed) {
    const held = farm.licences.filter((l) => l.category === category);
    if (held.length === 0) {
      issues.push({
        code: 'licence_missing',
        category,
        message: `Add your ${category} licence or accreditation details.`,
      });
    } else if (held.every((l) => l.expiresOn !== undefined && l.expiresOn < today)) {
      issues.push({
        code: 'licence_expired',
        category,
        message: `Your ${category} licence has expired. Add a current one.`,
      });
    }
  }

  return issues;
}

export type LicenceBadge = 'checked' | 'declared' | 'none';

/** Summary badge for cards: "checked" only if every held licence was admin-checked. */
export function licenceBadge(farm: Farm): LicenceBadge {
  if (farm.licences.length === 0) return 'none';
  return farm.licences.every((l) => l.status === 'admin_checked') ? 'checked' : 'declared';
}
