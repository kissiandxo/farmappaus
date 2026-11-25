import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon, Row, Section } from '../components/ui';
import { MARKET_CALENDARS } from '../data/marketCalendars';
import { timezoneForState } from '../domain/hours';
import { marketTimeLabel, nextMarketDate, publishedDateLabel } from '../domain/marketDates';
import { openLink } from '../lib/openLink';
import { useSearch } from '../state/SearchContext';
import { colors, radius, space, type } from '../theme';

const monthName = new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', month: 'short' });
const weekdayName = new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', weekday: 'long' });

export default function MarketDatesScreen() {
  const { farms, now } = useSearch();
  const [showSources, setShowSources] = useState(false);
  const markets = useMemo(() => farms.flatMap(farm => {
    const calendar = MARKET_CALENDARS[farm.id];
    return calendar ? [{ farm, calendar, date: nextMarketDate(calendar, now, timezoneForState(farm.state)) }] : [];
  }).sort((a, b) => (a.date ?? '~').localeCompare(b.date ?? '~') || a.farm.name.localeCompare(b.farm.name)), [farms, now]);
  const upcoming = markets.filter(market => market.date);
  const sourcesExpanded = showSources || upcoming.length === 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.intro}>The next published date for each featured market. Times are local to the venue.</Text>
      {upcoming.length > 0 && <Section header="Coming up">
        {upcoming.map(({ farm, calendar, date }) => {
          if (!date) return null;
          const day = new Date(date + 'T12:00:00Z');
          const event = calendar.specials?.[date];
          const locality = farm.locality + ', ' + farm.state;
          const hours = marketTimeLabel(calendar);
          return (
            <Pressable key={farm.id} accessibilityRole="button"
              accessibilityLabel={[farm.name, locality, event, publishedDateLabel(date), hours].filter(Boolean).join('. ')}
              onPress={() => router.push(`/farm/${farm.id}`)} style={({ pressed }) => [styles.event, pressed && styles.pressed]}>
              <View style={styles.dayTile}>
                <Text style={styles.month}>{monthName.format(day).toUpperCase()}</Text>
                <Text style={styles.day}>{day.getUTCDate()}</Text>
              </View>
              <View style={styles.details}>
                <Text style={styles.name}>{farm.name}</Text>
                <Text style={styles.area}>{locality}</Text>
                {event && <Text style={styles.special}>{event}</Text>}
                <Text style={styles.time}>{weekdayName.format(day)} · {hours}</Text>
              </View>
              <Icon name="chevron.right" size={13} color={colors.tertiaryLabel} />
            </Pressable>
          );
        })}
      </Section>}
      {markets.length === 0 && <Text style={styles.intro}>There are no published market calendars in this directory yet.</Text>}
      {markets.length > 0 && <Section footer="Markets can change dates or cancel. Check the published calendar before travelling.">
        {upcoming.length > 0 && <Row title={sourcesExpanded ? 'Hide source calendars' : 'View source calendars'}
          icon="calendar" onPress={() => setShowSources(!showSources)} />}
        {sourcesExpanded && markets.map(({ farm, calendar }) => <Row key={farm.id} title={farm.name} subtitle={calendar.publisher}
          icon="safari" onPress={() => openLink(calendar.source)} accessibilityHint="Opens the published calendar" />)}
      </Section>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.groupedBackground },
  content: { paddingVertical: space.md },
  intro: { ...type.subheadline, color: colors.secondaryLabel, marginHorizontal: space.xl, marginBottom: space.lg },
  event: { flexDirection: 'row', alignItems: 'center', padding: space.lg, gap: space.md },
  pressed: { backgroundColor: colors.fill },
  dayTile: { minWidth: 50, minHeight: 58, backgroundColor: colors.tintFill, borderRadius: radius.group,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xs, paddingVertical: space.xs },
  month: { ...type.caption, fontWeight: '700', color: colors.tint },
  day: { ...type.title2, fontWeight: '700', color: colors.label, fontVariant: ['tabular-nums'] },
  details: { flex: 1, gap: 2 },
  name: { ...type.headline, color: colors.label },
  area: { ...type.subheadline, color: colors.secondaryLabel },
  special: { ...type.footnote, fontWeight: '600', color: colors.tint },
  time: { ...type.footnote, color: colors.secondaryLabel },
});
