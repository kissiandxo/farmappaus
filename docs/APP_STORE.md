# App Store listing: Farm Direct 1.0 (directory launch)

Text for App Store Connect, in Australian English. Version 1.0.0 is a **free directory with no accounts and no backend**: 151 real places from public sources, with search, filters (type of place, produce including a Meat shortcut, distance, and when you can go), a map, place pages with Share and Nearby, saved places and directions. Everything below promises only what this build does. Limits are Apple's; each count is the number of characters in the text as written here (curly apostrophes count as one).

**The place counts used below** (from `src/data/realListings.json`, built 13 Nov 2026): 151 places in all eight states and territories (67 farmers' markets, 45 butchers, 26 farm shops, 8 farms, 5 farm-gate stalls). 86 list beef, lamb, pork or chicken; 45 of those are butchers and 41 are not (25 farmers' markets, 12 farm shops, 3 farms, 1 farm-gate stall). If the listings are rebuilt, recount and update every number here, including the character counts (`docs/REAL_LISTINGS.md` shows how).

**Butchers.** The 45 butchers are independent shops with a public address, hours and named meats on their own or an official page (no supermarket butcheries, online-only or wholesale-only businesses, or chains of five or more). They are retail shops, not producers: the copy never says where their meat comes from, that it is local, or how the animals were raised, and not every place in the app is a producer.

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

## Promotional text (167 / 170)

Find farmers’ markets, farm shops, farm-gate stalls, farms and independent butchers near you, including 86 places that list meat. Check the hours, then get directions.

## Keywords (90 / 100)

`farmers market,farm shop,farm gate,butcher,meat,beef,lamb,pork,eggs,honey,fruit,vegetables`

Comma-separated, no spaces after commas. There is no "organic", "free range" or "grass fed" here because the places carry no such labels in the app (some descriptions mention them, but the app has no tag data for unclaimed places), and none of them would be true of the butcher shops.

## Description (2219 / 4000)

Farm Direct is a free directory of farmers’ markets, farm shops, farms, farm-gate stalls and independent butchers across Australia. Find good food near you, check when a place is open, and get there.

The app starts with 151 real places in every state and territory: 67 farmers’ markets, 26 farm shops, 8 farms, 5 farm-gate stalls and 45 independent butcher shops. 86 of them list beef, lamb, pork or chicken. Butchers are listed as shops: the app doesn’t say where their meat comes from. The details come from public sources such as each place’s own website and council or tourism pages. The owners haven’t confirmed them yet, so the app says so and shows where each place’s details came from.

• Search by name, town, postcode or produce
• Filter by type of place: farmers’ markets, farm shops, farm-gate stalls, farms or butchers
• Filter by what’s sold: milk, eggs, chicken, beef, lamb, pork, honey, fruit or vegetables, with one Meat button for beef, lamb, pork and chicken
• Choose when you can go: any time, open now, or this weekend, with this weekend’s published times on each place
• Choose how far you’ll travel, and see places on a list sorted by distance or on a map
• Use your location, or search any suburb or postcode
• See opening hours, address, phone and website where a place has published them
• Get directions in Apple Maps, and share a place with a friend
• See up to three other places nearby on each place page
• Save the places you like. They stay on your iPhone
• Works without reception: the places are built into the app, so the list and your saved places are always there (maps need a connection)
• Large text that follows your iPhone’s text size setting, with light and dark appearance

No account, no sign-in and no ads. Farm Direct doesn’t collect your information: your location and saved places stay on your iPhone.

Details can change, so check before you travel. See something wrong? Tap “Report a problem” on any place to send us an email.

Run a farm, stall, market or butcher shop? Get in touch from the About tab and we’ll help you claim your listing or add your place.

Farm Direct is a directory only. It doesn’t sell or deliver anything, and there are no payments in the app.

The "Report a problem" and "Get in touch" sentences are only true when the build has a support email (`SUPPORT_EMAIL`, see the checklist). Never submit a build without one.

## What's New (1.0) (169 / 4000)

Welcome to Farm Direct. Find farmers’ markets, farm shops, farm-gate stalls, farms and independent butchers near you, including 86 that list beef, lamb, pork or chicken.

## Age rating

Answer Apple's questionnaire honestly. Expect **4+**.

