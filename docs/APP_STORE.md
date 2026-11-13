# App Store listing: Farm Direct 1.0 (directory launch)

Text for App Store Connect, in Australian English. Version 1.0.0 is a **free directory with no accounts**: 87 real places from public sources, with list, filters, map, farm pages, saved places and directions. It has no backend. Everything below promises only what this build does. Limits are Apple's; each count is the number of characters in the text as written here.

## Basics

| Field | Text | Count / limit |
|---|---|---|
| Name | Farm Direct (check it is free when you create the record) | 11 / 30 |
| Subtitle | Local farms, stalls & markets | 29 / 30 |
| Category | Food & Drink (primary), Lifestyle (secondary) | |
| Price | Free, no in-app purchases | |
| Copyright | *Owner to supply*, e.g. "2026 Your Name or Company" | |
| Support URL | *Owner to supply* (see the checklist) | |
| Marketing URL | Optional, leave blank | |
| Privacy policy URL | *Owner to supply* (host `docs/PRIVACY.md`) | |

## Promotional text (145 / 170)

Find farmers’ markets, farm shops and farm-gate stalls near you. See them on a map, check opening hours, save your favourites and get directions.

## Keywords (97 / 100)

`farmers market,farm shop,farm gate,local food,fresh produce,eggs,honey,fruit,vegetables,meat,milk`

Comma-separated, no spaces after commas. Words already in the name, subtitle or category are not repeated. There is no "organic" or "free range" here because the places in 1.0 do not carry those labels.

## Description (1612 / 4000)

Farm Direct is a free directory of farmers’ markets, farm shops and farm-gate stalls across Australia. Find good local food near you, check when a place is open, and get there.

The app starts with 87 places in every state and territory, taken from public sources such as each place’s own website and council or tourism pages. Their owners haven’t confirmed the details yet, so the app says so, and shows where each place’s details came from.

• See places on a list, sorted by distance, or on a map with pins
• Use your location, or search any suburb or postcode
• Filter by what you’re after: milk, eggs, chicken, beef, lamb, pork, honey, fruit and vegetables
• Choose how far you’ll travel, or show only places open now
• See opening hours, address, phone and website where a place has published them
• Get driving directions in Apple Maps
• Save the places you like. They stay on your iPhone
• Works without reception: the places are built into the app, so the list and your saved places are always there (maps need a connection)
• Large text that follows your iPhone’s text size setting, with light and dark appearance

No account, no sign-in and no ads. Farm Direct doesn’t collect your information: your location and saved places stay on your iPhone.

Details can change, so check before you travel. See something wrong? Tap “Report a problem” on any place to send us an email.

Run a farm, stall or market? Get in touch from the About tab and we’ll help you claim your listing or add your place.

Farm Direct is a directory only. It doesn’t sell or deliver anything, and there are no payments in the app.

## What's New (1.0)

Welcome to Farm Direct. Find farmers' markets, farm shops and farm-gate stalls near you.

## Age rating

Answer Apple's questionnaire honestly. Expect **4+**.

| Question | Answer |
|---|---|
| Cartoon or fantasy violence, realistic violence, sexual content or nudity, profanity, horror, mature themes | None |
| Alcohol, tobacco or drug references | None |
| Medical or treatment information | None |
| Simulated gambling, contests | None |
| Unrestricted web access | **No.** Place pages link to the place's own website, which opens in the system browser (Safari), not inside the app. |
| User-generated content | **No.** There are no accounts and nobody can post inside the app. |

## App Privacy (the "nutrition label")

**Data Not Collected.** In App Store Connect choose "No, we do not collect data from this app". This matches `docs/PRIVACY.md` and the code: there is no backend, no analytics, no ads and no sign-in, and nothing the person does is sent to us.

| Question | Answer |
|---|---|
| Do you or third parties collect data from this app? | **No** (Data Not Collected) |
| Tracking | **No.** No ads, no analytics, no tracking SDKs |
| Location | Used on the iPhone only, to measure distances, and never sent to us. Not collected |
| Saved places and last location | Stored on the iPhone only. Not collected |
| Contact info | Not collected. Emails people choose to send us are written in their own mail app and are ordinary email, not data collected by the app |
| Apple Maps | Apple's own service, covered by Apple's privacy policy |

Before you submit, check that no build variable turns on a backend: leave `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` empty for 1.0. If a build ever has them set, the accounts version collects data and these answers (and the policy) must change; `docs/PRIVACY.md` already describes that case.

## Notes for App Review

