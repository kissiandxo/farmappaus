# Farm Direct (working name)

An iOS app for Australians to find and buy food directly from the people who produce it, so more of the money goes to the farmer. It lists farmers’ markets, farm shops, farm-gate stalls, farms and independent butchers. Butchers are retail shops, not producers, so the app makes no claim about where their meat comes from or how the animals were raised. Built with Expo (React Native + TypeScript), so it can be developed, tested and shipped to TestFlight without a Mac.

**Version 1.0.0 (the App Store release) is a free directory with no backend and no accounts.** It bundles **151 real places from public sources** in every state and territory (67 farmers’ markets, 45 butchers, 26 farm shops, 8 farms, 5 farm-gate stalls), all marked “Unclaimed”. 86 of them list beef, lamb, pork or chicken: 45 butchers, 25 farmers’ markets and 16 farm shops, farms or farm-gate stalls. The 45 independent butcher shops are listed as shops (see `docs/REAL_LISTINGS.md`). Shoppers can:

- search by name, town, postcode or produce;
- filter by type of place (including Butchers), produce (with a **Meat** shortcut for beef, lamb, pork and chicken), distance, and **when** they can go (any time, open now, or this weekend, with this weekend’s published times on each place);
- use their location or any suburb or postcode, and see places on a list or a clustered map;
- open a place page with hours, address, sources, directions in Apple Maps, **Share**, and up to three **Nearby** places;
- keep **Saved** places on the phone, and remove one with a long press.

There are no sample farms in the app (they are used by tests only), no in-app payments and no over-the-air updates. The accounts, farmer tools and review queue described below are built but switched off in 1.0: they only appear when Supabase keys are set, which the release workflow refuses.

## Documents

| Read this | For |
|---|---|
| [`docs/RELEASE.md`](docs/RELEASE.md) | **Start here.** Step by step: Apple setup, repository secrets, TestFlight build (GitHub Actions and fastlane), screenshots, launch checklist |
| [`docs/BACKEND.md`](docs/BACKEND.md) | Connecting Supabase, becoming the administrator, how reviews work |
| [`docs/REAL_LISTINGS.md`](docs/REAL_LISTINGS.md) | How the 151 bundled places were researched and built, and the plan for more |
| [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) | Direct-sale food-safety rules (raw milk, eggs, meat) and the licence field |
| [`docs/APP_STORE.md`](docs/APP_STORE.md) | App Store text, privacy answers, review notes, screenshot list |
| [`docs/PRIVACY.md`](docs/PRIVACY.md) | Draft privacy policy (same text as in the app) |
| [`docs/DATA.md`](docs/DATA.md) | Data sources and licence caveats |
| [`docs/PLAN.md`](docs/PLAN.md) | Original plan and milestones, and what 1.0 ships |
| [`docs/POLISH_PLAN.md`](docs/POLISH_PLAN.md) | The 1.0 polish build: features, fixes, deferred items and results |

## What’s built

| Milestone | What you get |
|---|---|
| 1. Browse | List of places sorted by distance; filters for product, distance, open now, tags; open/closed worked out in each farm’s own time zone |
| 2. Location and map | “Use my location” or search any suburb/postcode (works offline, about 17,800 localities); List and Map tabs (Apple Maps); last location remembered |
| 3. Profiles and favourites | Photos, story, products and AUD prices with stock, hours, pick-up/delivery, payment types, licences, call, website, Apple Maps directions; saved places |
| 4. Backend and accounts | Supabase database with row-level security; email/password accounts; favourites that follow your account; in-app account deletion; listings cached on the phone for patchy reception |
| 5. Farmer tools | Free farmer account; listing editor (big +/− time steppers, products, licences, photos); drafts and send for review; quick stock and price updates; claim an existing listing |
| 6. Suggestions and review | Suggest a place (farm, stall, shop, market or butcher); report a listing; reviewer queue to approve, ask for changes or reject; licence checks; claim approval; food-safety rules enforced in the database |
| 7. Polish | “Saved listings” notice when offline; 20-second load timeout; “not updated for a while” warnings (90 days); friendly error screen; in-app privacy policy; colour contrast checked automatically (WCAG AA, main text AAA) |
| 8. Release | App icon and splash; GitHub Actions TestFlight and screenshot workflows (fastlane); release guide, App Store text and privacy answers; real-listings plan |
| 9. 1.0 polish | Search; type-of-place, Meat and When (open now, this weekend) filters; Share; Nearby; clustered map with place card; honest location prompt; compact opening hours; Saved that never loses a save; OTA updates off |

