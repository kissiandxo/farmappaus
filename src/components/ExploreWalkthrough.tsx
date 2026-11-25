import { useEffect, useState, type RefObject } from 'react';
import { AccessibilityInfo, AppState, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space, type } from '../theme';
import { Button } from './ui';

type Anchor = RefObject<React.ComponentRef<typeof View> | null>;
type Bounds = { x: number; y: number; w: number; h: number };
const STEPS = [
  { title: 'Choose your area', text: 'Tap the location pin to search by suburb or postcode. Explore sorts places from there.' },
  { title: 'Find what’s on', text: 'Tap Filters to find independent butchers, fresh fruit or places open this weekend.' },
] as const;

export function ExploreWalkthrough({ location, filters, onClose, onFilters }: {
  location: Anchor; filters: Anchor; onClose: () => void; onFilters: () => void;
}) {
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<Bounds | null>(null);
  const { width, height } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const last = step === STEPS.length - 1;
  const next = () => last ? onClose() : setStep(1);

  useEffect(() => {
    const timer = setTimeout(onClose, 24000);
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') onClose(); });
    return () => { clearTimeout(timer); sub.remove(); };
  }, [onClose]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(STEPS[step].title + '. ' + STEPS[step].text);
    const timer = step === 0 ? setTimeout(() => setStep(1), 12000) : undefined;
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    const anchor = step === 0 ? location : filters;
    let active = true;
    const measure = () => anchor.current?.measureInWindow((x, y, w, h) => {
      if (!active || !w || !h) return;
      const left = Math.max(0, x - 4);
      const top = Math.max(0, y - 4);
      const next = { x: left, y: top, w: Math.min(width - left, w + 8), h: Math.min(height - top, h + 8) };
      if (next.w <= 0 || next.h <= 0) return;
      setBox(prev => prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h ? prev : next);
    });
    measure();
    // Native large titles and the dismissing welcome sheet may still be moving.
    const id = setInterval(measure, 250);
    return () => { active = false; clearInterval(id); };
  }, [step, location, filters, width, height]);

  const below = box ? box.y + box.h + space.md : safe.top + space.xl;
  const above = !!box && below > height * 0.55;
  const cardPosition = above ? { bottom: height - box.y + space.md } : { top: below };
  return (
    <Modal transparent animationType="none" presentationStyle="overFullScreen" visible onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        {box ? <>
          <View style={[styles.shade, { top: 0, height: box.y, left: 0, right: 0 }]} />
          <View style={[styles.shade, { top: box.y + box.h, bottom: 0, left: 0, right: 0 }]} />
          <View style={[styles.shade, { top: box.y, height: box.h, left: 0, width: box.x }]} />
          <View style={[styles.shade, { top: box.y, height: box.h, left: box.x + box.w, right: 0 }]} />
          <Pressable accessibilityRole="button" accessibilityLabel={last ? 'Open filters' : 'Next tip'}
            onPress={last ? onFilters : next} style={[styles.highlight, { left: box.x, top: box.y, width: box.w, height: box.h }]} />
        </> : <View style={[StyleSheet.absoluteFill, styles.shade]} />}
        <ScrollView style={[styles.card, cardPosition, { maxHeight: above && box ? box.y - safe.top - space.md : height - below - safe.bottom - space.md }]}
          contentContainerStyle={styles.content}>
          <Text style={[type.title3, styles.title]} accessibilityRole="header">{STEPS[step].title}</Text>
          <Text style={[type.body, styles.text]}>{STEPS[step].text}</Text>
          <View style={styles.actions}>
            <Button variant="plain" label="Skip tour" onPress={onClose} />
            <Button label={last ? 'Try filters' : 'Next'} onPress={last ? onFilters : next} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  shade: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.68)' },
  highlight: { position: 'absolute', borderWidth: 2, borderColor: 'white', borderRadius: 12 },
  card: { position: 'absolute', left: space.lg, right: space.lg, borderRadius: radius.card, backgroundColor: colors.cell },
  content: { padding: space.lg, gap: space.sm },
  title: { color: colors.label, fontWeight: '700' }, text: { color: colors.secondaryLabel },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs },
});
