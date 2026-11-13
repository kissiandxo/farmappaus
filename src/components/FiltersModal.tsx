import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSearch } from '../state/SearchContext';
import { colors, font, MIN_TAP, radius, space } from '../theme';
import { FilterPanel } from './FilterPanel';

interface FiltersModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FiltersModal({ visible, onClose }: FiltersModalProps) {
  const { filters, setFilters, results } = useSearch();
  const count = results.length === 1 ? 'Show 1 place' : `Show ${results.length} places`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.titleRow}>
          <Text style={styles.title} accessibilityRole="header">
            Filters
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <FilterPanel filters={filters} onChange={setFilters} />
        </ScrollView>
        <View style={styles.footer}>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.done}>
            <Text style={styles.doneText}>{count}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    paddingBottom: space.sm,
  },
  title: { fontSize: font.heading, fontWeight: '700', color: colors.text },
  close: { minHeight: MIN_TAP, justifyContent: 'center', paddingHorizontal: space.sm },
  closeText: { fontSize: font.large, fontWeight: '700', color: colors.accent },
  content: { padding: space.lg },
  footer: { padding: space.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  done: {
    minHeight: 60,
    borderRadius: radius.chip,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { fontSize: font.large, fontWeight: '700', color: colors.onPrimary },
});
