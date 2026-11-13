# Farm Direct (working name)

An iOS app for Australians to find and buy food directly from local farmers, so more of the money goes to the farmer. Built with Expo (React Native + TypeScript), so it can be developed, tested and shipped to TestFlight without a Mac.

Buyers find farms, farm-gate stalls, farm shops and farmers’ markets near them (GPS or suburb/postcode), filter by product, distance, “open now” and tags like free-range or organic, read profiles with prices and hours, and get in touch or get directions. Farmers sign up free, list their farm and keep stock up to date. Every listing is reviewed before it goes live. There are no in-app payments: you pay the farmer directly.

## Documents

| Read this | For |
|---|---|
| [`docs/RELEASE.md`](docs/RELEASE.md) | **Start here.** Step by step: Expo project, signing, preview on your phone, TestFlight, launch checklist |
| [`docs/BACKEND.md`](docs/BACKEND.md) | Connecting Supabase, becoming the administrator, how reviews work |
| [`docs/REAL_LISTINGS.md`](docs/REAL_LISTINGS.md) | Plan for getting real farms onto the map |
| [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) | Direct-sale food-safety rules (raw milk, eggs, meat) and the licence field |
| [`docs/APP_STORE.md`](docs/APP_STORE.md) | App Store text, privacy answers, review notes, screenshot list |
| [`docs/PRIVACY.md`](docs/PRIVACY.md) | Draft privacy policy (same text as in the app) |
| [`docs/DATA.md`](docs/DATA.md) | Data sources and licence caveats |
| [`docs/PLAN.md`](docs/PLAN.md) | Original plan and milestones |

## What’s built

| Milestone | What you get |
|---|---|
| 1. Browse | List of places sorted by distance; filters for product, distance, open now, tags; open/closed worked out in each farm’s own time zone |
| 2. Location and map | “Use my location” or search any suburb/postcode (works offline, about 17,800 localities); List and Map tabs (Apple Maps); last location remembered |
| 3. Profiles and favourites | Photos, story, products and AUD prices with stock, hours, pick-up/delivery, payment types, licences, call, website, Apple Maps directions; saved places |
| 4. Backend and accounts | Supabase database with row-level security; email/password accounts; favourites that follow your account; in-app account deletion; listings cached on the phone for patchy reception |
| 5. Farmer tools | Free farmer account; listing editor (big +/− time steppers, products, licences, photos); drafts and send for review; quick stock and price updates; claim an existing listing |
| 6. Suggestions and review | Suggest a farm; report a listing; reviewer queue to approve, ask for changes or reject; licence checks; claim approval; food-safety rules enforced in the database |
| 7. Polish | “Saved listings” notice when offline; 20-second load timeout; “not updated for a while” warnings (90 days); friendly error screen; in-app privacy policy; colour contrast checked automatically (WCAG AA, main text AAA) |
| 8. Release | App icon and splash; EAS preview and TestFlight workflows; release guide, App Store text and privacy answers; real-listings plan |

With no Supabase keys the app runs as a free directory of **55 real places from public sources** (all marked “Unclaimed”), with no accounts: the last tab becomes “About”, and suggestions, reports and claims are pre-filled emails to `EXPO_PUBLIC_SUPPORT_EMAIL`. No farms are invented.

## What has and hasn’t been checked

Checked automatically (`npm test`, `npm run test:sql`, `npm run typecheck`): all the app’s logic (distance, opening hours, filters, search, food-safety rules, validation, data mapping, offline cache, contrast), and the whole database design in a real Postgres engine (who can see and change what, the review workflow, raw-milk and licence rules, claims, suggestions, account deletion). The iOS and web bundles build.

Checked by looking at it in a phone-sized browser: the list, filters, location search, profiles, favourites, and the hours, product and licence editors.

**Not yet checked, because it needs your accounts or a real phone:**

- Running on a real iPhone (GPS, Apple Maps, the camera and photo picker).
- Everything that talks to Supabase (sign-in, loading live listings, saving listings, uploading photos, the review screens). The rules behind them are tested; the screens themselves need a connected project.
- The Expo workflows (they can only be validated once your Expo project exists) and the TestFlight build.
- The photo storage rules (`supabase/migrations/0002_storage.sql`), which only exist on Supabase.

## Stack

| Area | Choice |
|---|---|
| App | Expo SDK 58, React Native, TypeScript, Expo Router |
| Build and ship | EAS Build, EAS Update (previews) and TestFlight, via the workflows in `.eas/workflows/` |
| Backend | Supabase (Postgres, Auth, Storage), Sydney region |
| Maps and location | Apple Maps (`react-native-maps`), `expo-location` |
| Tests | Jest (`jest-expo`) for app logic; PGlite (Postgres in Node) for the database |

## Project layout

```
src/app/            Screens (Expo Router): tabs, farm profile, farmer, claim, report, suggest, admin, privacy
src/components/     Cards, filters, map, form pieces, editors, review panel
src/state/          Search, favourites and account state
src/domain/         Pure logic with no React or network code (the best-tested part)
src/data/           Sample farms, offline postcode list, database mapping, reads and writes
src/content/        Privacy policy text
supabase/migrations Database tables, security rules, review workflow, photo storage
scripts/            Postcode list builder, privacy doc builder, database tests
.eas/workflows/     Preview-update and TestFlight workflows
docs/               Guides and plans (see above)
```

## Develop

```bash
npm install
npm test             # app logic tests
npm run test:sql     # database design and security rules, in a local Postgres
npm run typecheck
npm run build:privacy   # regenerate docs/PRIVACY.md after editing src/content/privacy.ts
npm start            # Expo dev server (needs a computer; from an iPhone use the workflows instead)
```

Copy `.env.example` to `.env` to connect Supabase locally (see `docs/BACKEND.md`). `npx expo install` and the EAS command line need access to `expo.dev` and `api.expo.dev`. Without that, install packages with `npm install` using the SDK 58 versions already in `package.json`.

## Try it on your iPhone

1. Install **Expo Go** from the App Store and sign in with your Expo account.
2. Follow `docs/RELEASE.md` steps 1–2 once (link the Expo project), then push to `main` or a `claude/` branch. The *Publish preview update* workflow publishes the app; open it in Expo Go under Projects → Farm Direct.

## Design notes

- Earthy palette, 18 pt base text that scales with the iPhone text-size setting, 52 pt minimum tap targets, open/closed always in words as well as colour.
- Australian English, AUD, kilometres, all states and territories.
- Fast on patchy reception: listings and your last location are saved on the phone, loads give up after 20 seconds, photos are shrunk before upload.
- Food safety first: milk must be pasteurised; milk, eggs and meat need licence details before a listing can go live (rules in `docs/COMPLIANCE.md`, enforced in the app and the database).
