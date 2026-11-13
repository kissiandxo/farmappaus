import { Stack } from 'expo-router';

import { colors } from '../../../theme';

/**
 * Stack for the "Explore" tab. Native tabs draw no header, so this Stack provides the large-title
 * navigation bar. Screens customise it with `<Stack.Screen options={{ ... }} />`.
 * Nested stacks do not inherit the root Stack's options, so the system bar styling is repeated here.
 */
export default function ExploreLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.tint,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        contentStyle: { backgroundColor: colors.groupedBackground },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Explore', headerLargeTitle: true }} />
    </Stack>
  );
}