With no Supabase keys (the 1.0 configuration) the app runs as the free directory described above, with no accounts: the last tab becomes “About”, and suggestions, reports and claims are pre-filled emails to `EXPO_PUBLIC_SUPPORT_EMAIL` (hidden when it is not set). No farms are invented.

## What has and hasn’t been checked

Checked automatically (`npm test`: 28 suites, 471 tests; `npm run typecheck`; `npm run test:sql`): all the app’s logic (distance, opening hours, filters including Meat and This weekend, search, share text, nearby places, map clustering, saved-place storage, the screenshot tour, food-safety rules, validation, data mapping, offline cache, contrast, the privacy policy text), and the whole database design in a real Postgres engine. The web export builds.

Checked by looking at the web export at iPhone width (SF Symbols and native bars do not render on the web): Explore, Map, Saved, About, place pages, privacy and welcome.

**Not yet checked, because it needs your accounts or a real phone:**

- Running on a real iPhone: GPS, Apple Maps pins and clustering, the native tab bar and search bar, SF Symbols, the share sheet, long-press menus, VoiceOver and large text. See “Not checked on a device” in `docs/POLISH_PLAN.md`.
- Everything that talks to Supabase (sign-in, loading live listings, saving listings, uploading photos, the review screens). The rules behind them are tested; the screens themselves need a connected project.
- The GitHub Actions TestFlight and screenshot workflows run on GitHub’s Mac runners; their YAML is checked here, but only a run on GitHub proves them.
- The photo storage rules (`supabase/migrations/0002_storage.sql`), which only exist on Supabase.

## Stack

| Area | Choice |
|---|---|
| App | Expo SDK 58, React Native, TypeScript, Expo Router |
| Build and ship | GitHub Actions Mac runners and fastlane to TestFlight (`.github/workflows/testflight.yml`); simulator screenshots (`.github/workflows/screenshots.yml`). No EAS workflows; OTA updates off |
| Backend | Supabase (Postgres, Auth, Storage), Sydney region |
| Maps and location | Apple Maps (`react-native-maps`), `expo-location` |
| Tests | Jest (`jest-expo`) for app logic; PGlite (Postgres in Node) for the database |

## Project layout

```
src/app/            Screens (Expo Router): tabs, farm profile, farmer, claim, report, suggest, admin, privacy
src/components/     Cards, filters, map, form pieces, editors, review panel
src/state/          Search, favourites and account state
src/domain/         Pure logic with no React or network code (the best-tested part)
src/data/           The 151 bundled places (realListings.json, built by scripts/build-real-listings.mjs), offline postcode list, database mapping; sample farms for tests only
src/content/        Privacy policy text
supabase/migrations Database tables, security rules, review workflow, photo storage
scripts/            Real-listings builder, postcode list builder, privacy doc builder, database tests
.github/workflows/  TestFlight and App Store screenshot workflows
docs/               Guides and plans (see above)
```

## Develop

```bash
npm install
npm test             # app logic tests
npm run test:sql     # database design and security rules, in a local Postgres
npm run typecheck
npm run build:privacy   # regenerate docs/PRIVACY.md after editing src/content/privacy.ts
node scripts/build-real-listings.mjs   # rebuild src/data/realListings.json from docs/research/listings/
npm start            # Expo dev server (needs a computer; from an iPhone use the workflows instead)
```

Copy `.env.example` to `.env` to connect Supabase locally (see `docs/BACKEND.md`). `npx expo install` and the EAS command line need access to `expo.dev` and `api.expo.dev`. Without that, install packages with `npm install` using the SDK 58 versions already in `package.json`.

## Try it on your iPhone

Follow `docs/RELEASE.md`: run the *TestFlight (GitHub Mac build)* workflow (or push a commit whose message contains `[testflight]`), then install the build from TestFlight. There are no Expo Go previews for 1.0.

## Design notes

- Apple-native look (`docs/DESIGN.md`): system type and colours, large titles, inset grouped lists, SF Symbols, light and dark mode; Dynamic Type keeps working, contrast AA, tap targets at least 44 pt, open/closed always in words as well as colour.
- Australian English, AUD, kilometres, all states and territories.
- Fast on patchy reception: in 1.0 the places are built into the app and your last location is saved on the phone (maps need a connection). The accounts version caches listings, gives up loads after 20 seconds and shrinks photos before upload.
- Food safety first: for farmer-entered listings (accounts version), milk must be pasteurised and milk, eggs and meat need licence details before a listing can go live (rules in `docs/COMPLIANCE.md`, enforced in the app and the database). The 1.0 unclaimed places list these products as advertised, and the place page says licences have not been checked.
