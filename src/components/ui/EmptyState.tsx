import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, space, type } from '../../theme';
import { Button } from './Button';
import { Icon, type SFSymbol } from './Icon';

export interface EmptyStateProps {
  /** Large SF Symbol shown in tertiaryLabel. */
  icon: SFSymbol;
  title: string;
  message?: string;
  /** Optional main action, shown as a small tinted button. */
  action?: { label: string; onPress: () => void };
  /** Optional second, quieter action, shown as a plain (text) button under `action`. */
  secondaryAction?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}

/** Centred empty / error state: big quiet symbol, title3 title, body message, a tinted button and an optional plain one. */
export function EmptyState({ icon, title, message, action, secondaryAction, style }: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Icon name={icon} size={56} color={colors.tertiaryLabel} weight="light" />
      <Text style={[type.title3, styles.title]} accessibilityRole="header">
        {title}
      </Text>
      {message ? <Text style={[type.body, styles.message]}>{message}</Text> : null}
      {action ? <Button label={action.label} variant="tinted" size="small" onPress={action.onPress} style={styles.action} /> : null}
      {secondaryAction ? (
        <Button
          label={secondaryAction.label}
          variant="plain"
          size="small"
          onPress={secondaryAction.onPress}
          style={action ? styles.secondary : styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  title: { color: colors.label, fontWeight: '600', textAlign: 'center', marginTop: space.sm },
  message: { color: colors.secondaryLabel, textAlign: 'center', maxWidth: 320 },
  action: { marginTop: space.md, alignSelf: 'center' },
  secondary: { alignSelf: 'center' },
});
