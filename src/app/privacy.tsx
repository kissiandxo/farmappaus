import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { OPERATOR_NAME, SUPPORT_EMAIL } from '../config';
import { privacySections, PRIVACY_UPDATED } from '../content/privacy';
import { isBackendConfigured } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { colors, space, type } from '../theme';

/** The privacy policy, shown as a sheet with "Done" (registered in the root layout). */
export default function PrivacyScreen() {
  const hasLocalProfile = !!useAuth().localProfile;
  // Without a backend the app has no accounts, so the account-only sections (and the note about them) are left
  // out. The Sign in with Apple test-build section is shown only to someone who still has that profile.
  const SECTIONS = useMemo(
    () =>
      privacySections({
        email: SUPPORT_EMAIL,
        operator: OPERATOR_NAME,
        accounts: isBackendConfigured,
        legacyAppleProfile: hasLocalProfile,
      }),
    [hasLocalProfile],
  );

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[type.footnote, styles.updated]}>Last updated {PRIVACY_UPDATED}</Text>
      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[type.title3, styles.heading]} accessibilityRole="header">
            {section.title}
          </Text>
          {section.paragraphs.map((paragraph, i) => (
            <Text key={i} style={[type.body, styles.body]} selectable>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// Margins of 20 pt line the text up with the large title.
const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  content: { paddingHorizontal: space.lg + space.xs, paddingTop: space.md, paddingBottom: space.xxl * 2 },
  updated: { color: colors.secondaryLabel, marginBottom: space.xl },
  section: { gap: space.md, marginBottom: space.xl },
  heading: { color: colors.label },
  body: { color: colors.label },
});
