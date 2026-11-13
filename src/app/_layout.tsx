import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';

import { EmptyState } from '../components/ui/EmptyState';
import { AuthProvider } from '../state/AuthContext';
import { FavouritesProvider } from '../state/FavouritesContext';
import { SearchProvider } from '../state/SearchContext';
import { colors, darkPalette, lightPalette, type Palette } from '../theme';

/** React Navigation theme built from our hex palettes (navigation needs plain strings). */
function navTheme(dark: boolean, p: Palette): Theme {
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark,
    colors: {
      ...base.colors,
      primary: p.tint,
      background: p.groupedBackground,
      card: p.cell,
      text: p.label,
      border: p.separator,
      notification: p.red,
    },
  };
}
const LIGHT_THEME = navTheme(false, lightPalette);
const DARK_THEME = navTheme(true, darkPalette);

/** Shown instead of a blank screen if something unexpected goes wrong. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.groupedBackground }}>
      <EmptyState
        icon="exclamationmark.triangle"
        title="Sorry, something went wrong"
        message="Your saved places and listings are safe. Please try again."
        action={{ label: 'Try again', onPress: retry }}
      />
    </View>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DARK_THEME : LIGHT_THEME}>
      <AuthProvider>
        <FavouritesProvider>
          <SearchProvider>
            <StatusBar style="auto" />
            <Stack
              screenOptions={{
                // System navigation bars: no coloured header, tint-coloured buttons, iOS default back titles.
                headerTintColor: colors.tint,
                headerShadowVisible: false,
                headerLargeTitleShadowVisible: false,
                contentStyle: { backgroundColor: colors.groupedBackground },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="farmer/index" options={{ title: 'My listings', headerLargeTitle: true }} />
              <Stack.Screen name="farmer/[id]" options={{ title: 'Your listing' }} />
              <Stack.Screen name="farmer/stock/[id]" options={{ title: 'Update stock' }} />
              <Stack.Screen name="claim/[id]" options={{ title: 'Claim this listing' }} />
              <Stack.Screen name="report/[id]" options={{ title: 'Report a problem' }} />
              <Stack.Screen name="suggest" options={{ title: 'Suggest a farm' }} />
              <Stack.Screen name="admin/index" options={{ title: 'Review queue', headerLargeTitle: true }} />
              <Stack.Screen name="privacy" options={{ title: 'Privacy policy' }} />
            </Stack>
          </SearchProvider>
        </FavouritesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
