import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';

import { formatDateAu } from '../domain/format';
import { useSearch } from '../state/SearchContext';
import { colors, radius, space, type } from '../theme';
import { Button, Icon, type SFSymbol } from './ui';

interface NoticeProps {
  background: ColorValue;
  icon: SFSymbol;
  iconColor: ColorValue;
  title?: string;
  titleColor?: ColorValue;
  text: string;
  role?: 'alert';
  children?: ReactNode;
}

/** Quiet notice: tinted background, an SF Symbol, footnote text. */
function Notice({ background, icon, iconColor, title, titleColor, text, role, children }: NoticeProps) {
  return (
    <View
      style={[styles.box, { backgroundColor: background }]}
      accessible={!children}
      accessibilityRole={role}
    >
      <Icon name={icon} size={18} weight="medium" color={iconColor} />
      <View style={styles.body}>
        {title ? <Text style={[styles.title, { color: titleColor ?? colors.label }]}>{title}</Text> : null}
        <Text style={styles.text}>{text}</Text>
        {children}
      </View>
    </View>
  );
}

/** Tells people what they are looking at: sample data, saved (offline) listings, or a problem. */
export function DataBanner() {
  const { dataStatus, refresh } = useSearch();

  if (dataStatus.kind === 'live') return null;

  if (dataStatus.kind === 'sample') {
    return (
      <Notice
        background={colors.orangeFill}
        icon="info.circle"
        iconColor={colors.orange}
        title="Sample data"
        titleColor={colors.orange}
        text="These listings are made up so we can test the app. No real farms are shown yet."
        role="alert"
      />
    );
  }

  if (dataStatus.kind === 'loading') {
    return (
      <Notice
        background={colors.fill}
        icon="arrow.triangle.2.circlepath"
        iconColor={colors.secondaryLabel}
        text="Loading listings…"
      />
    );
  }

  if (dataStatus.kind === 'cached') {
    return (
      <Notice
        background={colors.fill}
        icon="clock"
        iconColor={colors.secondaryLabel}
        title="Saved listings"
        text={`Showing listings saved on ${formatDateAu(dataStatus.at)}.${
          dataStatus.failed ? ' We couldn’t update them just now.' : ''
        } Pull down to refresh when you have reception.`}
        role="alert"
      />
    );
  }

  return (
    <Notice
      background={colors.redFill}
      icon="wifi.exclamationmark"
      iconColor={colors.red}
      title="We couldn’t load listings"
      text="Check your connection and try again."
      role="alert"
    >
      <Button label="Try again" variant="tinted" size="small" onPress={refresh} style={styles.retry} />
    </Notice>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.group,
    borderCurve: 'continuous',
  },
  body: { flex: 1, gap: 2 },
  title: { ...type.footnote, fontWeight: '600' },
  text: { ...type.footnote, color: colors.label },
  retry: { marginTop: space.xs },
});
