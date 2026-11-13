import * as Location from 'expo-location';

import { nearestPlace } from '../domain/places';
import type { UserLocation } from '../state/SearchContext';

export type LocateResult =
  | { ok: true; location: UserLocation }
  | { ok: false; message: string; canOpenSettings: boolean };

/**
 * Asks for foreground location permission (if needed) and returns the current position as a
 * `UserLocation`. Never throws. Shared by the location sheet and the map's locate-me button.
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
    const position =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    const { latitude, longitude } = position.coords;
    const near = nearestPlace({ lat: latitude, lng: longitude });
    return {
      ok: true,
      location: {
        label: near ? `${near.locality} ${near.state}` : 'Your location',
        lat: latitude,
        lng: longitude,
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
