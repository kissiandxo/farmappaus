import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, space, type } from '../../theme';
import { Button } from './Button';
import { Icon, type SFSymbol } from './Icon';

export interface EmptyStateProps {
  /** Large SF Symbol shown in tertiaryLabel. */
  icon: SFSymbol;
  title: string;
  message?: string;
  /** Optional single tinted action. */
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}

/** Centred empty / error state: big quiet symbol, title3 title, body message, one tinted button. */
export function EmptyState({ icon, title, message, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Icon name={icon} size={56} color={colors.tertiaryLabel} weight="light" />
      <Text style={[type.title3, styles.title]} accessibilityRole="header">
        {title}
      </Text>
      {message ? <Text style={[type.body, styles.message]}>{message}</Text> : null}
      {action ? <Button label={action.label} variant="tinted" size="small" onPress={action.onPress} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  title: { color: colors.label, fontWeight: '600', textAlign: 'center', marginTop: space.sm },
  message: { color: colors.secondaryLabel, textAlign: 'center', maxWidth: 320 },
  action: { marginTop: space.md, alignSelf: 'center' },
});
