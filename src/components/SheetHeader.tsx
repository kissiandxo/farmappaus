import { StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from '../theme';
import { Button } from './ui';

interface SheetHeaderProps {
  title: string;
  onDone: () => void;
}

/** Top bar of a pageSheet: headline title centred, plain "Done" on the right. */
export function SheetHeader({ title, onDone }: SheetHeaderProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side} />
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.side, styles.sideEnd]}>
        <Button label="Done" variant="plain" size="small" onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    backgroundColor: colors.groupedBackground,
  },
  side: { flex: 1 },
  sideEnd: { flexDirection: 'row', justifyContent: 'flex-end' },
  title: { ...type.headline, color: colors.label, textAlign: 'center', flexShrink: 1 },
});
