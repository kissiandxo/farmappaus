import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { validateEmail, validatePassword } from '../../domain/validation';
import { useAuth } from '../../state/AuthContext';
import { colors, font, MIN_TAP, radius, space } from '../../theme';

const ROLE_LABELS = { user: 'Customer', farmer: 'Farmer', admin: 'Administrator' } as const;

function Button({
  label,
  onPress,
  kind = 'secondary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' && styles.primary,
        kind === 'danger' && styles.danger,
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.buttonText, kind === 'primary' && { color: colors.onPrimary }, kind === 'danger' && { color: colors.closed }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function AccountScreen() {
  const { available, ready, session, email: signedInEmail, role, signIn, signUp, signOut, deleteAccount } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  if (!available) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">Accounts</Text>
        <View style={styles.card}>
          <Text style={styles.body}>
            Accounts, saved favourites that follow you between phones, and farmer listings need the online service.
            It isn’t connected in this version of the app, so everything you see is stored on your phone.
          </Text>
        </View>
        <Button label="Privacy policy" onPress={() => router.push('/privacy')} />
      </ScrollView>
    );
  }

  if (!ready) {
    return (
      <View style={styles.content}>
        <Text style={styles.body}>Loading…</Text>
      </View>
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">Your account</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.body}>{signedInEmail}</Text>
          <Text style={styles.label}>Account type</Text>
          <Text style={styles.body}>{role ? ROLE_LABELS[role] : 'Checking…'}</Text>
        </View>
        <Button label={role === 'farmer' || role === 'admin' ? 'My farm listings' : 'List my farm (free)'} kind="primary" onPress={() => router.push('/farmer')} />
        <Button label="Suggest a farm or market" onPress={() => router.push('/suggest')} />
        {role === 'admin' && <Button label="Review queue" onPress={() => router.push('/admin')} />}
        {notice && <Text style={[styles.notice, !notice.ok && styles.noticeError]}>{notice.text}</Text>}
        <Button label="Sign out" onPress={signOut} />
        <Button label="Privacy policy" onPress={() => router.push('/privacy')} />
        <Button label="Delete my account" kind="danger" onPress={confirmDelete} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title} accessibilityRole="header">
        {mode === 'signin' ? 'Sign in' : 'Create an account'}
      </Text>
      <Text style={styles.body}>
        Sign in to keep your saved places on every phone, suggest a farm, or list your own farm for free.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
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
        <Text style={styles.label}>Password</Text>
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
        {mode === 'signup' && <Text style={styles.hint}>At least 8 characters, with some letters.</Text>}
      </View>

      {notice && <Text style={[styles.notice, !notice.ok && styles.noticeError]} accessibilityRole="alert">{notice.text}</Text>}

      <Button label={busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'} kind="primary" onPress={submit} disabled={busy} />
      <Button
        label={mode === 'signin' ? 'I’m new – create an account' : 'I already have an account'}
        onPress={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin');
          setNotice(null);
        }}
      />
      <Button label="Privacy policy" onPress={() => router.push('/privacy')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  title: { fontSize: font.heading, fontWeight: '700', color: colors.text },
  body: { fontSize: font.body, color: colors.text, lineHeight: 26 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.sm },
  label: { fontSize: font.body, fontWeight: '700', color: colors.text },
  hint: { fontSize: font.small, color: colors.textMuted },
  input: {
    minHeight: 56,
    fontSize: font.large,
    color: colors.text,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: space.lg,
  },
  button: {
    minHeight: MIN_TAP + 4,
    borderRadius: radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  danger: { borderColor: colors.closed },
  buttonText: { fontSize: font.large, fontWeight: '700', color: colors.text },
  notice: { fontSize: font.body, fontWeight: '700', color: colors.open },
  noticeError: { color: colors.closed },
});
