# Farm Direct (working name)

An iOS app for Australians to find and buy food directly from local farmers, so more of the money goes to the farmer. Built with Expo (React Native + TypeScript) so it can be developed, tested and shipped to TestFlight without a Mac.

- Plan and milestones: [`docs/PLAN.md`](docs/PLAN.md)
- Food-safety rules and the licence field: [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md)

## Status

**Milestone 2 – location and map.** On top of M1's list and filters (product, distance, "open now", tags), you can now:

- tap **Set my location** → **Use my current location** (GPS, asks permission only when tapped), or search any Australian **suburb or postcode** (works offline, from a bundled list of about 17,800 localities);
- switch between a **List** tab and a **Map** tab (Apple Maps on iPhone, no API key). Pins are green when open and terracotta when closed;
- reopen the app with your last location remembered, even with no reception.

If location permission is denied, the app explains how to turn it on in Settings and offers suburb/postcode search instead. The map is iPhone-only; the browser preview shows a placeholder.

> All listings are **sample data** (invented names, labelled "SAMPLE" in the app). No real farms are shown. See `src/data/sampleFarms.ts`.

## Stack

| Area | Choice |
|---|---|
| App | Expo SDK 58, React Native, TypeScript, Expo Router |
| Build and ship | EAS Build + EAS Submit (TestFlight), EAS Update for previews |
| Backend (from M4) | Supabase (Postgres + PostGIS, Auth, Storage) |
| Tests | Jest (`jest-expo`) |

## Project layout

```
src/app/(tabs)/   List and Map screens (Expo Router)
src/components/   Chip, FilterPanel, FarmCard, FarmMap, location and filter sheets
src/state/        Search state (location, filters, results) and saved location
src/domain/       Pure logic: types, geo, places, hours, filters, compliance, formatting
src/data/         Sample farms and the offline suburb/postcode list
scripts/          build-postcodes.mjs (regenerates the suburb list)
docs/             Plan, compliance notes, data sources and licence caveats
```

Core logic in `src/domain` has no React or network code, so it is fast to test and reusable when the backend arrives.

## Develop

```bash
npm install
npm test            # Jest unit tests
npm run typecheck   # TypeScript
npm start           # Expo dev server (needs a computer or tunnel; see below)
```

Note: `npx expo install` and EAS commands need access to `expo.dev`, `api.expo.dev` and `u.expo.dev`. If `expo install` is unavailable, install with `npm install` using the versions in `package.json` (SDK 58).

## Test on your iPhone (no Mac)

1. Install **Expo Go** from the App Store and sign in with your Expo account.
2. Preview builds are published with EAS Update to a `preview` channel. One-off setup, from a machine with network access to Expo and an access token (`EXPO_TOKEN`, created at expo.dev → Settings → Access tokens):
   ```bash
   npx eas-cli init                 # links the project to your Expo account
   npx expo install expo-updates
   npx eas-cli update:configure
   npx eas-cli update --branch preview --message "M1"
   ```
3. In Expo Go, open the project from the **Projects** tab (or scan the QR/link EAS prints).

## Release to TestFlight (outline, completed in M8)

1. Change `ios.bundleIdentifier` in `app.json` from the placeholder `au.example.farmdirect` to your own reverse-domain ID. It cannot be changed after the app is created in App Store Connect.
2. Create the app record in App Store Connect with that bundle ID.
3. `npx eas-cli build --platform ios --profile production` (EAS manages signing with your Apple Developer account).
4. `npx eas-cli submit --platform ios --latest` to send the build to TestFlight.
5. Add testers in App Store Connect → TestFlight.

## Design notes

- Earthy palette, 18 pt base text that scales with the iPhone text-size setting, 52 pt minimum tap targets.
- Open/closed is always written in words as well as colour.
- Australian English, AUD, kilometres, all states and territories.
- No in-app payments in v1.
