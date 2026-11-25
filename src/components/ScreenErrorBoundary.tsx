import { router, type ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';
import { EmptyState } from './ui';

/**
 * Shown instead of a blank screen if a screen throws. "Try again" re-renders it; "Go to Explore" leaves it,
 * so there is always a way out. Route files inside a navigator re-export it as `ErrorBoundary`.
 */
export function ScreenErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <View style={styles.screen}>
      <EmptyState
        icon="exclamationmark.triangle"
        title="Something went wrong"
        message="Your saved places are safe on this iPhone. Please try again."
        action={{ label: 'Try again', onPress: retry }}
        secondaryAction={{ label: 'Go to Explore', onPress: () => router.replace('/') }}
      />
    </View>
  );
}

/**
 * The root layout's fallback. It replaces the whole navigator, so "Go to Explore" would have nothing to
 * navigate; it offers only "Try again".
 */
export function RootErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <View style={styles.screen}>
      <EmptyState
        icon="exclamationmark.triangle"
        title="Something went wrong"
        message="Your saved places are safe on this iPhone. Please try again."
        action={{ label: 'Try again', onPress: retry }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.groupedBackground },
});