> **No sign-in is needed.** Farm Direct 1.0 is a free directory with no accounts, no payments and no purchases. Everything works from the first launch.
>
> **Where the data comes from:** the 87 places are real farmers' markets, farm shops and farm-gate stalls, researched from public sources (each place's own website, council and tourism pages). They are shown as "Unclaimed" because their owners have not confirmed them, and each place page lists its sources. Nothing is invented. Nobody can post content in the app.
>
> **How to try each feature:**
> 1. First launch shows a short welcome. Tap **Get started**.
> 2. **Explore** tab: list of places sorted by distance. Tap **Filters** to choose produce, distance or "Open now". The location button at the top sets your suburb or postcode.
> 3. **Map** tab: pins for each place. Tap a pin for a card with **Directions**. The location button on the map asks for location permission (optional).
> 4. Tap any place: hours, address, produce, sources, **Directions** (opens Apple Maps), **Call** and **Website** where the place published them, and **Save**.
> 5. **Saved** tab: places you saved. They are stored on the device only.
> 6. **About** tab: what the app is, **Suggest a place**, **Own a farm, stall or market?**, **Contact us** (each opens a pre-filled email), **Privacy policy**, the OpenStreetMap credit and the app version.
>
> **Location:** used only when you tap "Use my current location" or the locate button, to show nearby places. The app works fully without it: you can search any suburb or postcode instead. Location is never sent anywhere.
>
> **Contact:** *[review contact name]*, *[phone]*, *[email]*.

## Screenshots to take

Use the largest iPhone you have (6.9 inch); App Store Connect scales them. Take them from the real 1.0 build, in light mode, with a location set to a suburb that has several places nearby (for example a capital city).

1. Explore: list of nearby places with the suburb at the top
2. Filters open (a produce type selected, distance chosen)
3. Map with pins
4. A place page with its hours, produce and **Directions**
5. A place page showing sources and the "Is this your place?" row
6. Saved places (save two or three first)
7. About tab

Do not show the empty Saved state or any screen with a test location. Every place has no photos, so no screenshot should expect one.

## What you must supply before you submit

- [ ] **Support email.** Set the GitHub repository variable `SUPPORT_EMAIL` (Settings, Secrets and variables, Actions, Variables). The workflow passes it to the app as `EXPO_PUBLIC_SUPPORT_EMAIL`. Without it the app hides "Suggest a place", "Own a farm...", "Contact us", "Report a problem" and "Is this your place?", and the description promises of reporting and claiming would be wrong. Use an address you read daily.
- [ ] **Support URL.** A simple public page with the support email, or a `mailto:` link page. Required by App Store Connect.
- [ ] **Privacy policy URL.** Host `docs/PRIVACY.md` (generated by `npm run build:privacy`) at a public address. Have it reviewed by an Australian privacy lawyer.
- [ ] **App Review contact:** first and last name, phone number (with country code) and email.
- [ ] **Copyright line**, for example "2026 Your Name".
- [ ] App name "Farm Direct" is free in App Store Connect (otherwise choose another and change `name` in `app.json`).
- [ ] Screenshots uploaded, age rating questionnaire answered, App Privacy set to **Data Not Collected**, price set to Free.
- [ ] Export compliance: the app only uses Apple's standard encryption, already declared with `ITSAppUsesNonExemptEncryption: false`.
- [ ] Bundle ID in `app.json` (`au.farmdirect.app`) matches App Store Connect. Version is 1.0.0.
- [ ] Supabase variables are **not** set for this build.
- [ ] Phone check on the TestFlight build: the welcome screen shows "Get started" (no sign-in), the About tab has the three email rows, "Report a problem" opens a pre-filled email, a place with no phone number has no Call button, location denied still lets you search by suburb.

## Review risks to be aware of

- **Guideline 4.2 (minimum functionality).** A directory is acceptable when it is useful and polished. The map, filters, hours-aware "open now", saved places and directions are the answer; lead with them in the review notes and screenshots.
- **Guideline 5.2 / data accuracy.** Listings come from public sources and are labelled "Unclaimed", with sources shown. Be ready to remove a place quickly if its owner asks (email, then rebuild).
- **Email rows rely on the Mail app or another mail client** being set up on the reviewer's device. If none is, tapping shows an alert ("Couldn't open that") rather than doing nothing. Say so in the review notes if you want to be safe.
- **Sign in with Apple** is still declared in `app.json` (`usesAppleSignIn`) but the 1.0 build offers no sign-in. If App Review asks, the answer is that accounts are not part of 1.0.
