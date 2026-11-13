import { Stack } from 'expo-router';

import { colors } from '../../../theme';

/**
 * Stack for the "Account" tab. Native tabs draw no header, so this Stack provides the large-title
 * navigation bar. Screens customise it with `<Stack.Screen options={{ ... }} />`.
 * Nested stacks do not inherit the root Stack's options, so the system bar styling is repeated here.
 */
export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        contentStyle: { backgroundColor: colors.groupedBackground },
      }}
    >
      <Stack.Screen name="account" options={{ title: 'Account', headerLargeTitle: true }} />
    </Stack>
  );
}
