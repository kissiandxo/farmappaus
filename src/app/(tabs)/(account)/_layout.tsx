import { Stack } from 'expo-router';

/**
 * Stack for the "Account" tab. Native tabs draw no header, so this Stack provides the large-title
 * navigation bar. Screens customise it with `<Stack.Screen options={{ ... }} />`.
 */
export default function AccountLayout() {
  return (
    <Stack>
      <Stack.Screen name="account" options={{ title: 'Account', headerLargeTitle: true }} />
    </Stack>
  );
}
