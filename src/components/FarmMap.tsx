import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { boundingRegion, type LatLng, type MapRegion } from '../domain/geo';
import {
  centreLatitudeFor,
  clusterPins,
  clusterRegion,
  DEFAULT_MAP_SIZE,
  hasMovedFar,
  MIN_CLUSTER_ZOOM_DELTA,
  regionCorners,
  zoomForRegion,
  type MapSize,
  type PinCluster,
} from '../domain/mapCluster';
import { colors, hairline, MIN_TAP, radius, space, type } from '../theme';
import { ClusterMarker } from './map/ClusterPin';
import { PlaceMarker } from './map/PlacePin';
import type { FarmMapProps } from './map/types';
import { usePalette } from './map/usePalette';
import { Icon } from './ui';

/** How many of the nearest places to frame, along with the user, when a location is chosen. */
const NEAREST_TO_FIT = 8;
/** Programmatic camera moves finish within this long; region changes after that came from the user. */
const ANIMATION_MS = 450;
const SELECT_ANIMATION_MS = 350;
const ANIMATION_SETTLE_MS = 900;
/** Side margins kept clear when framing places. */
const SIDE_PADDING = 24;

/** The points to frame: every pin when no location is chosen, otherwise the user plus the nearest few. */
function framePoints(location: FarmMapProps['location'], results: FarmMapProps['results']): LatLng[] {
  const pins = results.map((r) => r.farm);
  if (location.source === 'default') return pins.length > 0 ? pins : [location];
  return [location, ...pins.slice(0, NEAREST_TO_FIT)];
}

function sameRegion(a: MapRegion, b: MapRegion): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < 1e-6 &&
    Math.abs(a.longitude - b.longitude) < 1e-6 &&
    Math.abs(a.latitudeDelta - b.latitudeDelta) < 1e-6 &&
    Math.abs(a.longitudeDelta - b.longitudeDelta) < 1e-6
  );
}

/** Live value of the iOS "Reduce Motion" setting. */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (mounted) setReduce(on);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * Apple Maps on iPhone (no API key needed) with a custom pin for every listing, clustering on a fixed
 * lattice that only changes with the zoom level, and a "Set location here" prompt after the user moves
 * far. The camera is only moved by the app when a location is chosen, on the first load of listings, or
 * on request; it never jumps back after the user has moved the map. Places are always framed clear of the
 * floating capsules, the place card and the tab bar. Honours Reduce Motion.
 */
