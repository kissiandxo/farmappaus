import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AboutContent, Attribution } from '../../../components/AboutContent';
import { Notice } from '../../../components/FormBits';
import { Icon, Row, Section } from '../../../components/ui';
import { displayName } from '../../../domain/onboarding';
import { useAuth } from '../../../state/AuthContext';
import { colors, space, type } from '../../../theme';

const ROLE_LABELS = { user: 'Customer', farmer: 'Farmer', admin: 'Administrator' } as const;

const openWelcome = () => router.push('/(auth)/welcome');
const openPrivacy = () => router.push('/privacy');

export default function AccountScreen() {
  const {
    available,
    appleAvailable,
    ready,
    session,
    email: signedInEmail,
    role,
    localProfile,
    signOut,
    deleteAccount,
    signInWithApple,
    removeLocalProfile,
  } = useAuth();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  if (available && !ready) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Text style={[type.body, styles.loading]}>Loading…</Text>
      </ScrollView>
    );
  }

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account, your saved favourites and any listings that are still drafts. Listings that have already been published stay online without an owner. This can’t be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAccount();
            setNotice({ ok: result.ok, text: result.message });
          },
        },
      ],
    );

  const confirmRemoveProfile = () =>
    Alert.alert(
      'Remove from this iPhone?',
      'Your name and email are deleted from this iPhone. You can sign in with Apple again whenever you like.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeLocalProfile() },
      ],
    );

  const finishSetup = async () => {
    const result = await signInWithApple();
    if (result.message) setNotice({ ok: result.ok, text: result.message });
  };

  // No backend: no accounts. The tab is "About". A profile saved by an earlier version is still shown and removable.
  if (!available) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {localProfile ? (
          <Section header="Signed in with Apple">
            <Row
              title={displayName(localProfile)}
              subtitle={localProfile.givenName || localProfile.familyName ? localProfile.email ?? undefined : undefined}
            />
            <Row title="Stored on this iPhone" icon="iphone" />
            <Row title="Remove from this iPhone" destructive onPress={confirmRemoveProfile} />
          </Section>
        ) : null}
        <AboutContent />
      </ScrollView>
    );
  }

  if (session) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Section header="Signed in as">
          <Row title={signedInEmail ?? ''} />
          <Row title="Account type" value={role ? ROLE_LABELS[role] : 'Checking…'} />
        </Section>

        {notice && (
          <View style={styles.pad}>
            <Notice kind={notice.ok ? 'ok' : 'error'}>{notice.text}</Notice>
          </View>
        )}

        {localProfile && appleAvailable ? (
          <Section footer="Your Apple sign-in is saved on this iPhone. Tap to add it to your account.">
            <Row title="Finish setting up your account" icon="apple.logo" accessory="chevron" onPress={finishSetup} />
          </Section>
        ) : null}

        <Section>
          <Row
            title={role === 'farmer' || role === 'admin' ? 'My farm listings' : 'List my farm (free)'}
            accessory="chevron"
            onPress={() => router.push('/farmer')}
          />
          <Row title="Suggest a farm or market" accessory="chevron" onPress={() => router.push('/suggest')} />
        </Section>

        {role === 'admin' && (
          <Section>
            <Row title="Review queue" accessory="chevron" onPress={() => router.push('/admin')} />
          </Section>
        )}

        <Section>
          <Row title="Privacy policy" accessory="chevron" onPress={openPrivacy} />
        </Section>

        <Section>
          <Row title="Sign out" onPress={signOut} />
        </Section>

        <Section>
          <Row title="Delete my account" destructive onPress={confirmDelete} />
        </Section>
        <Attribution />
      </ScrollView>
    );
  }

  if (localProfile) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Section header="Signed in with Apple">
          <Row title={displayName(localProfile)} subtitle={localProfile.givenName || localProfile.familyName ? localProfile.email ?? undefined : undefined} />
          <Row title="Stored on this iPhone" icon="iphone" />
        </Section>

        <Section footer="Create an account to keep your saved places on every phone.">
          <Row title="Sign in or create an account" accessory="chevron" onPress={openWelcome} />
        </Section>

        <Section>
          <Row title="Privacy policy" accessory="chevron" onPress={openPrivacy} />
        </Section>

        <Section>
          <Row title="Remove from this iPhone" destructive onPress={confirmRemoveProfile} />
        </Section>
        <Attribution />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Icon name="person.crop.circle" size={72} weight="light" color={colors.tint} />
        <Text style={[type.title1, styles.title]} accessibilityRole="header">
          Accounts
        </Text>
        <Text style={[type.body, styles.message]}>
          Sign in to keep your saved places on every phone, suggest a farm, or list your own farm for free.
        </Text>
      </View>

      <Section>
        <Row title="Sign in" icon="person.crop.circle" accessory="chevron" onPress={openWelcome} />
      </Section>

      <Section>
        <Row title="Privacy policy" accessory="chevron" onPress={openPrivacy} />
      </Section>
      <Attribution />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
  loading: { color: colors.secondaryLabel, padding: space.lg },
  pad: { paddingHorizontal: space.lg, marginBottom: space.lg },
  header: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.lg },
  title: { color: colors.label, textAlign: 'center' },
  message: { color: colors.secondaryLabel, textAlign: 'center' },
});
