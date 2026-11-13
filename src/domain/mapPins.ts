import type { SFSymbol } from 'expo-symbols';

import { VENUE_LABELS, type VenueType } from './types';

/** Palette keys (src/theme.ts) used for pin fills. */
export type PinColor = 'green' | 'orange' | 'blue' | 'purple';

export interface PinStyle {
  symbol: SFSymbol;
  color: PinColor;
  label: string;
}

/** One glyph and colour per venue type. Colour is never the only cue: the glyph differs too. */
export const PIN_STYLES: Record<VenueType, PinStyle> = {
  farm: { symbol: 'leaf.fill', color: 'green', label: VENUE_LABELS.farm },
  farm_gate_stall: { symbol: 'basket.fill', color: 'orange', label: VENUE_LABELS.farm_gate_stall },
  farm_shop: { symbol: 'bag.fill', color: 'blue', label: VENUE_LABELS.farm_shop },
  farmers_market: { symbol: 'tent.fill', color: 'purple', label: VENUE_LABELS.farmers_market },
};

export function pinStyle(type: VenueType): PinStyle {
  return PIN_STYLES[type];
}

/**
 * VoiceOver label for a place's pin: name, kind of place, opening status, and whether the pin is only the
 * suburb centre. E.g. "Bilpin Fruit Bowl, Farm shop, Opens today 8:00 am, approximate location".
 */
export function pinAccessibilityLabel(
  farm: { name: string; type: VenueType; locationApprox?: boolean },
  statusLabel: string,
): string {
  const parts = [farm.name, PIN_STYLES[farm.type].label, statusLabel];
  return parts.join(', ') + (farm.locationApprox ? ', approximate location' : '');
}
