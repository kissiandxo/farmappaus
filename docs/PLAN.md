# Farm Direct (working name) – Plan

An iOS app for Australians to find and buy food directly from local farmers.
No in-app payments in v1: the app connects people, the sale happens at the farm gate, stall, market or by phone/message.

## Decisions (agreed)

| Area | Choice |
|---|---|
| App | Expo (React Native + TypeScript), Expo Router |
| Build/ship | Originally EAS Build/Submit/Update. **Changed for 1.0:** GitHub Actions Mac runners and fastlane build and upload to TestFlight (`.github/workflows/testflight.yml`), a second workflow takes simulator screenshots, there are no EAS workflows and over-the-air updates are off (`updates.enabled: false`) |
| Backend | Supabase (Postgres, Auth, Storage), Sydney region. Plain lat/lng instead of PostGIS for v1: distances are computed on the phone, which the offline cache needs anyway. PostGIS can be added later (see `docs/BACKEND.md`). |
| Maps | Apple Maps via `react-native-maps` (no API key) |
| Offline | TanStack Query persisted cache + last-viewed farms stored on device |
| Tests | Jest for core logic (distance, open-now, filters, validation, postcode lookup) |
| Moderation | In-app admin screen (admin role) with pending queue |
| Claim checks | Manual review: ABN + phone + note, compared by an admin |
| Apple account | Paid Developer account available |

> **Status:** all eight milestones are built, and the 1.0 polish build is done (`docs/POLISH_PLAN.md`). See the README for what is built and what still needs your accounts or a real phone to check, and `docs/RELEASE.md` for the steps to launch.

## What 1.0 ships (App Store release)

Version 1.0.0 is a **free directory with no backend and no accounts**, a cut-down of the milestones below:

- **No sample data.** 151 real places from public sources (67 farmers' markets, 45 butchers, 26 farm shops, 8 farms, 5 farm-gate stalls) in every state and territory, all marked "Unclaimed", each with its sources. 86 list beef, lamb, pork or chicken: 45 butchers, 25 farmers' markets and 16 farm shops, farms or farm-gate stalls. Butchers are listed as retail shops, with no claim about where their meat comes from. Built by `scripts/build-real-listings.mjs` (see `docs/REAL_LISTINGS.md`). Sample farms remain for tests only.
- **Features:** search (name, town, postcode, produce); filters for type of place, produce with a Meat shortcut, distance, and when you can go (any time, open now, this weekend); a clustered map with a place card; place pages with hours, directions, Share and Nearby; Saved on the phone; an honest location prompt instead of silent Sydney distances; suggestions, reports and claims as pre-filled emails to the support address.
- **Off in 1.0:** accounts, farmer tools, the review queue (M4 to M6) and over-the-air updates. They appear only with Supabase keys, which the TestFlight workflow refuses unless run by hand with `with_backend`.
- **One release pipeline:** GitHub Actions and fastlane (see the table above). The two EAS workflows were deleted.

## Milestones

Each milestone ends with a commit, passing tests, and a "how to test on your phone" note.

1. **M1 – Foundation and browse list (offline sample data).** Expo project, earthy large-text design system, shared types, sample farms (clearly labelled), list screen, product/distance/open-now/tag filters, core logic with tests. Works with no backend.
2. **M2 – Location and map.** GPS permission flow, suburb/postcode search (bundled AU postcode lookup), map with pins and list/map toggle, distance in km.
3. **M3 – Farm profile and favourites.** Photos, story, products and prices (AUD), hours, pick-up/delivery, payment types, contact, directions in Apple Maps, licence badges, saved farms (on device, synced after sign-in in M4).
4. **M4 – Supabase backend and accounts.** Schema, PostGIS "near me" function, row-level security, Sign in with Apple and email, real data replaces sample data, offline cache kept.
5. **M5 – Farmer tools.** Free farmer sign-up, create or claim a listing, edit profile/hours, in-stock toggles and prices, licence/accreditation fields, photo upload.
6. **M6 – Suggestions and moderation.** Users suggest a farm; claims and suggestions land in a pending queue; admin screen to approve, reject or request changes; nothing goes live unreviewed.
7. **M7 – Polish for regional use.** Accessibility pass (Dynamic Type, contrast, tap targets), slow-network behaviour, image caching, empty/error states, privacy and delete-account flow.
8. **M8 – Release.** EAS profiles, app icons/splash, privacy policy, App Store metadata, TestFlight upload, tester instructions, real-listings rollout plan.

## Rules we follow

- Australian English, AUD, kilometres, all eight states and territories.
- No real farms are invented. Sample data is for tests only and never appears in the app; the real places come only from the research files in `docs/research/listings/`.
- Direct-sale food-safety rules vary by state. See `COMPLIANCE.md` for what listings must show.
- No payments, no cart. Contact and directions only.

## Getting real listings (outline, detailed in M8)

1. Seed from public sources only where licensing allows (e.g. state farmers' market directories, council market lists) – as *suggestions* for review, never auto-published, and with the source recorded.
2. Invite farmers directly: a claim link per listing, a one-page flyer with QR code for farm gates and markets.
3. Partner with farmers' market associations and regional produce groups to onboard stallholders in batches.
4. Launch in one or two regions first so the map is not empty, then expand.
5. Every live listing carries a "last updated" date; stale ones are flagged and asked to confirm.
