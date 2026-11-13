# Farm Direct – code review and next build plan

Reviewed 13 Nov 2026 after the first TestFlight upload. `npx tsc --noEmit`: clean. `npx jest`: 14 suites, 174 tests pass. Lint not run. Nothing here was checked on a phone; items marked *(verify)* are read from library source, not observed.

Checked and fine: `PlatformColor`/`DynamicColorIOS` are accepted by expo-symbols `tintColor`, NativeTabs `tintColor`, Switch `trackColor`, `placeholderTextColor` and `ActivityIndicator`. Map `pinColor` correctly uses hex strings.

## 1. Bugs and device risks

1. **No way to open a farm from the map.** Markers only have `title`/`description`, no press handler (`src/components/FarmMap.tsx:47-55`).
2. **Nav bar titles are green.** `headerTintColor` also colours the title (`src/app/_layout.tsx:56`, `(explore)|(saved)|(account)/_layout.tsx:14`). Delete it; the theme `primary` already tints the back button.
3. **Back button on the farm page will read "(tabs)"** on iOS 18 and earlier *(verify)*: the previous screen has no title (`src/app/_layout.tsx:62`). Add `title: 'Back'` there or `headerBackButtonDisplayMode: 'minimal'` at `src/app/farm/[id].tsx:121`.
4. **Keyboard covers inputs.** No screen uses `automaticallyAdjustKeyboardInsets` or `KeyboardAvoidingView`: `farmer/[id].tsx:147`, `farmer/stock/[id].tsx:107`, `suggest.tsx:93`, `report/[id].tsx:70`, `claim/[id].tsx:77`, `account.tsx:121`, `LocationModal.tsx:77` (search results hidden), `farm/[id].tsx:119` (admin review note).
5. **Farm page hero** (`farm/[id].tsx:119-141`): transparent header with a tint back button and status bar straight over the photo (poor contrast before iOS 26), content scrolls under the status bar with no blur, and every sample farm shows a 240 pt grey "No photos yet" box.
6. **"Open now" goes stale.** `results` is computed with `new Date()` only when filters, location or data change (`src/state/SearchContext.tsx:145-148`). Add a minute tick or refresh on app foreground.
7. **Map re-centres on every filter or location change**, discarding the user's pan (`FarmMap.tsx:26-28`); it frames only the nearest 8 (`:21-24`).
8. **Map chrome:** no `mapPadding`, so the Apple Maps logo and Legal link sit under the floating tab bar (`FarmMap.tsx:31-38`); capsules are 36 pt high with no hitSlop (`map.tsx:74`).
9. **Dark mode:** capsule `shadowColor: colors.label` gives a white glow (`map.tsx:82`); the search-area pin is black (`FarmMap.tsx:44`).
10. **Filters sheet footer** has no bottom safe-area inset, so the button sits on the home indicator (`FiltersModal.tsx:37-42`). Sheets have no grabber (DESIGN rule 11).
11. **Unhandled rejections** from `Linking.openURL` (`farm/[id].tsx:198-202`).
12. **Lists:** inline `ItemSeparatorComponent` remounts each render (`(explore)/index.tsx:51`, `saved.tsx:29`); `FarmCard` is not memoised and calls `new Date()` per card (`FarmCard.tsx:76`). Fine at 16 listings, not at thousands.
13. **Empty "Produce and prices" group** when a listing has no products (`farm/[id].tsx:222-233`).

## 2. Design consistency (docs/DESIGN.md)