| Question | Answer |
|---|---|
| Cartoon or fantasy violence, realistic violence, sexual content or nudity, profanity, horror, mature themes | None |
| Alcohol, tobacco or drug references | None. Some places' descriptions or "also sold" text mention wine or cider made there; this is a factual product mention, not promotion. If you want to be careful, answer "Infrequent/Mild" for alcohol references |
| Medical or treatment information | None |
| Simulated gambling, contests | None |
| Unrestricted web access | **No.** Place pages link to the place's own website and its sources, which open in the system browser (Safari), not inside the app. |
| User-generated content | **No.** There are no accounts and nobody can post inside the app. |

## App Privacy (the "nutrition label")

**Data Not Collected.** In App Store Connect choose "No, we do not collect data from this app". This matches `docs/PRIVACY.md` and the code: there is no backend, no analytics, no ads and no sign-in, and nothing the person does is sent to us.

| Question | Answer |
|---|---|
| Do you or third parties collect data from this app? | **No** (Data Not Collected) |
| Tracking | **No.** No ads, no analytics, no tracking SDKs |
| Location | Used on the iPhone only, to measure distances, and never sent to us. Not collected |
| Saved places, last location and whether the location prompt was dismissed | Stored on the iPhone only. Not collected |
| Search text and filters | Kept in memory on the iPhone only, never stored or sent. Not collected |
| Contact info | Not collected. Emails people choose to send us are written in their own mail app and are ordinary email, not data collected by the app |
| Sharing a place | Uses the iOS share sheet; the person chooses where it goes. Nothing is sent to us |
| Apple Maps | Apple's own service, covered by Apple's privacy policy |

Before you submit, check that no build variable turns on a backend: leave `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` empty for 1.0 (the TestFlight workflow refuses them unless run by hand with **with_backend**). If a build ever has them set, the accounts version collects data and these answers (and the policy) must change; `docs/PRIVACY.md` already describes that case.

## Notes for App Review

