import { ScrollView, StyleSheet, Text } from 'react-native';

import { PRIVACY_SECTIONS, PRIVACY_UPDATED } from '../content/privacy';
import { colors, font, space } from '../theme';

export default function PrivacyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.updated}>Last updated {PRIVACY_UPDATED}</Text>
      {PRIVACY_SECTIONS.map((section) => (
        <Text key={section.title} accessible={false}>
          <Text style={styles.heading} accessibilityRole="header">
            {section.title}
            {'\n'}
          </Text>
          <Text style={styles.body}>{section.paragraphs.join('\n\n')}</Text>
          {'\n\n'}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl * 3, gap: space.sm },
  updated: { fontSize: font.small, color: colors.textMuted },
  heading: { fontSize: font.title, fontWeight: '700', color: colors.text },
  body: { fontSize: font.body, color: colors.text, lineHeight: 26 },
});
