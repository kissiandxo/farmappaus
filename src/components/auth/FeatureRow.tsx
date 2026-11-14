import { StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from '../../theme';
import { Icon, type SFSymbol } from '../ui';

export interface FeatureRowProps {
  icon: SFSymbol;
  title: string;
  message: string;
}

/** One line of the welcome screen: tinted symbol, headline, and a short explanation. */
export function FeatureRow({ icon, title, message }: FeatureRowProps) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${title}. ${message}`}>
      <View style={styles.symbol}>
        <Icon name={icon} size={30} weight="regular" color={colors.tint} />
      </View>
      <View style={styles.text}>
        <Text style={[type.headline, styles.title]}>{title}</Text>
        <Text style={[type.subheadline, styles.message]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  symbol: { width: 40, alignItems: 'center' },
  text: { flex: 1, gap: 2 },
  title: { color: colors.label },
  message: { color: colors.secondaryLabel },
});
