import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { OpenStatus } from '../../domain/hours';
import { pinAccessibilityLabel, pinStyle } from '../../domain/mapPins';
import type { Farm } from '../../domain/types';
import { Icon } from '../ui';
import { usePalette } from './usePalette';
import { useTracksViewChanges } from './useTracksViewChanges';

export const PIN_SIZE = 30;
export const PIN_SIZE_SELECTED = 40;
const RING = 2.5;

interface PlaceMarkerProps {
  farm: Farm;
  statusKind: OpenStatus['kind'];
  statusLabel: string;
  selected: boolean;
  onPress: (id: string) => void;
}

/**
 * One listing on the map: a circle in the venue's colour with an SF Symbol. Fills stay opaque so the map
 * never shows through. Closed places are drawn hollow (cell-coloured fill, ring and glyph in the venue
 * colour) rather than faded; open, appointment, irregular and always-open places are solid. Approximate
 * locations (the pin is only the suburb centre) get a dashed outer ring and say so to VoiceOver. The
 * selected pin is bigger. No `title`, so Apple Maps shows no callout; the place card does that job.
 */
export function PlaceMarker({ farm, statusKind, statusLabel, selected, onPress }: PlaceMarkerProps) {
  const palette = usePalette();
  const style = pinStyle(farm.type);
  const size = selected ? PIN_SIZE_SELECTED : PIN_SIZE;
  const venue = palette[style.color];
  const hollow = statusKind === 'closed' && !selected;
  const approx = !!farm.locationApprox;

  const lookKey = `${selected}-${statusKind}-${approx}-${palette.tint}`;
  // Always false on iOS (Apple Maps updates custom marker views itself); only Android tracks.
  const tracking = useTracksViewChanges(lookKey);

  const label = pinAccessibilityLabel(farm, statusLabel);

  return (
    <Marker
      coordinate={{ latitude: farm.lat, longitude: farm.lng }}
      onPress={() => onPress(farm.id)}
      stopPropagation
      tracksViewChanges={tracking}
      zIndex={selected ? 10 : statusKind === 'closed' ? 1 : 2}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <View
        style={[
          approx && styles.approxRing,
          approx && { borderColor: venue, borderRadius: (size + 8) / 2, padding: 2 },
        ]}
      >
        <View
          style={[
            styles.pin,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: hollow ? palette.cell : venue,
              borderColor: hollow ? venue : selected ? palette.onPin : 'transparent',
            },
          ]}
        >
          <Icon
            name={style.symbol}
            size={selected ? 20 : 15}
            color={hollow ? venue : palette.onPin}
            weight="semibold"
          />
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: RING,
  },
  approxRing: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
});
