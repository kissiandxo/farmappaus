import { mapsPlaceUrl, websiteUrl } from './links';
import { VENUE_LABELS, type Farm } from './types';

/**
 * Plain text for the share sheet. Only listing data: the name, type and suburb, the address and website
 * when published, and an Apple Maps link. Never opening hours or "open now", which go out of date in a
 * message thread.
 */
export function shareText(farm: Farm): string {
  const lines = [
    farm.name,
    `${VENUE_LABELS[farm.type]} · ${farm.locality} ${farm.state} ${farm.postcode}`.replace(/\s+/g, ' ').trim(),
  ];
  const address = farm.address?.trim();
  if (address) lines.push(address);
  const site = farm.website ? websiteUrl(farm.website) : null;
  if (site) lines.push(site);
  lines.push(mapsPlaceUrl(farm));
  return lines.join('\n');
}

/** Share only visible saved stops. Opening times and the shopper's starting point stay out of the message. */
export function shareStops(farms: readonly Farm[], weekend: boolean): string {
  const title = weekend ? 'My weekend food stops' : 'My saved food stops';
  const stops = farms.map((farm, index) => {
    const area = [farm.address?.trim(), farm.locality, farm.state].filter(Boolean).join(', ');
    return `${index + 1}. ${farm.name}\n${area}\n${mapsPlaceUrl(farm)}`;
  });
  return [title, ...stops].join('\n\n');
}
