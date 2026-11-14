# Farm Direct – design spec (Apple style)

The app should look and feel like a first-party iOS app (Maps, Settings, App Store, Weather): system type, system colours, large titles, inset grouped lists, SF Symbols, sheets, light and dark mode. Content first, chrome almost invisible. One accent colour.

This replaces the old "earthy, extra-large text" look. Accessibility stays: Dynamic Type must keep working, contrast stays AA, tap targets stay at least 44 pt.

## Rules for every screen

1. **No custom-coloured headers.** Navigation bars are the system ones: large title that collapses on scroll, translucent blur, tint-coloured buttons. No green header bar.
2. **Colour comes from `src/theme.ts` only.** Never write a hex value in a screen or component. Tokens are semantic (`label`, `secondaryLabel`, `groupedBackground`, `cell`, `separator`, `tint`, ...) and adapt to dark mode on iOS by themselves.
3. **Type comes from the `type` scale in `src/theme.ts`** (Apple's text styles: largeTitle 34, title1 28, title2 22, title3 20, headline 17 semibold, body 17, callout 16, subheadline 15, footnote 13, caption 12). No ad-hoc font sizes. Never set `allowFontScaling={false}`. Weights: regular for body, semibold for emphasis, bold only for large titles.
4. **Lists and forms are inset grouped** (like Settings): page background `groupedBackground`, white (`cell`) rounded groups with 16 pt side margins, hairline separators inset to the text, footnote section headers in `secondaryLabel`, optional footnote under a group. Use the `Section` and `Row` primitives; don't hand-roll.
5. **Icons are SF Symbols** through the `Icon` primitive. No emoji or text glyphs (☰ ♥ ✓ ●) as icons.
6. **Buttons** come from the `Button` primitive: `filled` (one per screen at most, the main action), `tinted` (tint at ~15% background, tint text), `plain` (tint text only), plus a `destructive` role. Height 50, radius 14 for full-width; capsule for small ones.
7. **Corners** use `borderCurve: 'continuous'`. Radii: groups/cards 12–16 (20+ for large hero cards/images), small controls 8–10, chips are capsules.
8. **No borders around cards.** Separation comes from the grouped background contrast. Shadows only on things that float over a map or image, and keep them soft.
9. **Spacing** on a 4 pt grid: 16 side margins (20 for large-title alignment), 8–12 inside groups, 20–35 between sections.
10. **Pressed states**: rows highlight with `fill`; buttons drop to ~0.6 opacity. Add light haptics (`expo-haptics`) for toggles such as saving a farm and selection changes; none for plain navigation.
11. **Modals are sheets** (native `formSheet`/`pageSheet` presentation with a grabber, or the RN `Modal` with `presentationStyle="pageSheet"`), with "Done"/"Cancel" in the bar. No full-screen custom overlays.
12. **Status colours**: open = `green`, closed = `secondaryLabel` (not alarming red), warnings = `orange`, destructive = `red`. Sample-data markers use a quiet `orange` tinted capsule, not a yellow block.
13. **Copy** stays plain Australian English. Keep every existing accessibility label, hint and role, and every piece of existing behaviour and data flow. This is a restyle, not a rewrite of logic.
14. **Web and tests must keep working**: iOS-only APIs (`PlatformColor`, SF Symbols, haptics, glass) need a fallback for web and Jest. The theme does this for colours; `Icon` does it for symbols.

## Screen direction

- **Tabs**: Explore (list), Map, Saved, Account, with SF Symbols (`leaf`, `map`, `heart`, `person.crop.circle`). Native iOS tab bar.
- **Explore**: large title "Explore". Under it a compact row: location (pin icon + suburb, tint, opens the location sheet) and a Filters capsule with a count badge. Farm cards: clean white rounded cells, name in headline, distance right-aligned in secondaryLabel, a one-line meta row, open/closed with a small coloured dot, produce as small quiet capsules, heart icon if saved. Tight and scannable like App Store or Maps results.
- **Map**: full-bleed Apple map under a translucent bar; floating capsule controls for location and filters.
- **Farm page**: hero photo edge to edge at the top (or a tasteful placeholder), name as title1, meta row, a row of round action buttons like Apple Maps' place card (Directions, Call, Message, Save), then grouped sections: About, Produce and prices, Hours, Pick-up and payment, Licences, and report/claim as plain rows at the bottom.
- **Saved**: same cards as Explore; an empty state with a large quiet symbol, a title and one line of help.
- **Account, farmer tools, admin, suggest, report, claim**: Settings-style grouped forms. Labels on the left, values/inputs on the right, or stacked for long text; switches are system switches in the tint colour; destructive actions are red plain rows in their own group.
- **Empty and error states**: centred large SF Symbol in tertiaryLabel, title3 title, body line in secondaryLabel, one tinted button.