export default function FarmMap({
  results,
  location,
  selectedId,
  onSelect,
  onSearchArea,
  insets,
  searchAreaTop,
  ref,
}: FarmMapProps) {
  const mapRef = useRef<MapView>(null);
  const scheme = useColorScheme();
  const palette = usePalette();
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const insetsRef = useRef(insets);
  insetsRef.current = insets;

  const initialRegion = useMemo(() => boundingRegion(framePoints(location, results), 0.3), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [region, setRegion] = useState<MapRegion>(initialRegion);
  const regionRef = useRef<MapRegion>(initialRegion);
  const anchorRef = useRef<MapRegion>(initialRegion);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [mapSize, setMapSize] = useState<MapSize>(DEFAULT_MAP_SIZE);
  const mapSizeRef = useRef<MapSize | null>(null);

  const movingUntil = useRef(0);
  const userMoved = useRef(false);
  const fitted = useRef(results.length > 0);
  const lastFitKey = useRef(`${location.lat},${location.lng}`);
  const skipNextFit = useRef(false);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    mapSizeRef.current = { width, height };
    setMapSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  /**
   * Frames points clear of the controls, with `fitToCoordinates` (which, unlike animateToRegion, honours padding).
   * `minDelta` pads a lone point (or a tight group) out to a minimum span; a cluster tap passes a much smaller one
   * so the zoom goes far enough to split the cluster.
   */
  const fitPoints = useCallback((points: LatLng[], minDelta = 0.3) => {
    if (points.length === 0) return;
    const corners = regionCorners(boundingRegion(points, minDelta));
    const { top, bottom } = insetsRef.current;
    movingUntil.current = Date.now() + ANIMATION_MS + ANIMATION_SETTLE_MS;
    mapRef.current?.fitToCoordinates(
      corners.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      {
        edgePadding: { top: top + space.sm, bottom: bottom + space.lg, left: SIDE_PADDING, right: SIDE_PADDING },
        animated: !reduceMotionRef.current,
      },
    );
  }, []);

  const fitTo = useCallback(
    (loc: FarmMapProps['location'], list: FarmMapProps['results']) => fitPoints(framePoints(loc, list)),
    [fitPoints],
  );

  useImperativeHandle(
    ref,
    () => ({
      fitAll: () => {
        userMoved.current = false;
        fitPoints(results.length > 0 ? results.map((r) => r.farm) : [location]);
      },
      fitNear: (loc) => {
        userMoved.current = false;
        lastFitKey.current = `${loc.lat},${loc.lng}`;
        fitTo(loc, results);
      },
    }),
    [fitPoints, fitTo, results, location],
  );

  // First listings to arrive (live data loads after the map mounts): frame them, unless the user already moved.
  useEffect(() => {
    if (fitted.current || userMoved.current || results.length === 0) return;
    fitted.current = true;
    fitTo(location, results);
  }, [results, location, fitTo]);

  // A new location (chosen in the sheet, or restored at launch) is an explicit request: go there.
  const locationKey = `${location.lat},${location.lng}`;
  useEffect(() => {
    if (lastFitKey.current === locationKey) return;
    lastFitKey.current = locationKey;
    if (skipNextFit.current) {
      skipNextFit.current = false;
      return;
    }
    userMoved.current = false;
    fitted.current = true;
    fitTo(location, results);
    // Only a new location should move the camera; filter changes must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKey]);

  // Selecting a pin centres it in the part of the map not covered by the controls and the place card.
  const selected = selectedId ? results.find((r) => r.farm.id === selectedId) : undefined;
  useEffect(() => {
    if (!selected) return;
    const { latitudeDelta, longitudeDelta } = regionRef.current;
    const height = mapSizeRef.current?.height ?? 0;
    const latitude = centreLatitudeFor(selected.farm.lat, latitudeDelta, insetsRef.current, height);
    const duration = reduceMotionRef.current ? 0 : SELECT_ANIMATION_MS;
    movingUntil.current = Date.now() + duration + ANIMATION_SETTLE_MS;
    mapRef.current?.animateToRegion({ latitude, longitude: selected.farm.lng, latitudeDelta, longitudeDelta }, duration);
  }, [selected?.farm.id, insets.bottom]); // eslint-disable-line react-hooks/exhaustive-deps

  // The first layout and padding changes move the camera too; don't mistake that for the user panning.
  useEffect(() => {
    movingUntil.current = Date.now() + ANIMATION_SETTLE_MS;
  }, [insets.top, insets.bottom]);

  const handleRegionChangeComplete = useCallback((next: Region) => {
    if (sameRegion(next, regionRef.current)) return;
    regionRef.current = next;
    setRegion(next);
    if (Date.now() < movingUntil.current) {
      anchorRef.current = next;
      setShowSearchArea(false);
      return;
    }
    userMoved.current = true;
    setShowSearchArea(hasMovedFar(anchorRef.current, next));
  }, []);

  const pins = useMemo(
    () => results.filter((r) => r.farm.id !== selectedId).map((r) => ({ id: r.farm.id, lat: r.farm.lat, lng: r.farm.lng })),
    [results, selectedId],
  );
  const byId = useMemo(() => new Map(results.map((r) => [r.farm.id, r])), [results]);
  // Clusters depend only on the integer zoom level and the map size, never the exact region, so they stay
  // put while the user pans or pinches within a zoom level.
  const zoom = zoomForRegion(region);
  const clusters = useMemo(() => clusterPins(pins, zoom, mapSize), [pins, zoom, mapSize]);

  const handleSelect = useCallback((id: string) => onSelect(id), [onSelect]);
  const handleCluster = useCallback(
    (cluster: PinCluster) => {
      onSelect(null);
      fitPoints(regionCorners(clusterRegion(cluster)), MIN_CLUSTER_ZOOM_DELTA);
    },
    [fitPoints, onSelect],
  );

  const searchHere = () => {
    const centre = regionRef.current;
    anchorRef.current = centre;
    skipNextFit.current = true;
    setShowSearchArea(false);
    onSearchArea({ lat: centre.latitude, lng: centre.longitude });
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        // Keeps Apple's legal label and the compass clear of the controls. It does not move the camera.
        mapPadding={{ top: insets.top, right: 0, bottom: insets.bottom, left: 0 }}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        userInterfaceStyle={scheme === 'dark' ? 'dark' : 'light'}
        showsUserLocation={location.source === 'gps'}
        showsCompass
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={() => onSelect(null)}
        accessibilityLabel="Map of nearby farms, stalls and markets"
      >
        {/* A searched suburb gets a pin. GPS uses the system's blue dot; the unset default gets nothing. */}
        {location.source === 'search' && (
          <Marker
            coordinate={{ latitude: location.lat, longitude: location.lng }}
            tracksViewChanges={false}
            zIndex={0}
            accessibilityLabel={`Search location, ${location.label}`}
          >
            <Icon name="mappin.circle.fill" size={30} color={palette.red} />
          </Marker>
        )}
        {clusters.map((cluster) => {
          if (cluster.count > 1) return <ClusterMarker key={cluster.id} cluster={cluster} onPress={handleCluster} />;
          const result = byId.get(cluster.id);
          if (!result) return null;
          return (
            <PlaceMarker
              key={cluster.id}
              farm={result.farm}
              statusKind={result.status.kind}
              statusLabel={result.status.label}
              selected={false}
              onPress={handleSelect}
            />
          );
        })}
        {selected && (
          <PlaceMarker
            key={selected.farm.id}
            farm={selected.farm}
            statusKind={selected.status.kind}
            statusLabel={selected.status.label}
            selected
            onPress={handleSelect}
          />
        )}
      </MapView>

      {showSearchArea && (
        <View style={[styles.searchWrap, { top: searchAreaTop }]} pointerEvents="box-none">
          <Pressable
            onPress={searchHere}
            accessibilityRole="button"
            accessibilityLabel="Set location here"
            accessibilityHint="Sorts places by distance from the middle of the map"
            style={({ pressed }) => [styles.searchArea, pressed && styles.pressed]}
          >
            <Icon name="mappin.and.ellipse" size={15} weight="medium" color={colors.tint} />
            <Text style={styles.searchAreaText}>Set location here</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
  searchWrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  searchArea: {
    minHeight: MIN_TAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.capsule,
    borderCurve: 'continuous',
    backgroundColor: colors.cell,
    borderWidth: hairline,
    borderColor: colors.separator,
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  searchAreaText: { ...type.subheadline, fontWeight: '600', color: colors.label, flexShrink: 1 },
  pressed: { opacity: 0.6 },
});
