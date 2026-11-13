import { Stack } from 'expo-router';

/**
 * Stack for the "Saved" tab. Native tabs draw no header, so this Stack provides the large-title
 * navigation bar. Screens customise it with `<Stack.Screen options={{ ... }} />`.
 */
export default function SavedLayout() {
  return (
    <Stack>
      <Stack.Screen name="saved" options={{ title: 'Saved', headerLargeTitle: true }} />
    </Stack>
  );
}
