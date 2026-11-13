import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeatureRow } from '../../components/auth/FeatureRow';
import { Notice } from '../../components/FormBits';
import { Button, success } from '../../components/ui';
import { locateMe } from '../../lib/locate';
import { useAuth } from '../../state/AuthContext';
import { useSearch } from '../../state/SearchContext';
import { colors, radius, space, type } from '../../theme';

const APP_ICON = require('../../../assets/images/icon.png');
const ICON_SIZE = 96;
const APPLE_BUTTON_HEIGHT = 50;
const APPLE_BUTTON_RADIUS = 14;

/**
 * On first launch the root layout leaves the splash screen up and pushes this screen without animation; the
 * splash is hidden once this screen has laid out, so the tabs never flash behind it. Once per app run.
 */
let splashHidden = false;
const hideSplashOnce = () => {
  if (splashHidden) return;
  splashHidden = true;
  SplashScreen.hideAsync().catch(() => {});
};

const openPrivacy = () => router.push('/privacy');

export default function WelcomeScreen() {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { available, appleAvailable, session, localProfile, signInWithApple, markWelcomeSeen } = useAuth();
  const { setLocation } = useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<{ message: string; canOpenSettings: boolean } | null>(null);
  const signedIn = !!session || !!localProfile;

  // Signing in (Apple or email) finishes the welcome screen.
  useEffect(() => {
    if (!signedIn) return;
    markWelcomeSeen();
    router.dismiss();
  }, [signedIn, markWelcomeSeen]);

  const apple = async () => {
    setBusy(true);
    setError(null);
    const result = await signInWithApple();
    setBusy(false);
    if (!result.ok && result.message) setError(result.message);
  };

  // Closes the welcome screen ("Not now" without a backend, "Continue without an account" with one).
  const finish = () => {
    markWelcomeSeen();
    router.dismiss();
  };

  // Asks for location only when tapped. On success the places are sorted from there; on failure the reason is
  // shown here and "Continue" still closes the screen.
  const locate = async () => {
    setLocating(true);
    setLocationError(null);
    const result = await locateMe();
    setLocating(false);
    if (result.ok) {
      setLocation(result.location);
      success();
      finish();
    } else {
      setLocationError({ message: result.message, canOpenSettings: result.canOpenSettings });
    }
  };

  // Explore opens its location sheet when it sees ?chooseLocation=1.
  const chooseSuburb = () => {
    finish();
    router.navigate({ pathname: '/', params: { chooseLocation: '1' } });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.lg }]}
      showsVerticalScrollIndicator={false}
      onLayout={hideSplashOnce}
    >
      <View style={styles.top}>
        <Image source={APP_ICON} style={styles.icon} accessibilityLabel="Farm Direct app icon" />
        <Text style={[type.largeTitle, styles.title]} accessibilityRole="header">
          Farm Direct
        </Text>
        <Text style={[type.body, styles.tagline]}>Fresh from local farms, stalls and markets near you.</Text>

        <View style={styles.features}>
          <FeatureRow icon="map" title="Find places near you" message="Farms, stalls, shops and markets on one map." />
          <FeatureRow icon="clock" title="Check before you go" message="See opening hours and what’s on offer." />
          <FeatureRow icon="heart" title="Save your favourites" message="Keep the places you love in one list." />
        </View>
      </View>

      <View style={styles.bottom}>
        {available ? (
          <>
            {error ? <Notice kind="error">{error}</Notice> : null}

            {appleAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={
                  scheme === 'dark'
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={APPLE_BUTTON_RADIUS}
                style={[styles.appleButton, busy && styles.busy]}
                onPress={busy ? () => {} : apple}
              />
            ) : null}

            <Button variant="tinted" label="Continue with email" onPress={() => router.push('/(auth)/email')} />
            <Button variant="plain" label="Continue without an account" onPress={finish} />
          </>
        ) : (
          <>
            {locationError ? (
              <Notice kind="error">
                <View style={styles.noticeBody}>
                  <Text style={[type.callout, styles.noticeText]}>{locationError.message}</Text>
                  {locationError.canOpenSettings ? (
                    <Button label="Open Settings" variant="plain" size="small" onPress={() => Linking.openSettings()} />
                  ) : null}
                </View>
              </Notice>
            ) : null}
            <Button
              label="Use my location"
              icon="location.fill"
              loading={locating}
              onPress={locate}
              accessibilityHint="Sorts places by how far they are from you"
            />
            <Button variant="tinted" label="Choose a suburb" onPress={chooseSuburb} disabled={locating} />
            <Button variant="plain" label={locationError ? 'Continue' : 'Not now'} onPress={finish} disabled={locating} />
          </>
        )}

        <Text style={[type.footnote, styles.footnote]}>
          {available
            ? 'Signing in is optional.'
            : 'Farm Direct only uses your location while the app is open, to sort places by distance. It is never sent to us.'}
        </Text>
        <Button variant="plain" size="small" label="Privacy policy" onPress={openPrivacy} style={styles.privacy} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  // flexGrow lets the buttons sit at the bottom on tall screens and scroll on large Dynamic Type.
  content: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: space.xl, gap: space.xl },
  top: { alignItems: 'center', gap: space.md },
  icon: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: radius.hero, borderCurve: 'continuous', marginBottom: space.sm },
  title: { color: colors.label, textAlign: 'center' },
  tagline: { color: colors.secondaryLabel, textAlign: 'center' },
  features: { alignSelf: 'stretch', gap: space.xl, marginTop: space.xl },
  bottom: { gap: space.sm },
  appleButton: { height: APPLE_BUTTON_HEIGHT, alignSelf: 'stretch' },
  busy: { opacity: 0.6 },
  footnote: { color: colors.secondaryLabel, textAlign: 'center', paddingTop: space.xs },
  privacy: { alignSelf: 'center' },
  noticeBody: { gap: space.xs, alignItems: 'flex-start' },
  noticeText: { color: colors.label },
});
