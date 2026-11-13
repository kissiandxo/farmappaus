import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import type { FarmResult } from '../domain/filters';
import { boundingRegion } from '../domain/geo';
import { VENUE_LABELS } from '../domain/types';
import type { UserLocation } from '../state/SearchContext';
import { colors } from '../theme';

interface FarmMapProps {
  results: FarmResult[];
  location: UserLocation;
}

/** Apple Maps on iPhone (no API key needed). Pins are green when open, terracotta when closed. */
export default function FarmMap({ results, location }: FarmMapProps) {
  const mapRef = useRef<MapView>(null);

  // Frame the search point plus the nearest few places.
  const region = useMemo(
    () => boundingRegion([location, ...results.slice(0, 8).map((r) => r.farm)], 0.3),
    [location, results],
  );

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 400);
  }, [region]);

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={region}
      showsUserLocation={location.source === 'gps'}
      showsCompass
      accessibilityLabel="Map of nearby farms, stalls and markets"
    >
      {location.source !== 'gps' && (
        <Marker
          coordinate={{ latitude: location.lat, longitude: location.lng }}
          title="Your search area"
          description={location.label}
          pinColor="#2F5D9C"
        />
      )}
      {results.map(({ farm, status }) => (
        <Marker
          key={farm.id}
          coordinate={{ latitude: farm.lat, longitude: farm.lng }}
          title={farm.isSample ? `SAMPLE: ${farm.name}` : farm.name}
          description={`${VENUE_LABELS[farm.type]} · ${status.label}`}
          pinColor={status.isOpen ? colors.open : colors.accent}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
