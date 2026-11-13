import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRootNavigationState,
  useRouter,
  type ErrorBoundaryProps,
  type Theme,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { EmptyState } from '../components/ui/EmptyState';
import { shouldShowWelcome } from '../domain/onboarding';
import { AuthProvider, useAuth } from '../state/AuthContext';
import { FavouritesProvider } from '../state/FavouritesContext';
import { SearchProvider } from '../state/SearchContext';
import { SCREENSHOT_MODE } from '../config';
import { colors, darkPalette, lightPalette, type Palette } from '../theme';

// Keep the splash screen up until we know whether to show the welcome screen, so the tabs never flash first.
SplashScreen.preventAutoHideAsync().catch(() => {});

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

/**
 * Shows the welcome screen once on first launch. Until the saved flag, profile and session have been read,
 * a plain cover hides the tabs and the splash screen stays up.
 */
function WelcomeGate() {
  const router = useRouter();
  const navigationReady = !!useRootNavigationState()?.key;
  const { welcomeSeen, ready, session, localProfile } = useAuth();
  const decided = welcomeSeen !== null && ready;
  const handled = useRef(false);

  useEffect(() => {
    if (!decided || !navigationReady || handled.current) return;
    handled.current = true;
    if (!SCREENSHOT_MODE && shouldShowWelcome({ loaded: true, seen: !!welcomeSeen, signedIn: !!session || !!localProfile })) {
      router.push('/(auth)/welcome');
    }
    SplashScreen.hideAsync().catch(() => {});
  }, [decided, navigationReady, welcomeSeen, session, localProfile, router]);

  return decided ? null : <View style={[StyleSheet.absoluteFill, styles.cover]} />;
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
                // System navigation bars: no coloured header. The theme's `primary` tints the back button,
                // so titles stay in the label colour (a headerTintColor would turn them green).
                headerShadowVisible: false,
                headerLargeTitleShadowVisible: false,
                contentStyle: { backgroundColor: colors.groupedBackground },
              }}
            >
              {/* `title` is what iOS 18 and earlier show on the back button of the next screen. */}
              <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Back' }} />
              <Stack.Screen
                name="(auth)"
                options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="farmer/index" options={{ title: 'My listings', headerLargeTitle: true }} />
              <Stack.Screen name="farmer/[id]" options={{ title: 'Your listing' }} />
              <Stack.Screen name="farmer/stock/[id]" options={{ title: 'Update stock' }} />
              <Stack.Screen name="claim/[id]" options={{ title: 'Claim this listing' }} />
              <Stack.Screen name="report/[id]" options={{ title: 'Report a problem' }} />
              <Stack.Screen name="suggest" options={{ title: 'Suggest a farm' }} />
              <Stack.Screen name="admin/index" options={{ title: 'Review queue', headerLargeTitle: true }} />
              <Stack.Screen name="privacy" options={{ title: 'Privacy policy' }} />
            </Stack>
            <WelcomeGate />
          </SearchProvider>
        </FavouritesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  cover: { backgroundColor: colors.groupedBackground, pointerEvents: 'none' },
});
