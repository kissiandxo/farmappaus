import { Stack } from 'expo-router';

import { colors } from '../../theme';

/**
 * The welcome / sign-in flow, shown as a full-screen modal over the tabs (registered in the root layout).
 * Welcome has no bar; the email screen gets the system bar with a back button.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        contentStyle: { backgroundColor: colors.groupedBackground },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false, title: 'Welcome' }} />
      <Stack.Screen name="email" options={{ title: 'Email', headerBackButtonDisplayMode: 'minimal' }} />
    </Stack>
  );
}
