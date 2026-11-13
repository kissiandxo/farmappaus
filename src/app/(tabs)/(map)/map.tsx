import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FarmMap from '../../../components/FarmMap';
import { FiltersModal } from '../../../components/FiltersModal';
import { LocationModal } from '../../../components/LocationModal';
import { MapButtons } from '../../../components/map/MapButtons';
import { MapPlaceCard } from '../../../components/map/MapPlaceCard';
import type { FarmMapHandle } from '../../../components/map/types';
import { Icon } from '../../../components/ui';
import { activeFilterCount } from '../../../domain/filters';
import { nearestPlace } from '../../../domain/places';
import { locateMe } from '../../../lib/locate';
import { useSearch } from '../../../state/SearchContext';
import { colors, MIN_TAP, radius, space, type } from '../../../theme';

/**
 * Room to keep clear under the map for the native tab bar (above the home indicator). Estimated;
 * check on a phone, including iOS 26's floating tab bar.
 */
const TAB_BAR_ALLOWANCE = 56;

export default function MapScreen() {
  const { mapResults, farms, location, setLocation, filters } = useSearch();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<FarmMapHandle>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const [locating, setLocating] = useState(false);
  const filterCount = activeFilterCount(filters);

  const selected = selectedId ? mapResults.find((r) => r.farm.id === selectedId) : undefined;
  const controlsTop = insets.top + space.sm;
  const belowControls = controlsTop + MIN_TAP + space.sm;
  const tabInset = insets.bottom + TAB_BAR_ALLOWANCE;
  const mapBottom = tabInset + (selected && cardHeight > 0 ? cardHeight + space.md : 0);
  const countText = `${mapResults.length} of ${farms.length}`;

  const locate = async () => {
    if (locating) return;
    setLocating(true);
    const result = await locateMe();
    setLocating(false);
    if (!result.ok) {
      Alert.alert(
        'Can’t find your location',
        result.message,
        result.canOpenSettings
          ? [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) }]
          : [{ text: 'OK' }],
      );
      return;
    }
    const same = result.location.lat === location.lat && result.location.lng === location.lng;
    setLocation(result.location);
    // A new location frames itself; the same one (after panning away) needs a nudge.
    if (same) mapRef.current?.fitNear(result.location);
  };

  const searchArea = (center: { lat: number; lng: number }) => {
    const near = nearestPlace(center);
    setSelectedId(null);
    setLocation({ label: near ? `${near.locality} ${near.state}` : 'Map area', lat: center.lat, lng: center.lng, source: 'search' });
  };

  return (
    <View style={styles.screen}>
      <FarmMap
        ref={mapRef}
        results={mapResults}
        location={location}
        selectedId={selected ? selected.farm.id : null}
        onSelect={setSelectedId}
        onSearchArea={searchArea}
        insets={{ top: belowControls, bottom: mapBottom }}
        searchAreaTop={belowControls}
      />

      {/* Floating capsules over the full-bleed map, below the status bar. Taps outside them reach the map. */}
      <View style={[styles.controls, { top: controlsTop }]} pointerEvents="box-none">
        <Pressable
          onPress={() => setLocationOpen(true)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`Change location. ${location.label}`}
          style={({ pressed }) => [styles.capsule, styles.location, pressed && styles.pressed]}
        >
          <Icon name="location.fill" size={15} color={colors.tint} />
          <Text style={styles.capsuleText} numberOfLines={1}>
            {location.label}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFiltersOpen(true)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={
            filterCount > 0 ? `Filters, ${filterCount} on, showing ${countText} places` : 'Filters'
          }
          style={({ pressed }) => [styles.capsule, pressed && styles.pressed]}
        >
          <Icon name="line.3.horizontal.decrease" size={15} weight="medium" color={colors.tint} />
          <Text style={styles.capsuleText}>Filters</Text>
          {filterCount > 0 && <Text style={styles.countText}>{countText}</Text>}
        </Pressable>
      </View>

      {mapResults.length === 0 && farms.length > 0 && (
        <View style={[styles.emptyWrap, { top: belowControls + MIN_TAP + space.sm }]} pointerEvents="none">
          <Text style={styles.emptyPill}>No places match these filters</Text>
        </View>
      )}

      <View style={[styles.buttons, { bottom: mapBottom + space.sm }]} pointerEvents="box-none">
        <MapButtons onLocate={locate} onFitAll={() => mapRef.current?.fitAll()} locating={locating} />
      </View>

      {selected && (
        <View style={[styles.cardWrap, { bottom: tabInset + space.sm }]} pointerEvents="box-none">
          <MapPlaceCard
            key={selected.farm.id}
            result={selected}
            onClose={() => setSelectedId(null)}
            onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
          />
        </View>
      )}

      <LocationModal visible={locationOpen} onClose={() => setLocationOpen(false)} />
      <FiltersModal visible={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  controls: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  capsule: {
    minHeight: MIN_TAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.lg,
    borderRadius: radius.capsule,
    borderCurve: 'continuous',
    backgroundColor: colors.cell,
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  location: { flexShrink: 1 },
  capsuleText: { ...type.subheadline, fontWeight: '600', color: colors.label, flexShrink: 1 },
  countText: { ...type.footnote, color: colors.secondaryLabel },
  pressed: { opacity: 0.6 },
  buttons: { position: 'absolute', right: space.lg },
  cardWrap: { position: 'absolute', left: space.lg, right: space.lg },
  emptyWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  emptyPill: {
    ...type.subheadline,
    color: colors.secondaryLabel,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    overflow: 'hidden',
    borderRadius: radius.capsule,
    borderCurve: 'continuous',
    backgroundColor: colors.cell,
  },
});
