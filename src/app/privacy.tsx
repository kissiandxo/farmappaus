import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PRIVACY_SECTIONS, PRIVACY_UPDATED } from '../content/privacy';
import { colors, space, type } from '../theme';

export default function PrivacyScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[type.footnote, styles.updated]}>Last updated {PRIVACY_UPDATED}</Text>
      {PRIVACY_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[type.title3, styles.heading]} accessibilityRole="header">
            {section.title}
          </Text>
          {section.paragraphs.map((paragraph, i) => (
            <Text key={i} style={[type.body, styles.body]}>
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
