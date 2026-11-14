import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { PinCluster } from '../../domain/mapCluster';
import { type } from '../../theme';
import { usePalette } from './usePalette';
import { useTracksViewChanges } from './useTracksViewChanges';

interface ClusterMarkerProps {
  cluster: PinCluster;
  onPress: (cluster: PinCluster) => void;
}

/** Several nearby places as one count bubble. Tapping it zooms to fit them. `tracksViewChanges` is false on iOS. */
export function ClusterMarker({ cluster, onPress }: ClusterMarkerProps) {
  const palette = usePalette();
  const size = cluster.count >= 100 ? 52 : cluster.count >= 10 ? 46 : 40;

  const tracking = useTracksViewChanges(`${cluster.count}-${palette.tint}`);

  return (
    <Marker
      coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
      onPress={() => onPress(cluster)}
      stopPropagation
      tracksViewChanges={tracking}
      zIndex={5}
      accessibilityRole="button"
      accessibilityLabel={`${cluster.count} places`}
      accessibilityHint="Zooms in to show them"
    >
      <View
        style={[
          styles.bubble,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: palette.tint, borderColor: palette.onPin },
        ]}
      >
        <Text style={[type.headline, { color: palette.onTint }]} maxFontSizeMultiplier={1.2}>
          {cluster.count}
        </Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  bubble: { alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
});