- **Account looks unfinished:** "It isn't connected in this version of the app" (`account.tsx:21-35`). Fixed by feature (a).
- **Two form styles:** stacked `Field` on a filled input (`FormBits.tsx:40`; `farmer/[id].tsx:162-230`, `suggest.tsx:94-127`) versus Settings-style label-left rows (`account.tsx:133-164`). DESIGN asks for the latter.
- **Duplicate primitives:** two `Notice`s (`DataBanner.tsx:21`, `FormBits.tsx:145`), legacy `Card`/`Btn` (`FormBits.tsx:12`, `:101`), count badge copied in `LocationBar.tsx:81-90` and `map.tsx:91-100`.
- **More than one filled button per screen:** `admin/index.tsx:107,135,171`, `farmer/[id].tsx:246-250`.
- **Sample noise:** an orange badge on every card plus the banner (`FarmCard.tsx:35`).
- **Farm page:** four identical tint tiles; Apple Maps makes Directions the filled primary (`farm/[id].tsx:197-214`). `type.title1` is weight 400, so the name looks thin (`theme.ts:163`).
- **Literals:** `color="white"` (`ui/Row.tsx:64`); radii 12/14/7 (`LocationModal.tsx:132`, `PhotosEditor.tsx:124`, `ui/Row.tsx:113`); spacing 6/10/12/14 (`ui/Badge.tsx:36`, `Chip.tsx:38`, `LocationBar.tsx:68-76`, `map.tsx:77`).
- **Dead code:** deprecated tokens are unused (`theme.ts:133-157`, `174-181`, `197-198`).
- **Copy:** Saved says tap "Save this place" but the button says "Save" (`saved.tsx:41`). Section headers are forced uppercase (`ui/Section.tsx:29`).

## 3. Build plan

### a) Welcome and sign-in

**Decisions**
- Shown on first launch only, remembered in AsyncStorage `farmdirect.welcome.v1`; reopened from Account ("Sign in").
- **Apple, backend not configured:** store a local profile `{ appleUserId, givenName, familyName, email }` in `farmdirect.appleProfile.v1`. Apple sends name and email only the first time, so merge and never overwrite with null. Do not store the identity token. Account shows the name, "Stored on this iPhone" and "Remove from this iPhone". On launch call `getCredentialStateAsync(user)` and clear the profile if revoked.
- **Apple, backend configured:** `signInAsync({ requestedScopes, nonce: sha256(raw) })` then `supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce: raw })`, and save the name to user metadata. An existing local profile is linked by a user-tapped "Finish setting up your account" row; it cannot be silent.
- **Email button appears only when `available` is true.** A dead "coming soon" button looks unfinished and risks App Review 2.1. This differs from the brief; say if you want it visible anyway.
- "Continue without an account" marks the flag and dismisses.

**API (read from the expo-apple-authentication 58.0.3 tarball; not installed):** `isAvailableAsync`, `signInAsync`, `getCredentialStateAsync`, `AppleAuthenticationButton` (`buttonType`, `buttonStyle` WHITE/BLACK, `cornerRadius`), `AppleAuthenticationScope.FULL_NAME|EMAIL`. The credential has `user`, `fullName`, `email`, `identityToken`. Its config plugin adds the `com.apple.developer.applesignin` entitlement.

**Files**
- New: `src/app/(auth)/_layout.tsx`, `(auth)/welcome.tsx`, `(auth)/email.tsx`, `src/components/auth/EmailForm.tsx` (moved from `account.tsx:120-189`), `src/components/auth/FeatureRow.tsx`, `src/domain/onboarding.ts`.
- Change: `src/state/AuthContext.tsx` (`localProfile`, `appleAvailable`, `signInWithApple`, `removeLocalProfile`, `welcomeSeen`, `markWelcomeSeen`), `src/app/_layout.tsx` (register `(auth)` as `fullScreenModal`; hold the splash until the flag loads, then push once; items 1.2 and 1.3), `account.tsx`, `app.json` (`ios.usesAppleSignIn: true`, the plugin, version 0.2.0), `package.json` via `npx expo install expo-apple-authentication expo-crypto`, `src/content/privacy.ts`, `docs/BACKEND.md` (Apple provider: enable it and add `au.farmdirect.app` as a client ID).

**Screen:** app icon, bold large title, one-line tagline, three feature rows, then pinned at the bottom: Apple button (50 pt, radius 14, black in light, white in dark), "Continue with email" (tinted), "Continue without an account" (plain), privacy footnote. Scrollable for Dynamic Type; hide the Apple button on web and Jest.

