# App Store listing: Farm Direct 1.0 (directory launch)

Text for App Store Connect, in Australian English. Version 1.0.0 is a **free directory with optional iPhone profiles and no backend**: 151 real places from public sources, with search, filters (type of place, produce including a Meat shortcut, distance, and when you can go), a map, place pages with Share and Nearby, saved places and directions. Everything below promises only what this build does. Limits are Apple's; each count is the number of characters in the text as written here (curly apostrophes count as one).

**The place counts used below** (from `src/data/realListings.json`, built 13 Nov 2026): 151 places in all eight states and territories (67 farmers' markets, 45 butchers, 26 farm shops, 8 farms, 5 farm-gate stalls). 86 list beef, lamb, pork or chicken; 45 of those are butchers and 41 are not (25 farmers' markets, 12 farm shops, 3 farms, 1 farm-gate stall). If the listings are rebuilt, recount and update every number here, including the character counts (`docs/REAL_LISTINGS.md` shows how).

**Butchers.** The 45 butchers are independent shops with a public address, hours and named meats on their own or an official page (no supermarket butcheries, online-only or wholesale-only businesses, or chains of five or more). They are retail shops, not producers: the copy never says where their meat comes from, that it is local, or how the animals were raised, and not every place in the app is a producer.

## Basics

| Field | Text | Count / limit |
|---|---|---|
| Name | Farm Direct | 11 / 30 |
| Subtitle | Farm shops, markets & butchers | 30 / 30 |
| Category | Food & Drink (primary), Lifestyle (secondary) | |
| Price | Free, no in-app purchases | |
| Copyright | 2026 Phoenix Jennings | |
| Support URL | Public support page in this repository (docs/SUPPORT.md) | |
| Marketing URL | Optional, leave blank | |
| Privacy policy URL | Public privacy policy in this repository (docs/PRIVACY-1.0.md) | |

## Promotional text (154 / 170)

Find independent butchers, farm shops and farmers’ markets across Australia. Search for beef, lamb or fresh fruit, check weekend hours and get directions.

## Keywords (90 / 100)

`farmers market,farm shop,farm gate,butcher,meat,beef,lamb,pork,eggs,honey,fruit,vegetables`

Comma-separated, no spaces after commas. There is no "organic", "free range" or "grass fed" here because the places carry no such labels in the app (some descriptions mention them, but the app has no tag data for unclaimed places), and none of them would be true of the butcher shops.

## Description (1363 / 4000)

Looking for a butcher for Saturday’s barbecue, a farm shop on the drive home or a farmers’ market near you? Farm Direct helps you find a place, check its published hours and get directions.

Browse 151 places across Australia, including 67 farmers’ markets, 45 independent butchers, 26 farm shops, 8 farms and 5 farm-gate stalls. Start with your suburb or postcode, or let your iPhone find nearby places.

• Search for fruit, vegetables or eggs. The Meat shortcut finds 86 places that list beef, lamb, pork or chicken.
• Use Open now or This weekend to see which places list hours that fit your plans.
• Open a place to see its address, hours, website and phone number where available. Call ahead if you’re after a particular cut or something in season.
• Get directions in Apple Maps, share a stop with a friend or find another place nearby.
• Save favourites on your iPhone. Your list and the directory work offline. Viewing maps needs a connection.

Explore as a guest or continue with Apple to create a profile on this iPhone. A short, skippable tour shows you how to choose your area and filter the directory.

Listing details come from public sources linked on each place page. Owners haven’t confirmed them yet, and opening times and availability can change. Use “Report a problem” to suggest a correction, or contact us from About to add or claim a place.

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
| User-generated content | **No.** Shoppers can create a local Apple profile. Nobody can post inside the app. |

## App Privacy (the "nutrition label")

**Data Not Collected.** In App Store Connect choose "No, we do not collect data from this app". This matches `docs/PRIVACY.md` and the code: there is no backend, analytics or advertising SDK; optional Apple profiles stay on the device, and nothing the person does is sent to us.

| Question | Answer |
|---|---|
| Do you or third parties collect data from this app? | **No** (Data Not Collected) |
| Tracking | **No.** No ads, no analytics, no tracking SDKs |
| Location | Used for distances and optional area lookup through Apple, never sent to Farm Direct. Not collected |
| Saved places, last location and whether the location prompt was dismissed | Stored on the iPhone only. Not collected |
| Search text and filters | Kept in memory on the iPhone only, never stored or sent. Not collected |
| Contact info | Not collected. Emails people choose to send us are written in their own mail app and are ordinary email, not data collected by the app |
| Sharing a place | Uses the iOS share sheet; the person chooses where it goes. Nothing is sent to us |
| Apple Maps | Apple's own service, covered by Apple's privacy policy |

