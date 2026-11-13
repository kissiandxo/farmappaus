import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

export default function WelcomeScreen() {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { available, appleAvailable, session, localProfile, signInWithApple, markWelcomeSeen } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Closes the welcome screen: "Get started" without a backend, "Continue without an account" with one.
  const finish = () => {
    markWelcomeSeen();
    router.dismiss();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.lg }]}
      showsVerticalScrollIndicator={false}
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
          <Button label="Get started" onPress={finish} />
        )}

        <Text style={[type.footnote, styles.footnote]}>
          {available ? 'Signing in is optional. ' : ''}
          See how we handle your information in our{' '}
          <Text style={styles.link} accessibilityRole="link" onPress={() => router.push('/privacy')}>
            privacy policy
          </Text>
          .
        </Text>
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
  link: { color: colors.tint },
});
