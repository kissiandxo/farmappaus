import { Stack } from 'expo-router';

/**
 * Stack for the "Map" tab. Native tabs draw no header, so this Stack provides the large-title
 * navigation bar. Screens customise it with `<Stack.Screen options={{ ... }} />`.
 */
export default function MapLayout() {
  return (
    <Stack>
      <Stack.Screen name="map" options={{ title: 'Map', headerLargeTitle: true }} />
    </Stack>
  );
}
