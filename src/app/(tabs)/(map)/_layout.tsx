import { Stack } from 'expo-router';

/**
 * Stack for the "Map" tab. The map is full bleed, so its header is hidden; the floating
 * location and filter capsules (in map.tsx) take the place of the bar.
 */
export default function MapLayout() {
  return (
    <Stack>
      <Stack.Screen name="map" options={{ title: 'Map', headerShown: false }} />
    </Stack>
  );
}
