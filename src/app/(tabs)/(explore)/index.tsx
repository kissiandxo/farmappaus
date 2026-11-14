import { router, Stack, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, View, type ListRenderItem } from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';

import { DataBanner } from '../../../components/DataBanner';
import { FarmCard } from '../../../components/FarmCard';
import { explainNoResults, type NoResultsFix } from '../../../components/FilterPanel';
import { FiltersModal } from '../../../components/FiltersModal';
import { LocationBar } from '../../../components/LocationBar';
import { LocationModal } from '../../../components/LocationModal';
import { LocationPrompt } from '../../../components/LocationPrompt';
import { SearchField } from '../../../components/SearchField';
import { EmptyState } from '../../../components/ui';
import { DEFAULT_FILTERS, type FarmResult } from '../../../domain/filters';
import { useFavourites } from '../../../state/FavouritesContext';
import { useSearch } from '../../../state/SearchContext';
import { colors, space } from '../../../theme';

const SEARCH_PLACEHOLDER = 'Name, town, postcode or produce';
/** The native header search bar is iOS/Android only; web gets the in-list SearchField. */
const NATIVE_SEARCH = Platform.OS !== 'web';

export default function FarmListScreen() {
  const { results, filters, setFilters, query, setQuery, refresh, refreshing, dataStatus, isDefaultLocation } = useSearch();
  const { ids: favourites, isFavourite } = useFavourites();
  const [locationOpen, setLocationOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // NativeTabs keeps this screen mounted while another tab is showing; only the visible tab speaks its count.
  const focused = useIsFocused();
  const searchBar = useRef<SearchBarCommands | null>(null);
  // Last text the native search bar reported, so a query set elsewhere (Clear search, screenshot scenes) is pushed into it.
  const nativeText = useRef('');

  // The welcome screen's "Choose a suburb" lands here with ?chooseLocation=1.
  const { chooseLocation } = useLocalSearchParams<{ chooseLocation?: string }>();
  useEffect(() => {
    if (chooseLocation === '1') {
      setLocationOpen(true);
      router.setParams({ chooseLocation: undefined });
    }
  }, [chooseLocation]);

  const open = useCallback((id: string) => router.push(`/farm/${id}`), []);

  const showUnclaimedBadge = dataStatus.kind !== 'public';
  const renderItem = useCallback<ListRenderItem<FarmResult>>(
    ({ item }) => (
      <FarmCard
        result={item}
        onPress={open}
        saved={isFavourite(item.farm.id)}
        showUnclaimedBadge={showUnclaimedBadge}
        distanceFromDefault={isDefaultLocation}
      />
    ),
    [open, isFavourite, showUnclaimedBadge, isDefaultLocation],
  );

  useEffect(() => {
    if (!NATIVE_SEARCH || query === nativeText.current) return;
    nativeText.current = query;
    if (query === '') searchBar.current?.clearText();
    else searchBar.current?.setText(query);
  }, [query]);

  const clearSearch = useCallback(() => setQuery(''), [setQuery]);

  const searchBarOptions = useMemo(
    () =>
      NATIVE_SEARCH
        ? {
            headerSearchBarOptions: {
              ref: searchBar,
              placeholder: SEARCH_PLACEHOLDER,
              hideWhenScrolling: true,
              autoCapitalize: 'none' as const,
              onChangeText: (e: { nativeEvent: { text: string } }) => {
                nativeText.current = e.nativeEvent.text;
                setQuery(e.nativeEvent.text);
              },
              onCancelButtonPress: () => {
                nativeText.current = '';
                setQuery('');
              },
            },
          }
        : {},
    [setQuery],
  );

  const noResults = explainNoResults(filters, query);
  const runFix = (fix: NoResultsFix) => {
    switch (fix) {
      case 'clearSearch':
        clearSearch();
        break;
      case 'clearFilters':
        setFilters(DEFAULT_FILTERS);
        break;
      case 'anyTime':
        setFilters({ ...filters, when: 'any' });
        break;
      case 'anyDistance':
        setFilters({ ...filters, maxKm: null });
        break;
    }
  };
  const { secondaryAction } = noResults;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={searchBarOptions} />
      <FlatList
        style={styles.screen}
        data={results}
        extraData={favourites}
        keyExtractor={(r) => r.farm.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.header}>
            {!NATIVE_SEARCH && (
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder={SEARCH_PLACEHOLDER}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
                accessibilityLabel="Search places"
              />
            )}
            <LocationBar
              onChangeLocation={() => setLocationOpen(true)}
              onOpenFilters={() => setFiltersOpen(true)}
              announce={focused && !filtersOpen}
            />
            <LocationPrompt onChooseSuburb={() => setLocationOpen(true)} />
            <DataBanner />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="magnifyingglass"
            title={noResults.title}
            message={noResults.message}
            action={{ label: noResults.action.label, onPress: () => runFix(noResults.action.fix) }}
            secondaryAction={
              secondaryAction ? { label: secondaryAction.label, onPress: () => runFix(secondaryAction.fix) } : undefined
            }
            style={styles.empty}
          />
        }
        refreshing={refreshing}
        onRefresh={dataStatus.kind === 'public' ? undefined : refresh}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={ItemSeparator}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
      <LocationModal visible={locationOpen} onClose={() => setLocationOpen(false)} />
      <FiltersModal visible={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.groupedBackground },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl * 2 },
  header: { gap: space.md, paddingTop: space.xs, paddingBottom: space.md },
  gap: { height: space.md },
  empty: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', paddingVertical: space.xxl },
});

/** Module-level so FlatList keeps the same component between renders (no remounts). */
const ItemSeparator = () => <View style={styles.gap} />;
