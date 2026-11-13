import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { FavouritesProvider } from '../state/FavouritesContext';
import { SearchProvider } from '../state/SearchContext';
import { colors } from '../theme';

export default function RootLayout() {
  return (
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
        </Stack>
      </SearchProvider>
    </FavouritesProvider>
  );
}
