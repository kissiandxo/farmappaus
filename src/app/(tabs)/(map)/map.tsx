import * as Location from 'expo-location';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import FarmMap from '../../../components/FarmMap';
import { FiltersModal } from '../../../components/FiltersModal';
import { LocationModal } from '../../../components/LocationModal';
import { MapButtons } from '../../../components/map/MapButtons';
import { MapPlaceCard } from '../../../components/map/MapPlaceCard';
import type { FarmMapHandle } from '../../../components/map/types';
import { Icon } from '../../../components/ui';
import { useAnnounceCount } from '../../../components/useAnnounceCount';
import { activeFilterCount } from '../../../domain/filters';
import { isInAustralia } from '../../../domain/geo';
import { labelForPoint, locateMe } from '../../../lib/locate';
import { useSearch } from '../../../state/SearchContext';
import { colors, hairline, MIN_TAP, radius, space, type } from '../../../theme';

// A crash on the map shows the shared error screen inside the tab, so the tab bar stays usable.
export { ScreenErrorBoundary as ErrorBoundary } from '../../../components/ScreenErrorBoundary';

/** Used until the real bottom inset (home indicator plus the native tab bar) has been measured. */
const TAB_BAR_FALLBACK = 56;
/** The controls row wraps onto two lines past this text size. */
const WRAP_CONTROLS_ABOVE_FONT_SCALE = 1.5;

