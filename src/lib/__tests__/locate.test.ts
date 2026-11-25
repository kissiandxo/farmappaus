import * as Location from 'expo-location';

import { labelForPoint, locateMe, OUTSIDE_AUSTRALIA_MESSAGE } from '../locate';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const mocked = Location as jest.Mocked<typeof Location>;

const fix = (lat: number, lng: number) =>
  ({ coords: { latitude: lat, longitude: lng, accuracy: 20 }, timestamp: Date.now() }) as never;

const TOOWOOMBA = { lat: -27.5598, lng: 151.9507 };
const APPLE_PARK = { lat: 37.33, lng: -122.01 };
// Middle of the Nullarbor: in Australia but more than 15 km from any listed suburb.
const OUTBACK = { lat: -30.5, lng: 128.5 };

beforeEach(() => {
  jest.resetAllMocks();
  mocked.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted', canAskAgain: true } as never);
  mocked.reverseGeocodeAsync.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('locateMe', () => {
  it('asks only for a recent, accurate cached fix, then falls back to the current position', async () => {
    mocked.getLastKnownPositionAsync.mockResolvedValue(null);
    mocked.getCurrentPositionAsync.mockResolvedValue(fix(TOOWOOMBA.lat, TOOWOOMBA.lng));

    const result = await locateMe();

    expect(mocked.getLastKnownPositionAsync).toHaveBeenCalledWith({ maxAge: 300_000, requiredAccuracy: 2000 });
    expect(mocked.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Balanced });
    expect(result).toEqual({
      ok: true,
      location: {
        label: expect.stringMatching(/ QLD 43\d\d$/),
        lat: TOOWOOMBA.lat,
        lng: TOOWOOMBA.lng,
        source: 'gps',
      },
    });
  });

  it('uses a recent cached fix without asking for a new one', async () => {
    mocked.getLastKnownPositionAsync.mockResolvedValue(fix(TOOWOOMBA.lat, TOOWOOMBA.lng));
    const result = await locateMe();
    expect(result.ok).toBe(true);
    expect(mocked.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('gives up after 10 seconds', async () => {
    jest.useFakeTimers();
    mocked.getLastKnownPositionAsync.mockResolvedValue(null);
    mocked.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));

    const pending = locateMe();
    await jest.advanceTimersByTimeAsync(10_000);
    const result = await pending;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.canOpenSettings).toBe(false);
      expect(result.message).toMatch(/couldn’t find your location/);
    }
  });

  it('refuses a fix outside Australia', async () => {
    mocked.getLastKnownPositionAsync.mockResolvedValue(fix(APPLE_PARK.lat, APPLE_PARK.lng));
    expect(await locateMe()).toEqual({ ok: false, canOpenSettings: false, message: OUTSIDE_AUSTRALIA_MESSAGE });
    expect(mocked.reverseGeocodeAsync).not.toHaveBeenCalled();
  });

  it('explains when permission is denied, offering Settings only when iOS will not ask again', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied', canAskAgain: false } as never);
    const result = await locateMe();
    expect(result).toMatchObject({ ok: false, canOpenSettings: true });
    expect(mocked.getLastKnownPositionAsync).not.toHaveBeenCalled();
  });

  it('falls back to "Your location" when the point cannot be named', async () => {
    mocked.getLastKnownPositionAsync.mockResolvedValue(fix(OUTBACK.lat, OUTBACK.lng));
    const result = await locateMe();
    expect(result.ok && result.location.label).toBe('Your location');
  });
});

describe('labelForPoint', () => {
  it('names a point from the bundled suburbs, with the postcode, without the network', async () => {
    expect(await labelForPoint(TOOWOOMBA)).toMatch(/ QLD 43\d\d$/);
    expect(mocked.reverseGeocodeAsync).not.toHaveBeenCalled();
  });

  it('asks the reverse geocoder when no listed suburb is within 15 km', async () => {
    mocked.reverseGeocodeAsync.mockResolvedValue([
      { city: null, subregion: 'Nullarbor', region: 'Western Australia' } as never,
    ]);
    expect(await labelForPoint(OUTBACK)).toBe('Nullarbor WA');
    mocked.reverseGeocodeAsync.mockResolvedValue([{ city: 'Eucla', subregion: null, region: 'WA' } as never]);
    expect(await labelForPoint(OUTBACK)).toBe('Eucla WA');
  });

  it('says "Map area" when the geocoder fails, times out or gives no Australian state', async () => {
    mocked.reverseGeocodeAsync.mockRejectedValue(new Error('offline'));
    expect(await labelForPoint(OUTBACK)).toBe('Map area');

    mocked.reverseGeocodeAsync.mockResolvedValue([{ city: 'Cupertino', subregion: null, region: 'CA' } as never]);
    expect(await labelForPoint(APPLE_PARK)).toBe('Map area');

    jest.useFakeTimers();
    mocked.reverseGeocodeAsync.mockReturnValue(new Promise(() => {}));
    const pending = labelForPoint(OUTBACK);
    await jest.advanceTimersByTimeAsync(4_000);
    expect(await pending).toBe('Map area');
  });
});