Before you submit, check that no build variable turns on a backend: leave `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` empty for 1.0 (the TestFlight workflow refuses them unless run by hand with **with_backend**). If a build ever has them set, the accounts version collects data and these answers (and the policy) must change; `docs/PRIVACY.md` already describes that case.

## Notes for App Review

> **Sign-in is optional.** Guests have full access. Continue with Apple creates a removable on-device profile. There are no payments or purchases. Everything works from the first launch.
>
> **Reviewers outside Australia:** the app starts at Sydney NSW 2000. Tap the location at the top and search e.g. "Brisbane 4000", "Perth 6000" or "Hobart 7000".
>
> **Where the data comes from:** the 151 places are real farmers' markets, farm shops, farms, farm-gate stalls and independent butcher shops, researched from public sources (each place's own website, council and tourism pages). Butchers are listed as retail shops; the app makes no claim about where their meat comes from. They are shown as "Unclaimed" because their owners have not confirmed them, and each place page lists its sources. Nothing is invented. Nobody can post content in the app.
>
> **How to try each feature:**
> 1. First launch shows a short welcome. Tap **Explore as a guest** or **Continue with Apple**. A skippable 24-second tour highlights the location pin and Filters. Replay from About.
> 2. **Explore** tab: places sorted by distance. Type in the search bar (name, town, postcode or produce, e.g. "lamb" or "Tasmania"). Tap **Filters** for the type of place, produce (the **Meat** button selects beef, lamb, pork and chicken), distance, and **When**: Any time, Open now or This weekend (each place then shows this weekend's times). The location at the top sets your suburb or postcode.
> 3. **Map** tab: pins for each place, grouped when zoomed out (tap a group to zoom in). Tap a pin for a card with **Directions**, **Share** and **Save**. The locate button asks for location permission (optional).
> 4. Tap any place: hours, address, produce, sources, **Directions** (opens Apple Maps), **Call** and **Website** where the place published them, **Save**, **Share** (top right), and up to three **Nearby** places within 60 km.
> 5. **Saved** tab: places you saved, stored on the device only. Touch and hold a place to remove it, get directions or share it.
> 6. **About** tab: what the app is, **Suggest a place**, **Contact us**, **List or claim your place** (each opens a pre-filled email), **Privacy policy**, the OpenStreetMap credit and the app version.
>
> **Location:** used only when you tap "Use my current location" in the location sheet, or the locate button on the map, and only while the app is in use, to show nearby places. The app works fully without it: you can search any suburb or postcode instead. Distances are calculated on the device. If no nearby suburb is found offline, Apple’s geocoding service can receive coordinates to identify the area.
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

## Launch record

- Farm Direct uses bundle ID `au.farmdirect.app`. The signed release pipeline uses Apple’s distribution certificate and the Sign in with Apple capability.
- The release identifies Phoenix Jennings as the operator and uses support@visera.vision for listing corrections and support. The public support page and privacy policy are hosted in this repository. Copyright is 2026 Phoenix Jennings.
- App Review contact details are held privately in App Store Connect. The release script restores the existing Visera contact if the review record is empty.
- Farm Direct is free in the Australian storefront and uses automatic release after Apple approves it. Version 1.0 uses the bundled directory and standard Apple encryption.
- Publish **Data Not Collected** under **App Privacy** in App Store Connect. Apple checks for a published questionnaire when a version is added to review.
- The signed iPhone build uses the backend-free configuration. GeoNames and OpenStreetMap credits are in the app.

- [ ] Phone check on the TestFlight build (see "Not checked on a device" in `docs/POLISH_PLAN.md`): the welcome offers Continue with Apple and Explore as a guest; search, the Meat button and This weekend filter the list; the map pins, groups and place card work; Share opens the share sheet; the About tab has the three email rows; "Report a problem" opens a pre-filled email; a place with no phone number has no Call button; with location denied you can still search by suburb.

## Review risks to be aware of

- **Guideline 4.2 (minimum functionality).** A directory is acceptable when it is useful and polished. Search, the filters (including This weekend and Meat), the map, hours-aware "Open now", Nearby, Share, saved places and directions are the answer; lead with them in the review notes and screenshots.
- **Guideline 5.2 / data accuracy.** Listings come from public sources and are labelled "Unclaimed", with sources shown. Be ready to remove a place quickly if its owner asks (fix the research, rebuild, submit a new build: there are no over-the-air updates in 1.0).
- **Email rows rely on a mail app** being set up on the reviewer's device. If none is set up, tapping an email row shows an alert with the address and a Share address button, rather than doing nothing.
- Optional Apple profiles are created and removed on-device. Guest access includes every directory feature.
- **Meat, eggs and milk are listed as advertised by each place.** The place page says licences have not been checked for unclaimed places. The app sells nothing.