export default function MapScreen() {
  const { mapResults, farms, location, setLocation, filters, isDefaultLocation, dataStatus } = useSearch();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const mapRef = useRef<FarmMapHandle>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const [locating, setLocating] = useState(false);
  const [controlsHeight, setControlsHeight] = useState(0);
  const [pillsHeight, setPillsHeight] = useState(0);
  const [measuredBottom, setMeasuredBottom] = useState<number | null>(null);

  // The distance filter only trims the list; the map pins every place that passes the other filters.
  const filterCount = activeFilterCount({ ...filters, maxKm: null });
  const shownCount = mapResults.length;
  const countText = `${shownCount} of ${farms.length}`;
  // NativeTabs keeps this screen mounted after a visit; only the visible tab speaks its count.
  const focused = useIsFocused();
  useAnnounceCount(shownCount, focused && !filtersOpen);

  // A place that a filter change removed from the map must not stay selected.
  useEffect(() => {
    if (selectedId && !mapResults.some((r) => r.farm.id === selectedId)) setSelectedId(null);
  }, [mapResults, selectedId]);

  // If location access was already granted (e.g. on the welcome screen), use it quietly instead of
  // showing distances from Sydney. Never asks for permission from here.
  const defaultRef = useRef(isDefaultLocation);
  defaultRef.current = isDefaultLocation;
  useEffect(() => {
    if (Platform.OS === 'web' || !isDefaultLocation) return;
    let cancelled = false;
    (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (cancelled || permission.status !== 'granted') return;
        const result = await locateMe();
        // A saved location may have been restored meanwhile; never overwrite it.
        if (!cancelled && result.ok && defaultRef.current) setLocation(result.location);
      } catch {
        // Stay on the default location.
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = selectedId ? mapResults.find((r) => r.farm.id === selectedId) : undefined;
  const controlsTop = insets.top + space.sm;
  const belowControls = controlsTop + (controlsHeight || MIN_TAP) + space.sm;
  const belowPills = belowControls + (pillsHeight > 0 ? pillsHeight + space.sm : 0);
  // The measured inset includes the native tab bar when the screen extends under it. If it is no bigger
  // than the device's own inset, the tab bar isn't included, so allow for it.
  const tabInset =
    measuredBottom !== null && measuredBottom > insets.bottom ? measuredBottom : insets.bottom + TAB_BAR_FALLBACK;
  const mapBottom = tabInset + (selected && cardHeight > 0 ? cardHeight + space.md : 0);

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

  const setLocationHere = async (center: { lat: number; lng: number }) => {
    if (!isInAustralia(center)) {
      Alert.alert('Outside Australia', 'Farm Direct lists places in Australia. Move the map over Australia to set a location here.');
      return;
    }
    setSelectedId(null);
    const label = await labelForPoint(center);
    setLocation({ label, lat: center.lat, lng: center.lng, source: 'search' });
  };

  const measure = (set: (h: number) => void) => (e: LayoutChangeEvent) => set(e.nativeEvent.layout.height);

  return (
    <View style={styles.screen}>
      {/* Invisible: its height is the real bottom inset of this screen, including the native tab bar. */}
      <SafeAreaView
        edges={['bottom']}
        style={styles.insetProbe}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        onLayout={measure((h) => setMeasuredBottom(h))}
      />

      <FarmMap
        ref={mapRef}
        results={mapResults}
        location={location}
        selectedId={selected ? selected.farm.id : null}
        onSelect={setSelectedId}
        onSearchArea={setLocationHere}
        insets={{ top: belowPills, bottom: mapBottom }}
        searchAreaTop={belowPills}
      />

      {/* Floating capsules over the full-bleed map, below the status bar. Taps outside them reach the map. */}
      <View
        style={[styles.controls, { top: controlsTop }, fontScale > WRAP_CONTROLS_ABOVE_FONT_SCALE && styles.controlsWrap]}
        pointerEvents="box-none"
        onLayout={measure(setControlsHeight)}
      >
        <Pressable
          onPress={() => setLocationOpen(true)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={
            isDefaultLocation ? 'Set location. Showing places near Sydney' : `Change location. ${location.label}`
          }
          style={({ pressed }) => [styles.capsule, styles.location, pressed && styles.pressed]}
        >
          <Icon name={isDefaultLocation ? 'location' : 'location.fill'} size={15} color={colors.tint} />
          <Text style={styles.capsuleText} numberOfLines={1}>
            {isDefaultLocation ? 'Set location' : location.label}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFiltersOpen(true)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={filterCount > 0 ? `Filters, ${filterCount} on, showing ${countText} places` : 'Filters'}
          style={({ pressed }) => [styles.capsule, pressed && styles.pressed]}
        >
          <Icon name="line.3.horizontal.decrease" size={15} weight="medium" color={colors.tint} />
          <Text style={styles.capsuleText}>Filters</Text>
          {filterCount > 0 && <Text style={styles.countText}>{countText}</Text>}
        </Pressable>
      </View>

      {/* Quiet notes under the controls. The "Set location here" capsule sits below them. */}
      <View
        style={[styles.pills, { top: belowControls }]}
        pointerEvents="none"
        onLayout={measure(setPillsHeight)}
      >
        {filters.maxKm !== null && <Text style={styles.pill}>Distance applies to the list only</Text>}
        {mapResults.length === 0 && farms.length > 0 && <Text style={styles.pill}>No places match these filters</Text>}
      </View>

      <View style={[styles.buttons, { bottom: mapBottom + space.sm }]} pointerEvents="box-none">
        <MapButtons onLocate={locate} onFitAll={() => mapRef.current?.fitAll()} locating={locating} />
      </View>

      {selected && (
        <View style={[styles.cardWrap, { bottom: tabInset + space.sm }]} pointerEvents="box-none">
          <MapPlaceCard
            key={selected.farm.id}
            result={selected}
            onClose={() => setSelectedId(null)}
            onLayout={measure(setCardHeight)}
            showDistance={!isDefaultLocation}
            showUnclaimedBadge={dataStatus.kind !== 'public'}
          />
        </View>
      )}

      <LocationModal visible={locationOpen} onClose={() => setLocationOpen(false)} />
      <FiltersModal visible={filtersOpen} onClose={() => setFiltersOpen(false)} source="map" />
    </View>
  );
}

const floating = {
  backgroundColor: colors.cell,
  borderWidth: hairline,
  borderColor: colors.separator,
  shadowColor: colors.shadow,
  shadowOpacity: 0.18,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  insetProbe: { position: 'absolute', left: 0, right: 0, bottom: 0, opacity: 0 },
  controls: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  controlsWrap: { flexWrap: 'wrap' },
  capsule: {
    minHeight: MIN_TAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    borderRadius: radius.capsule,
    borderCurve: 'continuous',
    ...floating,
  },
  location: { flexShrink: 1 },
  capsuleText: { ...type.subheadline, fontWeight: '600', color: colors.label, flexShrink: 1 },
  countText: { ...type.footnote, color: colors.secondaryLabel },
  pressed: { opacity: 0.6 },
  buttons: { position: 'absolute', right: space.lg },
  cardWrap: { position: 'absolute', left: space.lg, right: space.lg },
  pills: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center', gap: space.sm },
  pill: {
    ...type.subheadline,
    color: colors.secondaryLabel,
    textAlign: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    overflow: 'hidden',
    borderRadius: radius.capsule,
    borderCurve: 'continuous',
    // Text clips its own shadow (overflow hidden), so the pill relies on the hairline for its edge.
    backgroundColor: colors.cell,
    borderWidth: hairline,
    borderColor: colors.separator,
  },
});
