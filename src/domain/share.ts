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
