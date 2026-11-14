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
  /** The user tapped "Set location here" with the map centred here. */
  onSearchArea: (center: { lat: number; lng: number }) => void;
  /**
   * Screen space covered by floating controls, in points from the map's top and bottom edges: under the
   * capsules at the top; the tab bar plus the place card (when open) at the bottom. Places are framed
   * clear of these.
   */
  insets: { top: number; bottom: number };
  /** Distance from the top of the screen for the "Set location here" capsule. */
  searchAreaTop: number;
  ref?: Ref<FarmMapHandle>;
}
