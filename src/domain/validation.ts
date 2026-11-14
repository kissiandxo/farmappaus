import { validateListing } from './compliance';
import { websiteUrl } from './links';
import type { Farm, ProductCategory } from './types';

export function validateEmail(email: string): string | null {
  const text = email.trim();
  if (!text) return 'Enter your email address.';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text) ? null : 'That doesn’t look like an email address.';
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (/^\d+$/.test(password)) return 'Add some letters as well as numbers.';
  return null;
}

/**
 * Australian phone numbers. Returns a tidy display form, or null if it is not valid.
 * "0412345678" -> "0412 345 678"; "(07) 4123 4567" -> "07 4123 4567"; "+61 412 345 678" -> "0412 345 678".
 */
export function normaliseAuPhone(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+61')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('61') && digits.length === 11) digits = `0${digits.slice(2)}`;
  if (!/^\d{10}$/.test(digits)) return null;
  if (/^04\d{8}$/.test(digits)) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  if (/^0[2378]\d{8}$/.test(digits)) return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  if (/^1[38]00\d{6}$/.test(digits)) return null;
  return null;
}

/** ABN checksum from the Australian Business Register (weights, minus 1 from the first digit, mod 89). */
export function isValidAbn(abn: string): boolean {
  const digits = abn.replace(/\s/g, '');
  if (!/^\d{11}$/.test(digits)) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const sum = [...digits].reduce((total, d, i) => total + (Number(d) - (i === 0 ? 1 : 0)) * weights[i], 0);
  return sum % 89 === 0;
}

/** "31/12/2030" -> "2030-12-31". Null for impossible dates like 31/02/2030. */
export function parseAuDate(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** "2030-12-31" -> "31/12/2030" for editing. */
export function isoToAuDate(iso: string | undefined): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** "7.50", "$7.5", "7" -> cents. Null if not a sensible price. */
export function priceToCents(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, '');
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export function centsToInput(cents: number | undefined): string {
  return cents === undefined ? '' : (cents / 100).toFixed(2);
}

export interface DraftIssue {
  field: 'name' | 'story' | 'location' | 'products' | 'licences' | 'hours' | 'contact' | 'payment';
  message: string;
}

const REGULATED: ProductCategory[] = ['milk', 'eggs', 'chicken', 'beef', 'lamb', 'pork'];

/** Everything that must be fixed before a listing can be sent for review. */
export function draftIssues(farm: Farm, now: Date = new Date()): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const name = farm.name.trim();
  if (name.length < 2 || name.length > 100) issues.push({ field: 'name', message: 'Give your place a name (2–100 characters).' });
  if (farm.story.trim().length < 20) issues.push({ field: 'story', message: 'Tell your story in at least a couple of sentences (20+ characters).' });
  if (farm.story.length > 2000) issues.push({ field: 'story', message: 'Your story is too long (2000 characters maximum).' });
  if (!/^\d{4}$/.test(farm.postcode) || !farm.locality) issues.push({ field: 'location', message: 'Choose your suburb or postcode.' });
  if (farm.products.length === 0) issues.push({ field: 'products', message: 'Add at least one product.' });
  if (farm.hours.kind === 'weekly' && Object.keys(farm.hours.days).length === 0) {
    issues.push({ field: 'hours', message: 'Add your opening hours, or choose "By appointment".' });
  }
  if (farm.fulfilment.length === 0) issues.push({ field: 'hours', message: 'Choose pick-up, delivery, or both.' });
  if (farm.paymentTypes.length === 0) issues.push({ field: 'payment', message: 'Choose at least one way customers can pay you.' });
  if (!farm.phone && !farm.website) issues.push({ field: 'contact', message: 'Add a phone number or a website so customers can reach you.' });
  if (farm.phone && !normaliseAuPhone(farm.phone)) issues.push({ field: 'contact', message: 'That phone number doesn’t look right.' });
  if (farm.website && !websiteUrl(farm.website)) issues.push({ field: 'contact', message: 'That website address doesn’t look right.' });

  for (const issue of validateListing(farm, now)) {
    issues.push({
      field: issue.code === 'raw_milk_not_allowed' ? 'products' : 'licences',
      message: issue.message,
    });
  }
  return issues;
}

export function hasRegulatedProducts(farm: Pick<Farm, 'products'>): boolean {
  return farm.products.some((p) => REGULATED.includes(p.category));
}
