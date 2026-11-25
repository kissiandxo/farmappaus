import { Pressable, StyleSheet, Text, useWindowDimensions, View, type ColorValue } from 'react-native';

import { colors, MIN_TAP, radius, space, type } from '../../theme';
import { Icon, type SFSymbol } from '../ui';

/** Above this text scale the tiles wrap two by two so labels are never broken mid-word. */
const WRAP_FONT_SCALE = 1.3;
/** Above this text scale each tile is a full-width row with the symbol beside the label. */
const ROWS_FONT_SCALE = 2;

export interface ActionTileSpec {
  /** Stable key, e.g. "directions". */
  key: string;
  icon: SFSymbol;
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** `filled` is the one primary action (Directions); `tinted` is the quiet default. */
  variant?: 'filled' | 'tinted';
  /** Tinted only: symbol and label colour. Default tint. */
  color?: ColorValue;
  /** Tinted only: background colour. Default tintFill. */
  fill?: ColorValue;
  /** For toggles such as Save. */
  selected?: boolean;
}

export type ActionTilesLayout = 'row' | 'grid' | 'list';

/** Layout for the given text scale: one row of equal tiles, a 2×2 grid, or full-width rows. */
export function actionTilesLayout(fontScale: number): ActionTilesLayout {
  if (fontScale > ROWS_FONT_SCALE) return 'list';
  if (fontScale > WRAP_FONT_SCALE) return 'grid';
  return 'row';
}

/**
 * Row of equal-width action tiles, like the Apple Maps place card: symbol above a footnote label.
 * Wraps into a 2×2 grid, then full-width rows, as the text size grows.
 */
export function ActionTiles({ actions }: { actions: ActionTileSpec[] }) {
  const { fontScale } = useWindowDimensions();
  const layout = actionTilesLayout(fontScale);

  return (
    <View style={[styles.wrap, layout !== 'row' && styles.wrapMany]}>
      {actions.map((a) => {
        const filled = a.variant === 'filled';
        const fg = filled ? colors.onTint : (a.color ?? colors.tint);
        const bg = filled ? colors.tint : (a.fill ?? colors.tintFill);
        return (
          <Pressable
            key={a.key}
            onPress={a.onPress}
            accessibilityRole="button"
            accessibilityLabel={a.accessibilityLabel ?? a.label}
            accessibilityHint={a.accessibilityHint}
            accessibilityState={a.selected !== undefined ? { selected: a.selected } : undefined}
            style={({ pressed }) => [
              styles.tile,
              layout === 'row' && styles.tileRow,
              layout === 'grid' && styles.tileGrid,
              layout === 'list' && styles.tileList,
              { backgroundColor: bg },
              pressed && styles.pressed,
            ]}
          >
            <Icon name={a.icon} size={24} color={fg} />
            <Text style={[type.footnote, styles.label, layout === 'list' && styles.labelList, { color: fg }]}>
              {a.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginVertical: space.md },
  wrapMany: { flexWrap: 'wrap' },
  tile: {
    minHeight: MIN_TAP + 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
    borderRadius: radius.group,
    borderCurve: 'continuous',
  },
  tileRow: { flex: 1 },
  tileGrid: { flexBasis: '48%', flexGrow: 1 },
  tileList: {
    flexBasis: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: space.md,
    paddingHorizontal: space.lg,
    minHeight: MIN_TAP,
  },
  pressed: { opacity: 0.6 },
  label: { fontWeight: '500', textAlign: 'center' },
  labelList: { textAlign: 'left', flexShrink: 1, ...type.body, fontWeight: '500' },
});
