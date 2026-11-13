import type { LatLng } from './geo';

export interface DirectionsTarget extends LatLng {
  name: string;
  /** Street address or venue as published. When present, Maps is given the address instead of coordinates. */
  address?: string;
  locality?: string;
  state?: string;
  postcode?: string;
}

/**
 * Apple Maps driving directions. Opens the Maps app on iPhone.
 * Uses the street address (with suburb, state and postcode) when the place has one, because a
 * published address is more exact than a locality-centre pin; otherwise the coordinates.
 */
export function directionsUrl(place: DirectionsTarget): string {
  const address = place.address?.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();
  if (address) {
    const area = [place.locality, place.state, place.postcode].filter(Boolean).join(' ');
    const destination = [address, area].filter(Boolean).join(', ');
    return `http://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`;
  }
  return `http://maps.apple.com/?daddr=${place.lat},${place.lng}&q=${encodeURIComponent(place.name)}&dirflg=d`;
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
