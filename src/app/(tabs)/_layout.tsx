import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { colors } from '../../theme';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return (
      <Text style={{ fontSize: 22, color }} accessibilityElementsHidden importantForAccessibility="no">
        {glyph}
      </Text>
    );
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: { fontSize: 22, fontWeight: '700' },
        headerTitle: 'Farm Direct',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 15, fontWeight: '700' },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: 72, // room for a large label plus icon
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'List', tabBarIcon: icon('☰') }} />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: icon('⌖') }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved', tabBarIcon: icon('♥') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('☺') }} />
    </Tabs>
  );
}
