import Constants from 'expo-constants';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { SUPPORT_EMAIL } from '../config';
import { contactMailto, listMailto, suggestMailto } from '../domain/support';
import { openLink } from '../lib/openLink';
import { colors, space, type } from '../theme';
import { Icon, Row, Section } from './ui';

/** Credit required for the place locations, which were found with OpenStreetMap's Nominatim (ODbL). */
export function Attribution() {
  return <Text style={[type.footnote, styles.attribution]}>Map locations © OpenStreetMap contributors</Text>;
}

/**
 * The About tab when the app runs without a backend: what Farm Direct is, where the places come from,
 * email links for suggestions, owners and contact (hidden when no support address was set for the build),
 * the privacy policy, the OpenStreetMap credit and the app version. Nothing here needs an account.
 */
export function AboutContent() {
  const version = Constants.expoConfig?.version ?? '';
  const suggest = suggestMailto(SUPPORT_EMAIL);
  const list = listMailto(SUPPORT_EMAIL);
  const contact = contactMailto(SUPPORT_EMAIL, version || undefined);

  return (
    <>
      <View style={styles.header}>
        <Icon name="leaf.fill" size={56} weight="light" color={colors.tint} />
        <Text style={[type.title2, styles.title]} accessibilityRole="header">
          Farm Direct
        </Text>
        <Text style={[type.body, styles.message]}>
          A free directory of farmers’ markets, farm shops and farm-gate stalls near you. See opening hours and get
          directions.
        </Text>
        <Text style={[type.body, styles.message]}>
          The places come from public sources, such as each place’s own website and council or tourism pages. They are
          unclaimed: their owners haven’t confirmed the details yet.
        </Text>
      </View>

      {suggest || list || contact ? (
        <Section footer="These open an email to us, ready to fill in.">
          {suggest ? (
            <Row
              icon="plus.circle"
              title="Suggest a place"
              subtitle="Know a farm, stall or market that’s missing?"
              accessory="chevron"
              onPress={() => openLink(suggest)}
            />
          ) : null}
          {list ? (
            <Row
              icon="person.crop.circle.badge.checkmark"
              title="Own a farm, stall or market?"
              subtitle="List it or claim it"
              accessory="chevron"
              onPress={() => openLink(list)}
            />
          ) : null}
          {contact ? <Row icon="envelope" title="Contact us" accessory="chevron" onPress={() => openLink(contact)} /> : null}
        </Section>
      ) : null}

      <Section>
        <Row title="Privacy policy" accessory="chevron" onPress={() => router.push('/privacy')} />
        {version ? <Row title="Version" value={version} /> : null}
      </Section>
      <Attribution />
    </>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.xl },
  title: { color: colors.label, textAlign: 'center', fontWeight: '600' },
  message: { color: colors.secondaryLabel, textAlign: 'center' },
  attribution: { color: colors.secondaryLabel, textAlign: 'center', paddingHorizontal: space.lg, marginTop: space.sm },
});
