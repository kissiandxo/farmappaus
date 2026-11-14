import { NativeTabs } from 'expo-router/native-tabs';

import { isBackendConfigured } from '../../lib/supabase';
import { colors } from '../../theme';

/**
 * Native iOS tab bar (UITabBarController; Liquid Glass on iOS 26). Each trigger points at a route
 * group that has its own Stack, so every tab keeps a large-title navigation bar.
 * On web/Android expo-router renders its own tab UI for these same triggers.
 */
export default function TabsLayout() {
  return (
    <NativeTabs tintColor={colors.tint}>
      <NativeTabs.Trigger name="(explore)">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'leaf', selected: 'leaf.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(map)">
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(saved)">
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(account)">
        {/* No backend means no accounts, so the last tab is "About". */}
        <NativeTabs.Trigger.Label>{isBackendConfigured ? 'Account' : 'About'}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={
            isBackendConfigured
              ? { default: 'person.crop.circle', selected: 'person.crop.circle.fill' }
              : { default: 'info.circle', selected: 'info.circle.fill' }
          }
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
