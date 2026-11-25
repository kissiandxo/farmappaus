import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeatureRow } from '../../components/auth/FeatureRow';
import { Notice } from '../../components/FormBits';
import { Button } from '../../components/ui';
import { useAuth } from '../../state/AuthContext';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signedIn = !!session || !!localProfile;
  const finish = useCallback(() => {
    markWelcomeSeen();
    router.dismissTo({ pathname: '/', params: { quickTour: '1' } });
  }, [markWelcomeSeen]);

  useEffect(() => {
    if (signedIn) finish();
  }, [signedIn, finish]);

  const apple = async () => {
    setBusy(true);
    setError(null);
    const result = await signInWithApple();
    setBusy(false);
    if (!result.ok && result.message) setError(result.message);
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
        <Text style={[type.body, styles.tagline]}>
          Find a farmers’ market, a farm shop or an independent butcher for your next stop.
        </Text>

        <View style={styles.features}>
          <FeatureRow icon="map" title="Pick your starting point" message="Search your suburb or use your current location." />
          <FeatureRow icon="clock" title="Plan a market morning" message="Filter by produce and weekend opening hours." />
          <FeatureRow icon="heart" title="Save your favourites" message="Keep the places you love in one list." />
        </View>
      </View>

      <View style={styles.bottom}>
        {error ? <Notice kind="error">{error}</Notice> : null}
        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            accessibilityLabel="Continue with Apple"
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={scheme === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={APPLE_BUTTON_RADIUS}
            style={[styles.appleButton, busy && styles.busy]}
            onPress={busy ? () => {} : apple}
          />
        ) : null}
        {available ? <Button variant="tinted" label="Continue with email" onPress={() => router.push('/(auth)/email')} /> : null}
        <Button variant={appleAvailable || available ? 'tinted' : 'filled'} label="Explore as a guest" onPress={finish} disabled={busy} />
        <Text style={[type.footnote, styles.footnote]}>
          {appleAvailable && !available ? 'Your Apple profile stays on this iPhone. You can explore every place as a guest.' : 'Explore every place without creating an account.'}
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
