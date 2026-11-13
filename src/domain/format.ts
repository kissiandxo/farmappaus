/** Formats integer cents as Australian dollars, e.g. 550 -> "$5.50". */
export function formatAud(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const rest = (abs % 100).toString().padStart(2, '0');
  return `${sign}$${dollars}.${rest}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-01" -> "1 Nov 2026". Returns the input unchanged if it is not an ISO date. */
export function formatDateAu(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : iso;
}

/** A listing not updated for this many days gets a "call ahead" warning. */
export const STALE_AFTER_DAYS = 90;

/** Whole days between an ISO date and now (never negative). */
export function ageInDays(iso: string, now: Date): number {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return 0;
  const then = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((today - then) / 86_400_000));
}

export function isStale(iso: string, now: Date): boolean {
  return ageInDays(iso, now) >= STALE_AFTER_DAYS;
}

/** "today", "yesterday", "12 days ago", "3 months ago", "2 years ago". */
export function describeAge(iso: string, now: Date): string {
  const days = ageInDays(iso, now);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days} days ago`;
  if (days < 730) {
    const months = Math.floor(days / 30);
    return `${months} months ago`;
  }
  return `${Math.floor(days / 365)} years ago`;
}

/** "$7.50 / dozen", or just the price when there is no unit. */
export function formatPrice(cents: number, unit?: string): string {
  return unit ? `${formatAud(cents)} / ${unit}` : formatAud(cents);
}
