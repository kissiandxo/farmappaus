import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Notice } from '../../../components/FormBits';
import { Button, EmptyState, Icon, Row, Section } from '../../../components/ui';
import { validateEmail, validatePassword } from '../../../domain/validation';
import { useAuth } from '../../../state/AuthContext';
import { colors, MIN_TAP, space, type } from '../../../theme';

const ROLE_LABELS = { user: 'Customer', farmer: 'Farmer', admin: 'Administrator' } as const;

export default function AccountScreen() {
  const { available, ready, session, email: signedInEmail, role, signIn, signUp, signOut, deleteAccount } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  if (!available) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <EmptyState
          icon="person.crop.circle"
          title="Accounts"
          message="Accounts, saved favourites that follow you between phones, and farmer listings need the online service. It isn’t connected in this version of the app, so everything you see is stored on your phone."
          style={styles.emptyState}
        />
        <Section>
          <Row title="Privacy policy" accessory="chevron" onPress={() => router.push('/privacy')} />
        </Section>
      </ScrollView>
    );
  }

  if (!ready) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Text style={[type.body, styles.loading]}>Loading…</Text>
      </ScrollView>
    );
  }

  const submit = async () => {
    const problem = validateEmail(email) ?? (mode === 'signup' ? validatePassword(password) : password ? null : 'Enter your password.');
    if (problem) {
      setNotice({ ok: false, text: problem });
      return;
    }
    setBusy(true);
    setNotice(null);
    const result = await (mode === 'signin' ? signIn : signUp)(email, password);
    setBusy(false);
    setNotice({ ok: result.ok, text: result.message });
    if (result.ok && mode === 'signin') setPassword('');
  };

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
          <Row title="Privacy policy" accessory="chevron" onPress={() => router.push('/privacy')} />
        </Section>

        <Section>
          <Row title="Sign out" onPress={signOut} />
        </Section>

        <Section>
          <Row title="Delete my account" destructive onPress={confirmDelete} />
        </Section>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Icon name="person.crop.circle" size={72} weight="light" color={colors.tint} />
        <Text style={[type.title1, styles.title]} accessibilityRole="header">
          {mode === 'signin' ? 'Sign in' : 'Create an account'}
        </Text>
        <Text style={[type.body, styles.message]}>
          Sign in to keep your saved places on every phone, suggest a farm, or list your own farm for free.
        </Text>
      </View>

      <Section footer={mode === 'signup' ? 'At least 8 characters, with some letters.' : undefined}>
        <Row
          title="Email"
          accessory={
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              style={styles.input}
              accessibilityLabel="Email"
            />
          }
        />
        <Row
          title="Password"
          accessory={
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              textContentType={mode === 'signin' ? 'password' : 'newPassword'}
              style={styles.input}
              accessibilityLabel="Password"
              onSubmitEditing={submit}
            />
          }
        />
      </Section>

      {notice && (
        <View style={styles.pad}>
          <Notice kind={notice.ok ? 'ok' : 'error'}>{notice.text}</Notice>
        </View>
      )}

      <View style={styles.actions}>
        <Button label={busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submit} disabled={busy} />
        <Button
          variant="plain"
          label={mode === 'signin' ? 'I’m new – create an account' : 'I already have an account'}
          onPress={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setNotice(null);
          }}
        />
      </View>

      <Section>
        <Row title="Privacy policy" accessory="chevron" onPress={() => router.push('/privacy')} />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space.xxl },
  emptyState: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', paddingVertical: space.xxl },
  loading: { color: colors.secondaryLabel, padding: space.lg },
  pad: { paddingHorizontal: space.lg, marginBottom: space.lg },
  header: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.lg },
  title: { color: colors.label, textAlign: 'center' },
  message: { color: colors.secondaryLabel, textAlign: 'center' },
  input: {
    ...type.body,
    width: '62%',
    minHeight: MIN_TAP,
    color: colors.label,
    textAlign: 'right',
    paddingVertical: space.sm,
  },
  actions: { paddingHorizontal: space.lg, gap: space.sm, marginBottom: space.xl },
});
