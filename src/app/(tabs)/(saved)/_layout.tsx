import { Stack } from 'expo-router';

import { colors } from '../../../theme';

/**
 * Stack for the "Saved" tab. Native tabs draw no header, so this Stack provides the large-title
 * navigation bar. Screens customise it with `<Stack.Screen options={{ ... }} />`.
 * Nested stacks do not inherit the root Stack's options, so the system bar styling is repeated here.
 */
export default function SavedLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.tint,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        contentStyle: { backgroundColor: colors.groupedBackground },
      }}
    >
      <Stack.Screen name="saved" options={{ title: 'Saved', headerLargeTitle: true }} />
    </Stack>
  );
}
