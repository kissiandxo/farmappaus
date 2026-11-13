# Farm Direct (working name)

An iOS app for Australians to find and buy food directly from local farmers, so more of the money goes to the farmer. Built with Expo (React Native + TypeScript) so it can be developed, tested and shipped to TestFlight without a Mac.

- Plan and milestones: [`docs/PLAN.md`](docs/PLAN.md)
- Food-safety rules and the licence field: [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md)

## Status

**Milestone 1 – browse list with sample data (offline).** The app shows a list of sample farms, farm-gate stalls, farm shops and farmers' markets, sorted by distance, with filters for product, distance, "open now" and tags (free-range, grass-fed, organic, pasture-raised, spray-free). Distances are measured from a state capital you pick; real GPS and postcode search arrive in M2.

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
src/app/          Screens (Expo Router)
src/components/   Chip, FilterPanel, FarmCard
src/domain/       Pure logic: types, geo, hours, filters, compliance, formatting
src/data/         Sample farms and stand-in start points
docs/             Plan and compliance notes
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
