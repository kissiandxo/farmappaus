import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '../state/AuthContext';
import { FavouritesProvider } from '../state/FavouritesContext';
import { SearchProvider } from '../state/SearchContext';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <FavouritesProvider>
        <SearchProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.onPrimary,
            headerTitleStyle: { fontSize: 22, fontWeight: '700' },
            headerBackTitle: 'Back',
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="farmer/index" options={{ title: 'My listings' }} />
          <Stack.Screen name="farmer/[id]" options={{ title: 'Your listing' }} />
          <Stack.Screen name="farmer/stock/[id]" options={{ title: 'Update stock' }} />
          <Stack.Screen name="claim/[id]" options={{ title: 'Claim this listing' }} />
          <Stack.Screen name="report/[id]" options={{ title: 'Report a problem' }} />
          <Stack.Screen name="suggest" options={{ title: 'Suggest a farm' }} />
          <Stack.Screen name="admin/index" options={{ title: 'Review queue' }} />
        </Stack>
        </SearchProvider>
      </FavouritesProvider>
    </AuthProvider>
  );
}
