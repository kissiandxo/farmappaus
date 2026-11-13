import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { SUPPORT_EMAIL } from '../config';
import { LISTINGS_CHECKED_ON } from '../data/realFarms';
import { contactMailto, listMailto, suggestMailto, versionLabel } from '../domain/support';
import { openEmail } from '../lib/openLink';
import { colors, radius, space, type } from '../theme';
import { Row, Section } from './ui';

const APP_ICON = require('../../assets/images/icon.png');
const ICON_SIZE = 72;

/** "November 2026" for an ISO date such as "2026-11-12"; "" if it can't be read. */
function monthYear(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m) return '';
  const date = new Date(y, m - 1, d || 1);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

/** Credit required for the place locations, which were found with OpenStreetMap's Nominatim (ODbL). */
export function Attribution() {
  return <Text style={[type.footnote, styles.attribution]}>Map locations © OpenStreetMap contributors</Text>;
}

/**
 * The About tab when the app runs without a backend: what Farm Direct is, where the places come from and when
 * they were checked, email links for shoppers and for farmers (hidden when no support address was set for the
 * build), the privacy policy, the app version and the OpenStreetMap credit. Nothing here needs an account.
 */
export function AboutContent() {
  const version = versionLabel(Constants.expoConfig?.version, Constants.expoConfig?.ios?.buildNumber);
  const suggest = suggestMailto(SUPPORT_EMAIL);
  const list = listMailto(SUPPORT_EMAIL);
  const contact = contactMailto(SUPPORT_EMAIL, version || undefined);
  const checked = monthYear(LISTINGS_CHECKED_ON);

  return (
    <>
      <View style={styles.header}>
        <Image source={APP_ICON} style={styles.icon} accessible={false} />
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
        <Text style={[type.body, styles.message]}>Hours and details can change. Check with the place before you travel.</Text>
        {checked ? <Text style={[type.footnote, styles.message]}>Places checked {checked}</Text> : null}
      </View>

      {suggest || contact ? (
        <Section header="For shoppers">
          {suggest ? (
            <Row
              icon="plus.circle"
              title="Suggest a place"
              subtitle="Know a farm, stall or market that’s missing?"
              accessory="chevron"
              onPress={() => openEmail(suggest, SUPPORT_EMAIL)}
            />
          ) : null}
          {contact ? (
            <Row
              icon="envelope"
              title="Contact us"
              subtitle={SUPPORT_EMAIL}
              accessory="chevron"
              accessibilityLabel={`Contact us, ${SUPPORT_EMAIL}`}
              onPress={() => openEmail(contact, SUPPORT_EMAIL)}
            />
          ) : null}
        </Section>
      ) : null}

      {list ? (
        <Section header="For farmers and market managers" footer="These open an email to us, ready to fill in.">
          <Row
            icon="person.crop.circle.badge.checkmark"
            title="List or claim your place"
            subtitle="Own a farm, stall or market?"
            accessory="chevron"
            onPress={() => openEmail(list, SUPPORT_EMAIL)}
          />
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
  icon: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: radius.card, borderCurve: 'continuous', marginBottom: space.xs },
  title: { color: colors.label, textAlign: 'center', fontWeight: '600' },
  message: { color: colors.secondaryLabel, textAlign: 'center' },
  attribution: { color: colors.secondaryLabel, textAlign: 'center', paddingHorizontal: space.lg, marginTop: space.sm },
});
