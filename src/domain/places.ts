import { haversineKm, type LatLng } from './geo';
import type { StateCode } from './types';

export interface Place extends LatLng {
  postcode: string;
  locality: string;
  state: StateCode;
}

type Row = [string, string, StateCode, number, number];

let bundled: Place[] | null = null;

/** Loads the bundled offline postcode list on first use (about 1 MB, no network). */
export function bundledPlaces(): Place[] {
  if (!bundled) {
    const rows = require('../data/auPostcodes.json') as Row[];
    bundled = rows.map(([postcode, locality, state, lat, lng]) => ({
      postcode,
      locality,
      state,
      lat,
      lng,
    }));
  }
  return bundled;
}

/** "Toowoomba QLD 4350" (Australian address order). */
export function formatPlace(place: Place): string {
  return `${place.locality} ${place.state} ${place.postcode}`;
}

const STATE_CODES: StateCode[] = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

interface ParsedQuery {
  name: string;
  postcode: string;
  state: StateCode | null;
}

export function parseQuery(query: string): ParsedQuery {
  const tokens = query.trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
  let state: StateCode | null = null;
  let postcode = '';
  const nameTokens: string[] = [];
  for (const token of tokens) {
    const asState = STATE_CODES.find((s) => s.toLowerCase() === token);
    if (asState && tokens.length > 1) state = asState;
    else if (/^\d{1,4}$/.test(token)) postcode = token;
    else nameTokens.push(token);
  }
  return { name: nameTokens.join(' '), postcode, state };
}

const lowerCache = new WeakMap<Place[], string[]>();
function lowerNames(places: Place[]): string[] {
  let names = lowerCache.get(places);
  if (!names) {
    names = places.map((p) => p.locality.toLowerCase());
    lowerCache.set(places, names);
  }
  return names;
}

/**
 * Finds suburbs by name and/or postcode. Examples: "toowoomba", "4350",
 * "daylesford vic", "red hill 3937". Best matches first.
 */
export function searchPlaces(
  query: string,
  options: { limit?: number; places?: Place[] } = {},
): Place[] {
  const { limit = 8, places = bundledPlaces() } = options;
  const { name, postcode, state } = parseQuery(query);
  if (!name && postcode.length < 3) return [];
  if (name && name.length < 2) return [];

  const names = lowerNames(places);
  const scored: { place: Place; score: number }[] = [];

  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    if (state && place.state !== state) continue;
    if (postcode && !place.postcode.startsWith(postcode)) continue;

    let score = 0;
    if (name) {
      const lc = names[i];
      if (lc === name) score = 0;
      else if (lc.startsWith(name)) score = 1;
      else if (lc.includes(` ${name}`)) score = 2;
      else continue;
    } else {
      score = place.postcode === postcode ? 0 : 1;
    }
    scored.push({ place, score });
  }

  return scored
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.place.locality.length - b.place.locality.length ||
        a.place.locality.localeCompare(b.place.locality) ||
        a.place.postcode.localeCompare(b.place.postcode),
    )
    .slice(0, limit)
    .map((s) => s.place);
}

/**
 * Nearest listed suburb to a point, used to name a GPS fix without any network call. Returns null when the
 * nearest suburb is more than `maxKm` away (for example, a phone outside Australia).
 */
export function nearestPlace(
  point: LatLng,
  places: Place[] = bundledPlaces(),
  maxKm = Infinity,
): Place | null {
  let best: Place | null = null;
  let bestKm = Infinity;
  for (const place of places) {
    const km = haversineKm(point, place);
    if (km < bestKm) {
      bestKm = km;
      best = place;
    }
  }
  return best && bestKm <= maxKm ? best : null;
}
