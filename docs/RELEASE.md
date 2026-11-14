# Release guide

Farm Direct 1.0 is a free directory with no accounts and no backend. It is built, signed and sent to TestFlight by **GitHub's Mac runners and fastlane**. That is the only release pipeline: there are no Expo (EAS) workflows and no over-the-air updates. You don't need a Mac or an Expo account.

- `.github/workflows/testflight.yml` builds the app, signs it and uploads it to TestFlight (`fastlane/Fastfile`, lane `ios beta`).
- `.github/workflows/screenshots.yml` builds the app for the iPhone simulator and takes the App Store screenshots.
- `app.json` holds the icon, splash, permission wording, `ITSAppUsesNonExemptEncryption: false` and `"updates": { "enabled": false }`.

## Every change is a new build

Over-the-air updates are **off** in 1.0 (`updates.enabled` is `false` in `app.json`; the `expo-updates` package stays installed but does nothing). A text fix, a listing correction or a code change all reach people the same way: a new TestFlight build, then a new App Store submission. There is no way to change an installed build remotely.

The build number is the GitHub run number (`BUILD_NUMBER: ${{ github.run_number }}` in the workflow), so each run uploads a higher number. When you release a new version to the App Store, raise `version` in `app.json` and `package.json` as well.

## 1. Register the app with Apple (once)

The bundle ID is **`au.farmdirect.app`** (set in `app.json`). It can never be changed once the app exists in App Store Connect.

1. **Register the ID.** [developer.apple.com/account](https://developer.apple.com/account) → Certificates, Identifiers & Profiles → Identifiers → **+** → App IDs → App. Description `Farm Direct`, Bundle ID *Explicit* `au.farmdirect.app`. Turn on the **Sign in with Apple** capability: `app.json` declares it (`usesAppleSignIn`) in every build, and signing fails if the App ID doesn't have it. The 1.0 app never shows sign-in.
2. **Create the app record.** [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → Apps → **+** → New App. Platform iOS, name `Farm Direct`, primary language English (Australia), bundle ID `au.farmdirect.app`, SKU `farmdirect-ios`.
3. **Create the API key.** App Store Connect → Users and Access → Integrations → App Store Connect API → **+**, access **App Manager**. Download the `.p8` file straight away (Apple allows one download). The key ID and issuer ID used by the workflow are written in `testflight.yml`; if you make a new key, update them there.

## 2. Repository secrets and variables

GitHub → the repository → Settings → Secrets and variables → Actions.

| Name | Kind | Needed | What it is |
| --- | --- | --- | --- |
| `ASC_KEY_P8` | Secret | **Required.** The build stops without it. | The full text of the `.p8` key from step 1.3, or base64 of it. Never paste it into a chat or an email. |
| `SUPPORT_EMAIL` | Variable | **Required before App Store submission.** | The contact address shown on the About tab and in the privacy policy. |
| `OPERATOR_NAME` | Variable | **Required before App Store submission.** | The person or business that runs Farm Direct, shown in the privacy policy's "Who we are". |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Secrets | **Never set these for 1.0.** | They switch on the accounts version (see below). |

If `SUPPORT_EMAIL` or `OPERATOR_NAME` is missing, the workflow still builds but shows a warning on the run. **A build made without `SUPPORT_EMAIL` must not be submitted to the App Store**: it has no contact address, which App Review and the privacy policy both need. Set the variables and run a new build first. Builds made without `OPERATOR_NAME` shouldn't be submitted either, because the privacy policy then doesn't say who runs the app.

## 3. Build for TestFlight

Run GitHub → Actions → *TestFlight (GitHub Mac build)* → **Run workflow**, or push a commit to `main` or a `claude/` branch whose message contains `[testflight]`.

Before building, the workflow checks that:

- `ASC_KEY_P8` is set (the build stops if not);
- screenshot mode (`EXPO_PUBLIC_SCREENSHOT_MODE`) is off (the build stops if not: that mode is only for the simulator);
- the Supabase secrets are **not** set, unless you ran it by hand with **with_backend** ticked (the build stops if not, because an accounts build doesn't match the 1.0 App Store listing or privacy answers);
- `SUPPORT_EMAIL` and `OPERATOR_NAME` are set (warning only).

It uses the newest released (not beta or release candidate) Xcode on the runner. If no released Xcode 26 or newer is installed, it falls back to the newest one available and shows a warning.

When processing finishes (usually under 30 minutes), open App Store Connect → TestFlight: fill in **Test Information**, add yourself under **Internal Testing**, and for testers outside your team create an **External** group (the first build needs Apple's short Beta App Review). Install **TestFlight** on your iPhone and accept the invite.

## 4. Screenshots

Run GitHub → Actions → *App Store screenshots (simulator)* → **Run workflow**, or push a commit whose message contains `[screenshots]`. It builds a simulator-only copy of the app in screenshot mode (which skips the welcome and pre-saves a few places), takes seven shots on a 6.9-inch iPhone simulator (`01-explore`, `02-explore-meat`, `03-map`, `04-place-meat`, `05-place-market`, `06-saved`, `07-explore-dark`; see `docs/APP_STORE.md`) and uploads them as the `app-store-screenshots` artifact on the run. The app moves to the next scene each time the workflow switches the simulator's appearance to dark and back to light (no timers, because the CI simulator is slow); the scenes are `SCREENSHOT_SCENES` in `src/config.ts`, and a test keeps them in step with the workflow. Each simulator command has a time limit, and one failed shot doesn't stop the others. If a tick is lost, later shots show the wrong scene: look at every image before uploading. Screenshot mode must never be used for a TestFlight build; the TestFlight workflow refuses it.

## 5. App Store

Use `docs/APP_STORE.md` for the text, privacy answers, screenshots checklist and review notes. Host the privacy policy at a public URL (the text is `docs/PRIVACY.md`; regenerate it with `npm run build:privacy` and the `SUPPORT_EMAIL` / `OPERATOR_NAME` values set). Then App Store Connect → your app version → choose the build → Add for Review.

## The accounts version (later, not 1.0)

The accounts version (sign-in, farmer listings, photos) is a **separate, later binary**. It is built with the Supabase secrets set (`docs/BACKEND.md`) and by running the TestFlight workflow by hand with **with_backend** ticked. It needs its own App Store listing text and privacy answers, because it collects data that 1.0 does not.

The camera, photo-library and Sign in with Apple settings are already in `app.json` for every build (the libraries are linked into the binary either way, and App Store Connect rejects an upload whose linked frameworks lack a usage description), so nothing in the config has to change for that build. Sign in with Apple must be enabled on the App ID (step 1.1) before any build is signed.

## Before you submit 1.0

- [ ] `SUPPORT_EMAIL` and `OPERATOR_NAME` set, and the build you submit was made after they were set (check the run shows no warnings).
- [ ] The Supabase secrets are **not** set.
- [ ] Privacy policy reviewed and hosted at a public URL (`docs/PRIVACY.md`), and its address entered in App Store Connect.
- [ ] Postcode data licence confirmed or replaced (`docs/DATA.md`).
- [ ] Listings checked against `docs/REAL_LISTINGS.md`.
- [ ] The support address or page entered as the App Store "Support URL".
