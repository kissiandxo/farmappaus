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

/** "$7.50 / dozen", or just the price when there is no unit. */
export function formatPrice(cents: number, unit?: string): string {
  return unit ? `${formatAud(cents)} / ${unit}` : formatAud(cents);
}
