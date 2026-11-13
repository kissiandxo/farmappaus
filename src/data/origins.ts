import type { LatLng } from '../domain/geo';

export interface Origin extends LatLng {
  name: string;
}

/**
 * Stand-in "where am I" points for milestone 1, one per state/territory capital.
 * Replaced by GPS and suburb/postcode search in M2.
 */
export const CAPITAL_ORIGINS: Origin[] = [
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631 },
  { name: 'Brisbane', lat: -27.4698, lng: 153.0251 },
  { name: 'Adelaide', lat: -34.9285, lng: 138.6007 },
  { name: 'Perth', lat: -31.9505, lng: 115.8605 },
  { name: 'Hobart', lat: -42.8821, lng: 147.3272 },
  { name: 'Darwin', lat: -12.4634, lng: 130.8456 },
  { name: 'Canberra', lat: -35.2809, lng: 149.13 },
];