**Tests** (`src/domain/__tests__/onboarding.test.ts`): `shouldShowWelcome`, `mergeAppleProfile`, `parseLocalProfile` rejecting bad JSON, `displayName`.

**Risks:** needs a new native build and the App ID capability, not an OTA update. `runtimeVersion` follows the app version, hence the bump. Account deletion with Apple will later need token revocation on the server.

### b) Map with every store

**Decisions**
- Pins for all listings that pass the product, tag and open-now filters. The distance filter is ignored on the map; the Filters capsule shows "12 of 16".
- **Clustering:** a small grid helper in `src/domain`, recomputed on `onRegionChangeComplete`. react-native-maps 1.29 has none built in. Tapping a cluster zooms to its bounds.
- Initial region: fit all pins when no location has been chosen, otherwise the user plus the nearest 8. Never auto-refit after the user pans.
- Custom child-view markers, 30 pt circle with an SF Symbol: farm `leaf.fill` green, stall `basket.fill` orange, shop `bag.fill` blue, market `tent.fill` purple. Closed is dimmed, selected is larger. No `title`, so no callout.
- Tap a pin for a bottom card: name, type and suburb, open status, distance, Directions (filled), View (tinted), heart, close. Tapping the map closes it.
- Buttons: locate me, fit all, and "Search this area" after a pan, which sets the shared location to the map centre.

**Supported in the installed library:** Marker children, `image`, `onPress`, `onSelect`, `tracksViewChanges`; MapView `mapPadding`, `fitToCoordinates`, `animateToRegion`, `onRegionChangeComplete`, `userInterfaceStyle`. Apple Maps stays the provider.

**Files**
- New: `src/domain/mapCluster.ts` (`clusterPins`, `clusterRegion`, `hasMovedFar`), `src/domain/mapPins.ts`, `src/components/map/PlacePin.tsx`, `ClusterPin.tsx`, `MapPlaceCard.tsx`, `MapButtons.tsx`, `src/lib/locate.ts` (GPS flow lifted from `LocationModal.tsx:35-68`).
- Change: `FarmMap.tsx`, `FarmMap.web.tsx` (same props), `(map)/map.tsx`, `LocationModal.tsx` (use `locate.ts`; keyboard insets), `SearchContext.tsx` (minute tick, item 1.6), `theme.ts` (blue and purple pin tokens; delete deprecated tokens).

**Tests:** `mapCluster.test.ts` (empty, single, merge by zoom, counts sum, bounds contain members, deterministic) and `mapPins.test.ts` (every `VenueType` mapped).

**Risks:** symbol rendering inside markers; marker press also firing the map's `onPress`; bottom inset under the floating native tab bar. All need a phone.

### Work packages (no shared files)

| | Scope | Model |
|---|---|---|
| **A** | Feature (a), plus 1.2 and 1.3 in the root layout | Strong: native module, navigation gating, auth state |
| **B** | Feature (b), plus 1.1, 1.6 to 1.9 and the theme cleanup | Strong: native map behaviour and clustering |
| **C** | Polish in files A and B do not touch: tab `_layout.tsx` files, `farm/[id].tsx`, `farmer/**`, `suggest.tsx`, `report`, `claim`, `FiltersModal.tsx`, `FarmCard.tsx`, Explore, Saved | Cheap: mechanical edits |

Each package ends with tsc, jest and `npx expo lint`, and reads the SDK 58 docs first (AGENTS.md).

## 4. Fixes to bundle

- **A:** green titles and "(tabs)" back label in the root layout.
- **B:** stale open status, map re-centring, `mapPadding`, 44 pt capsules, dark-mode shadow and pin, LocationModal keyboard.
- **C:** remove `headerTintColor` from the three tab layouts; `automaticallyAdjustKeyboardInsets` and `keyboardDismissMode="interactive"` on the form ScrollViews (1.4); Filters footer safe area; farm page (minimal back button, opaque header with no hero when there are no photos, filled Directions, try/catch on `openURL`, hide empty produce); memoise `FarmCard`, hoist separators, shrink the sample badge to "Sample"; fix the Saved copy.
