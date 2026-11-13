import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import FarmMap from '../../../components/FarmMap';
import { FiltersModal } from '../../../components/FiltersModal';
import { LocationBar } from '../../../components/LocationBar';
import { LocationModal } from '../../../components/LocationModal';
import { useSearch } from '../../../state/SearchContext';

export default function MapScreen() {
  const { results, location } = useSearch();
  const [locationOpen, setLocationOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <LocationBar
        onChangeLocation={() => setLocationOpen(true)}
        onOpenFilters={() => setFiltersOpen(true)}
      />
      <View style={styles.map}>
        <FarmMap results={results} location={location} />
      </View>
      <LocationModal visible={locationOpen} onClose={() => setLocationOpen(false)} />
      <FiltersModal visible={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { flex: 1 },
});
