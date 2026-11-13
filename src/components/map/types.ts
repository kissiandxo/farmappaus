import type { Ref } from 'react';

import type { FarmResult } from '../../domain/filters';
import type { UserLocation } from '../../state/SearchContext';

/** Commands the map screen can give the map. */
export interface FarmMapHandle {
  /** Zoom out to fit every pin. */
  fitAll: () => void;
  /** Frame a location plus the nearest places (used after "locate me"). */
  fitNear: (location: UserLocation) => void;
}

export interface FarmMapProps {
  /** Every listing to pin (filters applied, distance ignored), nearest first. */
  results: FarmResult[];
  location: UserLocation;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** The user tapped "Search this area" with the map centred here. */
  onSearchArea: (center: { lat: number; lng: number }) => void;
  /** Space the map should keep clear: under the floating capsules, above the tab bar and place card. */
  insets: { top: number; bottom: number };
  /** Distance from the top of the screen for the "Search this area" capsule. */
  searchAreaTop: number;
  ref?: Ref<FarmMapHandle>;
}
