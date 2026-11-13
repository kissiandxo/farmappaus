import { router } from 'expo-router';
import { useMemo } from 'react';

import { formatDistance, nearbyPlaces } from '../../domain/geo';
import { openStatus, timezoneForState } from '../../domain/hours';
import { VENUE_LABELS, type Farm } from '../../domain/types';
import { useSearch } from '../../state/SearchContext';
import { Row, Section } from '../ui';

/**
 * "Nearby" group on the place page: up to three other places within 60 km of this one, nearest first.
 * Hidden entirely when there are none.
 */
export function NearbySection({ farm, now }: { farm: Farm; now: Date }) {
  const { farms } = useSearch();
  const nearby = useMemo(() => nearbyPlaces(farm, farms, { limit: 3, maxKm: 60 }), [farm, farms]);

  if (nearby.length === 0) return null;

  return (
    <Section header="Nearby" footer="Distances are in a straight line.">
      {nearby.map(({ farm: other, distanceKm }) => {
        const status = openStatus(other.hours, timezoneForState(other.state), now);
        const subtitle = `${VENUE_LABELS[other.type]} · ${other.locality} ${other.state} · ${status.label}`;
        const distance = formatDistance(distanceKm, !!(farm.locationApprox || other.locationApprox));
        return (
          <Row
            key={other.id}
            title={other.name}
            subtitle={subtitle}
            value={distance}
            accessory="chevron"
            accessibilityLabel={`${other.name}. ${subtitle}. ${distance} away`}
            accessibilityHint="Opens details"
            onPress={() => router.push(`/farm/${other.id}`)}
          />
        );
      })}
    </Section>
  );
}
