import { router, Stack, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, View, type ListRenderItem } from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';

import { BrowseCategories } from '../../../components/BrowseCategories';
import { ExploreWalkthrough } from '../../../components/ExploreWalkthrough';
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
  const { ids: favourites, isFavourite, toggleFavourite } = useFavourites();
  const [locationOpen, setLocationOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // NativeTabs keeps this screen mounted while another tab is showing; only the visible tab speaks its count.
  const focused = useIsFocused();
  const searchBar = useRef<SearchBarCommands | null>(null);
  // Last text the native search bar reported, so a query set elsewhere (Clear search, screenshot scenes) is pushed into it.
  const nativeText = useRef('');

  // The welcome screen's "Choose a suburb" lands here with ?chooseLocation=1.
  const { chooseLocation, quickTour } = useLocalSearchParams<{ chooseLocation?: string; quickTour?: string }>();
  const locationAnchor = useRef<React.ComponentRef<typeof View>>(null);
  const filterAnchor = useRef<React.ComponentRef<typeof View>>(null);
  const [listGeneration, setListGeneration] = useState(0);
  const [tourVisible, setTourVisible] = useState(false);
  const [sheetAfterTour, setSheetAfterTour] = useState<'location' | 'filters' | null>(null);
  const closeTour = useCallback(() => setTourVisible(false), []);
  useEffect(() => {
    if (!focused || (quickTour !== '1' && quickTour !== 'replay')) return;
    // Give the native welcome sheet time to dismiss before presenting another modal.
    const timer = setTimeout(() => {
      // UIKit sets the initial scroll offset from the large title and search bar.
      // A literal zero would slide the location target underneath the status bar.
      if (quickTour === 'replay') setListGeneration(value => value + 1);
      setTourVisible(true);
      router.setParams({ quickTour: undefined });
    }, 500);
    return () => clearTimeout(timer);
  }, [quickTour, focused]);
  useEffect(() => {
    if (!sheetAfterTour || tourVisible) return;
    const timer = setTimeout(() => {
      if (sheetAfterTour === 'location') setLocationOpen(true);
      else setFiltersOpen(true);
      setSheetAfterTour(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [sheetAfterTour, tourVisible]);
  const closeLocation = () => {
    setLocationOpen(false);
    if (chooseLocation === '1') router.setParams({ chooseLocation: undefined });
  };

  const open = useCallback((id: string) => router.push(`/farm/${id}`), []);

  const showUnclaimedBadge = dataStatus.kind !== 'public';
  const renderItem = useCallback<ListRenderItem<FarmResult>>(
    ({ item }) => (
      <FarmCard
        result={item}
        onPress={open}
        saved={isFavourite(item.farm.id)}
        onToggleSave={toggleFavourite}
        showUnclaimedBadge={showUnclaimedBadge}
        distanceFromDefault={isDefaultLocation}
      />
    ),
    [open, isFavourite, toggleFavourite, showUnclaimedBadge, isDefaultLocation],
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
        key={listGeneration}
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
              locationAnchor={locationAnchor}
              filterAnchor={filterAnchor}
              onChangeLocation={() => setLocationOpen(true)}
              onOpenFilters={() => setFiltersOpen(true)}
              announce={focused && !filtersOpen}
            />
            <BrowseCategories />
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
      {tourVisible && focused ? <ExploreWalkthrough location={locationAnchor} filters={filterAnchor} onClose={closeTour}
        onLocation={() => { closeTour(); setSheetAfterTour('location'); }}
        onFilters={() => { closeTour(); setSheetAfterTour('filters'); }} /> : null}
      <LocationModal visible={locationOpen || chooseLocation === '1'} onClose={closeLocation} />
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
