import type { LatLng } from './geo';

/** Apple Maps driving directions. Opens the Maps app on iPhone. */
export function directionsUrl(place: LatLng & { name: string }): string {
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
