import { Stack } from 'expo-router';

/**
 * Stack for the "Explore" tab. Native tabs draw no header, so this Stack provides the large-title
 * navigation bar. Screens customise it with `<Stack.Screen options={{ ... }} />`.
 */
export default function ExploreLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Explore', headerLargeTitle: true }} />
    </Stack>
  );
}
