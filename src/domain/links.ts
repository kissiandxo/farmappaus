import type { LatLng } from './geo';

export interface DirectionsTarget extends LatLng {
  name: string;
  /** Street address or venue as published. When present, Maps is given the address instead of coordinates. */
  address?: string;
  locality?: string;
  state?: string;
  postcode?: string;
  /** True when lat/lng is only the suburb centre. Maps is then given the name and suburb instead. */
  locationApprox?: boolean;
}

/**
 * What to search for in Apple Maps instead of coordinates: the street address (parentheses removed) with
 * suburb, state and postcode when the place has one; otherwise, for a suburb-centre pin, the name and suburb.
 * Null when the coordinates are the best destination.
 */
function placeQuery(place: DirectionsTarget): string | null {
  const address = place.address?.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();
  if (address) {
    const area = [place.locality, place.state, place.postcode].filter(Boolean).join(' ');
    return [address, area].filter(Boolean).join(', ');
  }
  if (place.locationApprox && place.locality) {
    const area = [place.locality, place.state].filter(Boolean).join(' ');
    return `${place.name}, ${area}`;
  }
  return null;
}

/**
 * Apple Maps driving directions. Opens the Maps app on iPhone.
 * Uses the street address (with suburb, state and postcode) when the place has one, because a
 * published address is more exact than a locality-centre pin; otherwise the coordinates.
 */
export function directionsUrl(place: DirectionsTarget): string {
  const destination = placeQuery(place);
  if (destination) return `http://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`;
  return `http://maps.apple.com/?daddr=${place.lat},${place.lng}&q=${encodeURIComponent(place.name)}&dirflg=d`;
}

/**
 * Apple Maps link for sharing. Drops a pin named after the place at its coordinates when they are exact.
 * When the coordinates are only the suburb centre, searches for the address (or name and suburb) instead,
 * so no named pin lands in the wrong spot.
 */
export function mapsPlaceUrl(place: DirectionsTarget): string {
  if (place.locationApprox) {
    const q = placeQuery(place);
    if (q) return `http://maps.apple.com/?q=${encodeURIComponent(q)}`;
  }
  return `http://maps.apple.com/?q=${encodeURIComponent(place.name)}&ll=${place.lat},${place.lng}`;
}

function readablePath(url: string): string | undefined {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last) return undefined;
    let text = last;
    try {
      text = decodeURIComponent(last);
    } catch {
      // keep the raw segment
    }
    text = text
      .replace(/\.(html?|php|aspx?)$/i, '')
      .replace(/[-_+]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return undefined;
    return text.length > 40 ? `${text.slice(0, 39).trimEnd()}…` : text;
  } catch {
    return undefined;
  }
}

/**
 * Rows for a "Sources" list: the site name as the title and, when the same site appears more than once,
 * a short readable page name as the subtitle. Links that are not web pages and exact repeats are dropped.
 */
export function sourceRows(urls: string[]): { url: string; title: string; subtitle?: string }[] {
  const items = urls
    .map((raw) => {
      const url = websiteUrl(raw);
      const title = hostLabel(raw);
      return url && title ? { url, title } : null;
    })
    .filter((x): x is { url: string; title: string } => x !== null);

  const hostCount = new Map<string, number>();
  for (const item of items) hostCount.set(item.title, (hostCount.get(item.title) ?? 0) + 1);

  const seen = new Set<string>();
  const rows: { url: string; title: string; subtitle?: string }[] = [];
  for (const item of items) {
    const subtitle = (hostCount.get(item.title) ?? 0) > 1 ? readablePath(item.url) : undefined;
    const key = `${item.title}\n${subtitle ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(subtitle ? { ...item, subtitle } : item);
  }
  return rows;
}

/** "07 4123 4567" -> "tel:0741234567". Returns null if there are no digits. */
export function telUrl(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return /\d/.test(cleaned) ? `tel:${cleaned}` : null;
}

/** Adds https:// when missing. Rejects other schemes (javascript:, file:, etc.) and non-hosts. */
export function websiteUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text);
  if (hasScheme && !/^https?:\/\//i.test(text)) return null;
  const candidate = hasScheme ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    return url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}

/** "https://www.example.com.au/about" -> "example.com.au". Returns null for anything that is not a web link. */
export function hostLabel(raw: string): string | null {
  const url = websiteUrl(raw);
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

const EMAIL_ADDRESS = /^[^\s@?&#%,;:<>()"'\\]+@[^\s@?&#%,;:<>()"'\\]+\.[^\s@?&#%,;:<>()"'\\]{2,}$/;

/**
 * Builds a `mailto:` link with the subject and body percent-encoded (spaces as %20, line breaks as %0A).
 * Returns null when the address is blank or not a plain single address, so callers can hide the action.
 * Line breaks in the subject are collapsed so it stays a single header line.
 */
export function mailtoUrl(to: string, subject = '', body = ''): string | null {
  const address = to.trim();
  if (!EMAIL_ADDRESS.test(address)) return null;
  const params: string[] = [];
  const cleanSubject = subject.replace(/\s+/g, ' ').trim();
  if (cleanSubject) params.push(`subject=${encodeURIComponent(cleanSubject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${address}${params.length ? `?${params.join('&')}` : ''}`;
}
