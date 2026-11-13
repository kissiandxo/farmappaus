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

/** "$7.50 / dozen", or just the price when there is no unit. */
export function formatPrice(cents: number, unit?: string): string {
  return unit ? `${formatAud(cents)} / ${unit}` : formatAud(cents);
}
