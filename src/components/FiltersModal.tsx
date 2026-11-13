import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSearch } from '../state/SearchContext';
import { colors, space } from '../theme';
import { FilterPanel } from './FilterPanel';
import { SheetHeader } from './SheetHeader';
import { Button } from './ui';

interface FiltersModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Filters as a pageSheet: grouped sections, "Done" in the bar, a "Show N places" button at the foot. */
export function FiltersModal({ visible, onClose }: FiltersModalProps) {
  const { filters, setFilters, results } = useSearch();
  const count = results.length === 1 ? 'Show 1 place' : `Show ${results.length} places`;
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <SheetHeader title="Filters" onDone={onClose} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FilterPanel filters={filters} onChange={setFilters} />
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
          <Button label={count} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.groupedBackground },
  content: { paddingBottom: space.lg },
  footer: {
    padding: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    backgroundColor: colors.groupedBackground,
  },
});
