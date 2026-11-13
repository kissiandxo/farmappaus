import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { pinStyle } from '../../domain/mapPins';
import type { Farm } from '../../domain/types';
import { Icon } from '../ui';
import { usePalette } from './usePalette';
import { useTracksViewChanges } from './useTracksViewChanges';

export const PIN_SIZE = 30;
export const PIN_SIZE_SELECTED = 40;

interface PlaceMarkerProps {
  farm: Farm;
  isOpen: boolean;
  selected: boolean;
  onPress: (id: string) => void;
}

/**
 * One listing on the map: a circle in the venue's colour with a white SF Symbol. Closed places are
 * dimmed, the selected one is bigger. No `title`, so Apple Maps shows no callout; the place card
 * does that job.
 */
export function PlaceMarker({ farm, isOpen, selected, onPress }: PlaceMarkerProps) {
  const palette = usePalette();
  const style = pinStyle(farm.type);
  const size = selected ? PIN_SIZE_SELECTED : PIN_SIZE;

  const tracking = useTracksViewChanges(`${selected}-${isOpen}-${palette.tint}`);

  return (
    <Marker
      coordinate={{ latitude: farm.lat, longitude: farm.lng }}
      onPress={() => onPress(farm.id)}
      stopPropagation
      tracksViewChanges={tracking}
      zIndex={selected ? 10 : isOpen ? 2 : 1}
      accessibilityLabel={`${farm.name}, ${style.label}`}
    >
      <View
        style={[
          styles.pin,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: palette[style.color],
            borderColor: selected ? palette.onPin : 'transparent',
            opacity: isOpen || selected ? 1 : 0.55,
          },
        ]}
      >
        <Icon name={style.symbol} size={selected ? 20 : 15} color={palette.onPin} weight="semibold" />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
});
