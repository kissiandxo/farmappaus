import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '../components/ui';
import { colors } from '../theme';

export { ScreenErrorBoundary as ErrorBoundary } from '../components/ScreenErrorBoundary';

/** Shown for a link that matches no screen (a typo, or a link from a later version), instead of a developer page. */
export default function NotFoundScreen() {
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Not found' }} />
      <EmptyState
        icon="magnifyingglass"
        title="We couldn’t find that page"
        message="The link may be out of date."
        action={{ label: 'Browse places', onPress: () => router.replace('/') }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.groupedBackground },
});
