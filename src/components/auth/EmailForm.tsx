import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { validateEmail, validatePassword } from '../../domain/validation';
import { useAuth } from '../../state/AuthContext';
import { colors, MIN_TAP, space, type } from '../../theme';
import { Notice } from '../FormBits';
import { Button, Icon, Row, Section } from '../ui';

/**
 * Email and password sign-in / sign-up. Put it inside a ScrollView. When sign-in works the session
 * changes and the screen that shows this form closes itself.
 */
export function EmailForm() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    const problem =
      validateEmail(email) ?? (mode === 'signup' ? validatePassword(password) : password ? null : 'Enter your password.');
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

  return (
    <>
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
    </>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.lg },
  title: { color: colors.label, textAlign: 'center' },
  message: { color: colors.secondaryLabel, textAlign: 'center' },
  pad: { paddingHorizontal: space.lg, marginBottom: space.lg },
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
