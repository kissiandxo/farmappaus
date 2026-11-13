# Release guide (no Mac needed)

Everything below can be done from an iPhone browser plus the Expo and Apple websites. The builds happen on Expo's servers.

## What's already done in the code

- `eas.json` has `preview` and `production` profiles, each tied to an Expo **environment** of the same name.
- `.eas/workflows/preview-update.yml` publishes a preview of the app every time code is pushed to `main` or a `claude/` branch.
- `.eas/workflows/testflight.yml` builds the production iOS app and sends it to TestFlight when you run it.
- `app.json` has the icon, splash, location and photo permission wording, `ITSAppUsesNonExemptEncryption: false`, and `runtimeVersion` set so over-the-air updates only reach compatible builds.
- The app icon and splash are simple placeholders (a seedling). Replace `assets/images/icon.png` (1024×1024, no transparency) and `splash-icon.png` when you have a real logo.

> The workflow files have **not** been checked by Expo's validator yet, because that needs your Expo project to exist. Step 2 fixes that.

## 1. Choose the permanent bundle ID (do this first)

`app.json` currently has the placeholder `ios.bundleIdentifier` = `au.example.farmdirect`. Pick your own reverse-domain ID (for example `au.com.yourname.farmdirect`), change it in `app.json`, and use the **same** ID in App Store Connect. **It can never be changed after the app is created.** Also check "Farm Direct" is available as an app name when you create the record.

## 2. Link the project to Expo

1. On [expo.dev](https://expo.dev) create a project named `farm-direct`, and connect the GitHub repository (Project settings → GitHub).
2. Copy the **Project ID**. Then either:
   - ask Claude to add it (it needs `extra.eas.projectId` and `updates.url` = `https://u.expo.dev/<project id>` in `app.json`), or
   - from any computer: `npx eas-cli init` then `npx eas-cli update:configure`.
3. Validate the workflows (ask Claude to run `workflow_validate`, or from a computer `npx eas-cli workflow:validate .eas/workflows/testflight.yml`).

## 3. Let Expo sign the app for you

Apple needs a distribution certificate and provisioning profile. Without a Mac, the easiest way is an **App Store Connect API key**:

1. App Store Connect → Users and Access → Integrations → App Store Connect API → generate a key with the **App Manager** role. Download the `.p8` file (you can only download it once).
2. On expo.dev → your project → Credentials → iOS, add the key (key ID, issuer ID and the file).
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
