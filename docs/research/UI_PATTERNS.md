# Farm Direct: UI patterns for sign-in and map

Read-only research. **Opened** = fetched and read. **Snippet** = search result only, unverified.

Coverage: most consumer-app and Australian tourism sites failed to resolve from this session (Too Good To Go, Hipcamp, Airbnb, Open Food Network, App Store, Google Developers, arXiv, Mobbin, NSW and Visit Adelaide Hills/Melbourne). Consumer-app evidence is therefore thin; Apple and Android guidance is the reliable core.

## 1. Sign-in / welcome screen

1. **Delay sign-in; browse first.** Apple advises delaying sign-in and letting people use the app without an account unless core features need one. Its example: a shopping app lets people browse and asks for sign-in at purchase. (Apple HIG, Managing accounts, https://developer.apple.com/design/human-interface-guidelines/managing-accounts.md, **opened**)
2. **One line of benefit before the buttons.** Apple recommends a brief description of what signing in unlocks. (Apple HIG, Sign in with Apple, https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple.md, **opened**)
3. **Sign in with Apple is prominent.** Same size as other sign-in buttons, never below the fold, and only the system titles "Sign in with Apple", "Sign up with Apple" or "Continue with Apple". (Same page, **opened**)
4. **Ask for an account at the moment of value.** Apple's commerce example asks after the transaction. Farm Direct's equivalent is "save this stall" or "get updates". (Same page, **opened**)
5. **Obvious skip on any walkthrough, resumable later.** (Android, Onboarding, https://developer.android.com/design/ui/mobile/guides/patterns/onboarding, **opened**)
6. **Permission priming in context.** Ask for location when the map needs it, with the reason first. (Same Android page, **opened**)

Unverified: ScreensDesign shows Too Good To Go's email-entry screen as a labelled "Email Address" field with the keyboard open (https://screensdesign.com/apps/too-good-to-go-end-food-waste/?vs=100233, **snippet**).

## 2. Map that pins every store

1. **Place card as a sheet over the map.** On iPhone, Apple's full place card is a sheet from the bottom. Offset the map so the selected pin stays visible above it. (Apple HIG, Maps, https://developer.apple.com/design/human-interface-guidelines/maps.md, **opened**)
2. **Compact card when pins are dense.** Keeps surrounding stores in context. (Same page, **opened**)
3. **Clusters that expand on zoom.** One pin with a count, splitting into individual pins as the user zooms. (Same page, **opened**)
4. **Selected pin gets an outline and colour change.** (Same page, **opened**)
5. **Search paired with category filters.** Apple's example is a mall map with store-type filters. (Same page, **opened**)
6. **Muted base map** so content pins stand out. (Same page, **opened**)
7. **Tiered pins.** Airbnb shows priced ovals for top results and smaller unpriced pins for the rest. (arXiv 2407.00091, **snippet**)
8. **Map toggle and "search this area".** Hipcamp's mobile results have a map icon and a separate filter control. (Hipcamp help centre, **snippet**). "Search this area" could not be verified in any app.

## Recommended design for Farm Direct

Targets: Expo SDK 58, `expo-apple-authentication`, `react-native-maps` on Apple Maps.

**Welcome screen**
- Large title "Farm Direct" and one line: "Find farm stalls and markets near you. You contact and visit the farm; no payments in the app."
- Primary-action stack, full width, 44 pt minimum height, in this order:
  1. Sign in with Apple (system button from `expo-apple-authentication`; title "Continue with Apple" for new users).
  2. "Continue with email" (sheet with an email field; choose magic link or one-time code after checking Expo docs).
  3. "Continue without an account" as a text button, last, with subline "Create an account later to save stalls."
- No password field, no forced slides. An optional "How it works" sheet is skippable.
- Nothing behind the map, listings or directions requires sign-in.

**Map screen**
- Large title "Stalls near me", search field, then a horizontal row of capsule chips: Open now, Eggs and dairy, Produce, Honey, Markets, Within 30 km.
- Muted base map. Each category has one colour and one SF Symbol. Clusters use the category colour when they are single-category.
- Tap a pin: outline and colour change, map pans so the pin sits above the sheet, sheet opens at a compact detent (name, category, distance, open/closed). Dragging up reveals hours, phone, address, and "Get directions" and "Call" as the two primary buttons.
- Recentre button bottom-right above the sheet. After the user pans, show a "Search this area" pill; do not search automatically.
- Segmented List/Map control in the navigation bar, defaulting to Map.
- Position any custom card so the Apple logo and legal link stay 10 pt above the card's lowest resting point. (Maps HIG, **opened**)
- Show "Hours not listed" rather than guessing open status.

**Build notes**
- Read the Expo SDK 58 docs for both packages before coding (AGENTS.md requires it). Not done in this session.
- react-native-maps does not cluster on its own; choose a library or a grid approach during build.
- The email and guest paths must work fully offline.

## Australian farm-gate context (snippet only)

State trails (Adelaide Hills, Murray, Scenic Rim, Mornington Peninsula, Chittering WA) publish mostly printed or PDF maps. Search results also mention "The Farm Gate" app and NSW's "Visit My Farm" map. Neither could be opened. The gap is a single searchable map, which supports the map-first design.
