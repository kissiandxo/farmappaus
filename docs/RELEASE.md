# Release guide (no Mac needed)

Everything below can be done from an iPhone browser plus the Expo and Apple websites. The builds happen on Expo's servers.

## What's already done in the code

- `eas.json` has `preview` and `production` profiles, each tied to an Expo **environment** of the same name.
- `.eas/workflows/preview-update.yml` publishes a preview of the app every time code is pushed to `main` or a `claude/` branch.
- `.eas/workflows/testflight.yml` builds the production iOS app and sends it to TestFlight when you run it.
- `app.json` has the icon, splash, location and photo permission wording, `ITSAppUsesNonExemptEncryption: false`, and `runtimeVersion` set so over-the-air updates only reach compatible builds.
- The app icon and splash are simple placeholders (a seedling). Replace `assets/images/icon.png` (1024×1024, no transparency) and `splash-icon.png` when you have a real logo.

> The workflow files have **not** been checked by Expo's validator yet, because that needs your Expo project to exist. Step 2 fixes that.

## 1. Register the app with Apple (about 10 minutes, in Safari on your iPhone)

The bundle ID is **`au.farmdirect.app`** (already set in `app.json`). Apple doesn't check that you own the domain, but IDs are unique worldwide. If Apple says it is taken, use `au.farmdirect.localfood` instead, tell Claude, and it will change `app.json` to match. **The ID can never be changed once the app exists in App Store Connect.**

App Store Connect's website can't take a build upload (builds only arrive from Xcode, Apple's Transporter app, or an API, which is what Expo uses), so there is nothing to upload by hand. This step creates the two things Apple needs *before* a build can arrive:

1. **Register the ID.** Go to [developer.apple.com/account](https://developer.apple.com/account) → Certificates, Identifiers & Profiles → Identifiers → **+** → App IDs → App. Description: `Farm Direct`. Bundle ID: choose *Explicit* and enter `au.farmdirect.app`. Leave the capabilities as they are, then Register.
2. **Create the app record.** Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → Apps → **+** → New App. Platform iOS. Name `Farm Direct` (if taken, add a few words, for example `Farm Direct Australia`; the name on the home screen comes from the app itself). Primary language English (Australia). Bundle ID: pick `au.farmdirect.app` from the list (it only appears after step 1). SKU: `farmdirect-ios`. Full access.
3. **Create the signing key** (this is step 3 below; do it now while you're signed in): App Store Connect → Users and Access → Integrations → App Store Connect API → **+** → name `Expo`, access **App Manager**. Note the *Key ID* and the *Issuer ID* at the top of the page, and **download the `.p8` file right away** (Apple only lets you download it once; it goes to the Files app).

## 2. Link the project to Expo

1. On [expo.dev](https://expo.dev) create a project named `farm-direct`, and connect the GitHub repository (Project settings → GitHub).
2. Copy the **Project ID**. Then either:
   - ask Claude to add it (it needs `extra.eas.projectId` and `updates.url` = `https://u.expo.dev/<project id>` in `app.json`), or
   - from any computer: `npx eas-cli init` then `npx eas-cli update:configure`.
3. Validate the workflows (ask Claude to run `workflow_validate`, or from a computer `npx eas-cli workflow:validate .eas/workflows/testflight.yml`).

## 3. Let Expo sign the app for you

Apple needs a distribution certificate and provisioning profile. Without a Mac, the easiest way is an **App Store Connect API key**:

1. You created the key in step 1.3 (App Manager role). If you didn't, do it now and download the `.p8` file (you can only download it once).
2. On expo.dev → your project → Credentials → iOS → App Store Connect API key, add it: key ID, issuer ID, and upload the `.p8` from your Files app. Never paste the contents of the `.p8` into a chat or an email.
3. Expo then creates and renews the certificate and profile automatically on the first build.

## 4. Give the app its Supabase keys

Follow `docs/BACKEND.md`, then on expo.dev → Environment variables add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the **preview** and **production** environments (visibility: plain text is fine, the anon key is public by design). Without them the app shows sample data only.

## 5. Preview on your phone while building (Expo Go)

1. Install **Expo Go** from the App Store and sign in with your Expo account.
2. Push to `main` or a `claude/` branch. The *Publish preview update* workflow runs (expo.dev → Workflows).
3. In Expo Go: Projects → Farm Direct → `preview` update.

Expo Go can run this app because every library it uses is bundled with Expo Go. If you ever add a library with its own native code, you'll need a development build instead.

## 6. TestFlight

1. In App Store Connect create the app record (bundle ID from step 1).
2. Run the *Build and send to TestFlight* workflow (expo.dev → Workflows → Run).
3. When processing finishes (usually under 30 minutes), open App Store Connect → TestFlight:
   - fill in **Test Information** (what to test, a contact email, and your privacy policy URL);
   - add yourself under **Internal Testing** (up to 100 people on your App Store Connect team);
   - for friends, family and farmers outside your team, create an **External** group. The first build needs Apple's short Beta App Review.
4. Install **TestFlight** on your iPhone and accept the invite.

## 7. App Store

Use `docs/APP_STORE.md` for the text, privacy answers, screenshots checklist and review notes. Take screenshots on your iPhone from the TestFlight build. Host the privacy policy at a public URL (any simple page works; the text is `docs/PRIVACY.md`). Then App Store Connect → your app version → Add for Review.

## After release

- **Small fixes** (text, layout, logic): publish an over-the-air update to the `production` channel. Users get it next time they open the app, no review needed. Only JavaScript changes can go this way.
- **Anything native** (new library, permission wording, icon) needs a new build and a new App Store submission. Bump `version` in `app.json` when you do, so old builds don't receive updates they can't run.

## Before you tell the public (launch blockers)

- [ ] Real bundle ID chosen and the App Store Connect record created.
- [ ] Supabase project created in the Sydney region, both migrations run, yourself made administrator (`docs/BACKEND.md`).
- [ ] Photo upload tried once on a real phone (it needs the Supabase storage bucket).
- [ ] Postcode data licence confirmed or replaced (`docs/DATA.md`).
- [ ] Privacy policy reviewed by an Australian privacy lawyer and hosted at a public URL (`docs/PRIVACY.md`).
- [ ] Food-safety rules checked with each state regulator, especially eggs thresholds (`docs/COMPLIANCE.md`).
- [ ] At least a pilot region of real, reviewed listings (`docs/REAL_LISTINGS.md`), so the map isn't empty on day one.
- [ ] A support email or page for the App Store "Support URL".