> **No sign-in is needed.** Farm Direct 1.0 is a free directory with no accounts, no payments and no purchases. Everything works from the first launch.
>
> **Reviewers outside Australia:** the app starts at Sydney NSW 2000. Tap the location at the top and search e.g. "Brisbane 4000", "Perth 6000" or "Hobart 7000".
>
> **Where the data comes from:** the 151 places are real farmers' markets, farm shops, farms, farm-gate stalls and independent butcher shops, researched from public sources (each place's own website, council and tourism pages). Butchers are listed as retail shops; the app makes no claim about where their meat comes from. They are shown as "Unclaimed" because their owners have not confirmed them, and each place page lists its sources. Nothing is invented. Nobody can post content in the app.
>
> **How to try each feature:**
> 1. First launch shows a short welcome. Tap **Use my location** (optional; asks for location permission), **Choose a suburb**, or **Not now**. No sign-in.
> 2. **Explore** tab: places sorted by distance. Type in the search bar (name, town, postcode or produce, e.g. "lamb" or "Tasmania"). Tap **Filters** for the type of place, produce (the **Meat** button selects beef, lamb, pork and chicken), distance, and **When**: Any time, Open now or This weekend (each place then shows this weekend's times). The location at the top sets your suburb or postcode.
> 3. **Map** tab: pins for each place, grouped when zoomed out (tap a group to zoom in). Tap a pin for a card with **Directions**, **Share** and **Save**. The locate button asks for location permission (optional).
> 4. Tap any place: hours, address, produce, sources, **Directions** (opens Apple Maps), **Call** and **Website** where the place published them, **Save**, **Share** (top right), and up to three **Nearby** places within 60 km.
> 5. **Saved** tab: places you saved, stored on the device only. Touch and hold a place to remove it, get directions or share it.
> 6. **About** tab: what the app is, **Suggest a place**, **Contact us**, **List or claim your place** (each opens a pre-filled email), **Privacy policy**, the OpenStreetMap credit and the app version.
>
> **Location:** used only when you tap "Use my location" on the welcome screen, "Use my current location" in the location sheet, or the locate button on the map, and only while the app is in use, to show nearby places. The app works fully without it: you can search any suburb or postcode instead. Location is never sent anywhere.
>
> **Email rows** open the Mail app (or another mail app). If none is set up, the app shows the address with a Share button instead.
>
> **Contact:** *[review contact name]*, *[phone]*, *[email]*.

## Screenshots

`.github/workflows/screenshots.yml` takes these on a 6.9-inch iPhone simulator from a screenshot-mode build (location set to Sydney NSW 2000, welcome skipped, three places pre-saved). App Store Connect scales them for smaller iPhones. The scene list lives in `SCREENSHOT_SCENES` in `src/config.ts`; a test keeps it and the workflow in step.

| File | Scene |
|---|---|
| `01-explore` | Explore, location set, no filters |
| `02-explore-meat` | Explore with the Meat filter on (beef, lamb, pork and chicken) |
| `03-place-meat` | Torello Farm (Dromana VIC): a farm shop selling its own grass-fed beef and lamb, open 7 days |
| `04-place-market` | Barossa Farmers Market (Angaston SA): a weekly Saturday market listing chicken and lamb |
| `05-saved` | Saved, with Torello Farm, Barossa Farmers Market and Beerenberg Farm |
| `06-map` | Map with pins |
| `07-map-dark` | The same map in dark appearance |

Look at every image before you upload it. Every place has no photos, so no screenshot should expect one. Do not upload a screenshot that shows a contact row unless the build had the real support email.

## What you must supply before you submit

- [ ] **Support email.** Set the GitHub repository variable `SUPPORT_EMAIL` (Settings, Secrets and variables, Actions, Variables). The workflow passes it to the app as `EXPO_PUBLIC_SUPPORT_EMAIL`. Without it the build still runs (with a warning), but the app hides "Suggest a place", "Contact us", "List or claim your place", "Report a problem" and "Is this your place?", and the description above would be wrong. Use an address you read daily. **Do not submit a build made without it.**
- [ ] **Operator name.** Set the repository variable `OPERATOR_NAME` (your legal name or business name; add the ABN if you have one) so the privacy policy says who runs the app.
- [ ] **Support URL.** A simple public page with the support email. Required by App Store Connect.
- [ ] **Privacy policy URL.** Host `docs/PRIVACY.md` (regenerate it with `npm run build:privacy` and the two variables set) at a public address. Have it reviewed by an Australian privacy lawyer.
- [ ] **App Review contact:** first and last name, phone number (with country code) and email.
- [ ] **Copyright line**, for example "2026 Your Name".
- [ ] **Postcode data licence.** Check the licence of the bundled suburb and postcode list (`docs/DATA.md`) allows use in a published app, and add any credit it requires.
- [ ] **App ID.** `au.farmdirect.app` is registered with the Sign in with Apple capability (see `docs/RELEASE.md`), and the app name "Farm Direct" is free in App Store Connect (otherwise choose another and change `name` in `app.json`).
- [ ] Screenshots uploaded, age rating questionnaire answered, App Privacy set to **Data Not Collected**, price set to Free.
- [ ] Export compliance: the app only uses Apple's standard encryption, already declared with `ITSAppUsesNonExemptEncryption: false`.
- [ ] Version is 1.0.0 in `app.json` and `package.json`.
- [ ] Supabase variables are **not** set for this build.
- [ ] Phone check on the TestFlight build (see "Not checked on a device" in `docs/POLISH_PLAN.md`): the welcome shows Use my location / Choose a suburb / Not now (no sign-in); search, the Meat button and This weekend filter the list; the map pins, groups and place card work; Share opens the share sheet; the About tab has the three email rows; "Report a problem" opens a pre-filled email; a place with no phone number has no Call button; with location denied you can still search by suburb.

## Review risks to be aware of

- **Guideline 4.2 (minimum functionality).** A directory is acceptable when it is useful and polished. Search, the filters (including This weekend and Meat), the map, hours-aware "Open now", Nearby, Share, saved places and directions are the answer; lead with them in the review notes and screenshots.
- **Guideline 5.2 / data accuracy.** Listings come from public sources and are labelled "Unclaimed", with sources shown. Be ready to remove a place quickly if its owner asks (fix the research, rebuild, submit a new build: there are no over-the-air updates in 1.0).
- **Email rows rely on a mail app** being set up on the reviewer's device. If none is set up, tapping an email row shows an alert with the address and a Share address button, rather than doing nothing.
- **Sign in with Apple** is still declared in `app.json` (`usesAppleSignIn`) but the 1.0 build offers no sign-in. If App Review asks, the answer is that accounts are not part of 1.0.
- **Meat, eggs and milk are listed as advertised by each place.** The place page says licences have not been checked for unclaimed places. The app sells nothing.
