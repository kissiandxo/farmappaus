import {
  DarkTheme,
  DefaultTheme,
  router,
  Stack,
  ThemeProvider,
  useRootNavigationState,
  useRouter,
  type Theme,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Appearance, Linking, Platform, StyleSheet, useColorScheme, View } from 'react-native';

import { RootErrorBoundary } from '../components/ScreenErrorBoundary';
import { Button } from '../components/ui';
import { shouldShowWelcome } from '../domain/onboarding';
import { deepLinkPath } from '../lib/openLink';
import { AuthProvider, useAuth } from '../state/AuthContext';
import { FavouritesProvider } from '../state/FavouritesContext';
import { SearchProvider, useSearch } from '../state/SearchContext';
import { SCREENSHOT_MODE, SCREENSHOT_SCENES } from '../config';
import { countTick, presetFilters, sceneIndexForTicks } from '../domain/screenshotTour';
import { colors, darkPalette, lightPalette, type Palette } from '../theme';

/**
 * The tabs always sit under any other root screen, so a deep link straight to a place
 * (farmdirect://farm/<id>) still has a back button to Explore. `anchor` is the SDK 58 name.
 */
export const unstable_settings = { anchor: '(tabs)' };

// Keep the splash screen up until we know whether to show the welcome screen, so the tabs never flash first.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Whatever happens, the splash screen is hidden no later than this after the root layout mounts. */
const SPLASH_FALLBACK_MS = 3000;

const hideSplash = () => {
  SplashScreen.hideAsync().catch(() => {});
};

/** The in-app path the app was opened with ("" for a plain launch). */
async function launchPath(): Promise<string> {
  if (Platform.OS === 'web') {
    return typeof window === 'undefined' ? '' : window.location.pathname.replace(/^\/+|\/+$/g, '');
  }
  try {
    return deepLinkPath(await Linking.getInitialURL());
  } catch {
    return '';
  }
}

/** True when the (auth) group was pushed with ?first=1 (the first-launch welcome), however the params are nested. */
function isFirstLaunchWelcome(params: unknown): boolean {
  const p = params as { first?: unknown; params?: { first?: unknown } } | undefined;
  return p?.first === '1' || p?.params?.first === '1';
}

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

/** "Done" on the privacy sheet. Opened from a link with nothing underneath, it goes to Explore instead. */
const closePrivacy = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * Shown instead of a blank screen if something unexpected goes wrong. Only "Try again": at the root the navigator
 * is replaced by this screen, so there is nothing to navigate to.
 */
export { RootErrorBoundary as ErrorBoundary };

/**
 * Shows the welcome screen once on first launch. Until the saved flag, profile and session have been read,
 * a plain cover hides the tabs and the splash screen stays up. When the welcome is shown, the welcome screen
 * hides the splash itself once it has laid out, so the tabs never flash behind it. A launch from a link to a
 * place (or the privacy policy) skips the welcome (and marks it seen) so the link lands straight on it.
 */
function WelcomeGate() {
  const router = useRouter();
  const navigationReady = !!useRootNavigationState()?.key;
  const { welcomeSeen, ready, session, localProfile, markWelcomeSeen } = useAuth();
  const decided = welcomeSeen !== null && ready;
  const handled = useRef(false);

  useEffect(() => {
    if (!decided || !navigationReady || handled.current) return;
    handled.current = true;
    const wantsWelcome =
      !SCREENSHOT_MODE && shouldShowWelcome({ loaded: true, seen: !!welcomeSeen, signedIn: !!session || !!localProfile });
    if (!wantsWelcome) {
      hideSplash();
      return;
    }
    launchPath().then((path) => {
      // Only a link to a screen the app knows skips the welcome; anything else still gets the welcome first.
      if (/^farm\/[^/]+$/.test(path) || path === 'privacy') {
        markWelcomeSeen();
        hideSplash();
        return;
      }
      // No slide-up animation on first launch: the welcome replaces the splash directly.
      router.push({ pathname: '/(auth)/welcome', params: { first: '1' } });
    });
  }, [decided, navigationReady, welcomeSeen, session, localProfile, markWelcomeSeen, router]);

  return (
    <>
      {SCREENSHOT_MODE ? <ScreenshotTour ready={decided && navigationReady} /> : null}
      {decided ? null : <View style={[StyleSheet.absoluteFill, styles.cover]} />}
    </>
  );
}

/**
 * Screenshot build only (never rendered otherwise): steps through SCREENSHOT_SCENES, one scene each time the
 * system appearance goes from dark back to light. The workflow flips the appearance with simctl: simulator deep
 * links show a confirmation prompt, and a timetable failed because the CI simulator is slow. Nothing happens at
 * launch, so the app opens on Explore (scene 0).
 */
function ScreenshotTour({ ready }: { ready: boolean }) {
  const router = useRouter();
  const { farms, setFilters, setQuery } = useSearch();
  const tour = useRef({ ticks: 0, appearance: Appearance.getColorScheme() as string | null | undefined });
  const tourDeps = useRef({ farms, setFilters, setQuery });
  tourDeps.current = { farms, setFilters, setQuery };
  useEffect(() => {
    if (!ready) return;
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const previous = tour.current.appearance;
      tour.current.appearance = colorScheme;
      const ticks = countTick(previous === 'dark' || previous === 'light' ? previous : null, colorScheme, tour.current.ticks);
      if (ticks === tour.current.ticks) return;
      tour.current.ticks = ticks;
      const scene = SCREENSHOT_SCENES[sceneIndexForTicks(ticks, SCREENSHOT_SCENES.length)];
      if (!scene) return;
      const deps = tourDeps.current;
      if (scene.filters) deps.setFilters(presetFilters(scene.filters, deps.farms));
      if (scene.query !== undefined) deps.setQuery(scene.query);
      router.navigate(scene.href as Parameters<typeof router.navigate>[0]);
    });
    return () => subscription.remove();
  }, [ready, router]);

  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme();

  // Safety net: the app can never sit on the splash screen, whatever the welcome logic does.
  useEffect(() => {
    const timer = setTimeout(hideSplash, SPLASH_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, []);

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
                options={({ route }) => ({
                  presentation: 'fullScreenModal',
                  headerShown: false,
                  animation: isFirstLaunchWelcome(route.params) ? 'none' : 'slide_from_bottom',
                })}
              />
              <Stack.Screen name="farmer/index" options={{ title: 'My listings', headerLargeTitle: true }} />
              <Stack.Screen name="farmer/[id]" options={{ title: 'Your listing' }} />
              <Stack.Screen name="farmer/stock/[id]" options={{ title: 'Update stock' }} />
              <Stack.Screen name="claim/[id]" options={{ title: 'Claim this listing' }} />
              <Stack.Screen name="report/[id]" options={{ title: 'Report a problem' }} />
              <Stack.Screen name="suggest" options={{ title: 'Suggest a farm' }} />
              <Stack.Screen name="admin/index" options={{ title: 'Review queue', headerLargeTitle: true }} />
              <Stack.Screen
                name="privacy"
                options={{
                  title: 'Privacy policy',
                  presentation: 'modal',
                  headerRight: () => <Button label="Done" variant="plain" size="small" onPress={closePrivacy} />,
                }}
              />
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
