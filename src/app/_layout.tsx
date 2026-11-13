import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Pressable, Text, View } from 'react-native';
import type { ErrorBoundaryProps } from 'expo-router';

import { AuthProvider } from '../state/AuthContext';
import { FavouritesProvider } from '../state/FavouritesContext';
import { SearchProvider } from '../state/SearchContext';
import { colors } from '../theme';

/** Shown instead of a blank screen if something unexpected goes wrong. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: colors.background }}>
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>Sorry, something went wrong</Text>
      <Text style={{ fontSize: 18, color: colors.text, lineHeight: 26 }}>
        Your saved places and listings are safe. Please try again.
      </Text>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        style={{ minHeight: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.onPrimary }}>Try again</Text>
      </Pressable>
    </View>
  );
}

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
          <Stack.Screen name="privacy" options={{ title: 'Privacy policy' }} />
        </Stack>
        </SearchProvider>
      </FavouritesProvider>
    </AuthProvider>
  );
}
