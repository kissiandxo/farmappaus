import * as Location from 'expo-location';

import { isInAustralia, type LatLng } from '../domain/geo';
import { bundledPlaces, formatPlace, nearestPlace } from '../domain/places';
import { STATE_NAMES, type StateCode } from '../domain/types';
import type { UserLocation } from '../state/SearchContext';
import { withTimeout } from './async';

export type LocateResult =
  | { ok: true; location: UserLocation }
  | { ok: false; message: string; canOpenSettings: boolean };

/** A cached fix older than this, or less accurate than this, is not used. */
const LAST_KNOWN_MAX_AGE_MS = 5 * 60_000;
const LAST_KNOWN_ACCURACY_M = 2000;
const FIX_TIMEOUT_MS = 10_000;
const GEOCODE_TIMEOUT_MS = 4_000;
/** A bundled suburb further away than this is not used to name a point. */
const NEAREST_SUBURB_MAX_KM = 15;

export const OUTSIDE_AUSTRALIA_MESSAGE =
  'Farm Direct lists places in Australia. Your location looks to be outside Australia, so the app will keep showing places near Sydney. You can search any Australian suburb or postcode instead.';

const STATE_CODES = Object.keys(STATE_NAMES) as StateCode[];

function stateCodeFor(region: string | null | undefined): StateCode | null {
  const text = region?.trim().toLowerCase();
  if (!text) return null;
  return STATE_CODES.find((code) => code.toLowerCase() === text || STATE_NAMES[code].toLowerCase() === text) ?? null;
}

async function describePoint(p: LatLng, fallback: string): Promise<string> {
  try {
    // 1. Offline: the nearest bundled suburb, if it is close enough to be honest.
    const place = nearestPlace(p, bundledPlaces(), NEAREST_SUBURB_MAX_KM);
    if (place) return formatPlace(place);

    // 2. Apple's reverse geocoder (sends the coordinate to Apple; only reached when step 1 fails).
    const [address] = await withTimeout(
      Location.reverseGeocodeAsync({ latitude: p.lat, longitude: p.lng }),
      GEOCODE_TIMEOUT_MS,
    );
    const town = (address?.city ?? address?.subregion ?? '').trim();
    const state = stateCodeFor(address?.region);
    if (town && state) return `${town} ${state}`;
  } catch {
    // fall through
  }
  return fallback;
}

/**
 * A short name for a point on the map, e.g. "Toowoomba QLD 4350". Uses the nearest bundled suburb within
 * 15 km, then Apple's reverse geocoder (4 s limit), then "Map area". Never throws.
 */
export function labelForPoint(p: LatLng): Promise<string> {
  return describePoint(p, 'Map area');
}

/**
 * Asks for foreground location permission (if needed) and returns the current position as a
 * `UserLocation`. Uses a cached fix only when it is recent and accurate; otherwise asks for a fresh one,
 * giving up after 10 s. A fix outside Australia is refused with an explanation. Never throws. Shared by the
 * location sheet and the map's locate-me button.
 */
export async function locateMe(): Promise<LocateResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return {
        ok: false,
        message:
          'Location access is off for Farm Direct. You can turn it on in Settings, or search by suburb or postcode instead.',
        canOpenSettings: !permission.canAskAgain,
      };
    }
    const position = await withTimeout(
      (async () =>
        (await Location.getLastKnownPositionAsync({
          maxAge: LAST_KNOWN_MAX_AGE_MS,
          requiredAccuracy: LAST_KNOWN_ACCURACY_M,
        })) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })))(),
      FIX_TIMEOUT_MS,
    );
    const point = { lat: position.coords.latitude, lng: position.coords.longitude };
    if (!isInAustralia(point)) {
      return { ok: false, canOpenSettings: false, message: OUTSIDE_AUSTRALIA_MESSAGE };
    }
    return {
      ok: true,
      location: {
        label: await describePoint(point, 'Your location'),
        lat: point.lat,
        lng: point.lng,
        source: 'gps',
      },
    };
  } catch {
    return {
      ok: false,
      message:
        'We couldn’t find your location. Check that Location Services is on, or search by suburb or postcode.',
      canOpenSettings: false,
    };
  }
}
