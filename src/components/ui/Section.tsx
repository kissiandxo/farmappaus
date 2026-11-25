import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, hairline, radius, space, type } from '../../theme';
import { ROW_ICON_GAP, ROW_ICON_SIZE, ROW_PADDING, type RowProps } from './Row';

export interface SectionProps {
  /** Footnote-style caption above the group (shown uppercase, like Settings). */
  header?: string;
  /** Footnote under the group. */
  footer?: string;
  /** Rows (or any views). Falsy children are skipped. Separators are drawn between the rest. */
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Inset grouped list section: 16 pt side margins, `cell` background, radius 12, hairline separators between
 * children. Separators are inset to line up with the row text, and skip the icon when a `Row` has one.
 * Place Sections on a `groupedBackground` screen. Gives 24 pt of space below itself.
 */
export function Section({ header, footer, children, style }: SectionProps) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.section, style]}>
      {header ? (
        <Text style={[type.footnote, styles.header]} accessibilityRole="header">
          {header.toUpperCase()}
        </Text>
      ) : null}
      <View style={styles.group}>
        {items.map((child, i) => {
          const hasIcon = isValidElement(child) && !!(child as ReactElement<RowProps>).props.icon;
          const inset = ROW_PADDING + (hasIcon ? ROW_ICON_SIZE + ROW_ICON_GAP : 0);
          return (
            <View key={isValidElement(child) && child.key != null ? child.key : i}>
              {i > 0 ? <View style={[styles.separator, { marginLeft: inset }]} /> : null}
              {child}
            </View>
          );
        })}
      </View>
      {footer ? <Text style={[type.footnote, styles.footer]}>{footer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: space.lg, marginBottom: space.xl },
  header: { color: colors.secondaryLabel, paddingHorizontal: space.lg, paddingBottom: 6 },
  footer: { color: colors.secondaryLabel, paddingHorizontal: space.lg, paddingTop: 6 },
  group: { backgroundColor: colors.cell, borderRadius: radius.group, borderCurve: 'continuous', overflow: 'hidden' },
  separator: { height: hairline, backgroundColor: colors.separator },
});
