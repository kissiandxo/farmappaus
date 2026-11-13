# Getting real listings

The app ships with clearly labelled **sample** farms and no real ones. A map with nothing on it is the biggest risk to launch, so this is the plan for filling it, honestly and legally.

## Principles

1. **Farmers own their listings.** We never publish a farm's details as if they had written them. Anything we find ourselves starts as a *suggestion* and only goes live after a farmer claims it, or after we have checked it ourselves.
2. **No fake farms, no fake reviews, no copied photos or stories.** Facts only: name, locality, what they sell, contact details the business has published itself.
3. **Check every source's terms.** Don't scrape websites or Facebook pages without permission. Use public directories where the terms allow it, or ask the owner.
4. **Be careful with contact details.** Many farmers are sole traders, so phone numbers and names can be personal information under the Privacy Act. Spam Act 2003: no unsolicited marketing emails or SMS without consent. Phone, post, in-person visits and replies to people who contacted us are fine.
5. **Food-safety first.** No product that needs a licence (milk, eggs, meat) goes live without licence details. See `docs/COMPLIANCE.md`.

## What is loaded (app version 0.3.0)

When no backend is configured, the app shows **87 real places** from public sources instead of sample farms (62 farmers' markets, 15 farm shops, 5 farm-gate stalls, 5 farms; two research passes), across every state and territory. They were researched by hand on 13 Nov 2026 from each place's own site, council pages and tourism pages. When Supabase **is** configured, behaviour is unchanged: the app shows only reviewed live listings from the database.

| Step | File |
|---|---|
| Research (57 entries plus unverified leads, with sources and caveats) | `docs/research/listings/{nsw-act,vic-tas,qld-nt,sa-wa}.json` |
| Geocoding script | `scripts/build-real-listings.mjs` |
| Geocode cache (every Nominatim answer, including "no result") | `docs/research/listings/geocode-cache.json` |
| Built records (research plus `lat`, `lng`, `locationPrecision`) | `src/data/realListings.json` |
| Mapper to `Farm[]` (`REAL_FARMS`) | `src/data/realFarms.ts` |

### The unclaimed rule

Every place loaded this way is `unclaimed`: public facts only, no owner has confirmed it. In the app:

- It carries an **Unclaimed** badge, and the farm page opens with "From public sources. Not yet confirmed by the owner."
- It lists its **sources** as tappable rows, and a prominent "Claim this listing / Is this your place?" row. (With no backend the row opens a pre-filled email to the support address instead, and is hidden when the build has none.)
- **Milk, eggs and meat are listed as advertised** (owner's decision, 13 Nov 2026, so the product filters work). No licence is recorded for unclaimed places, and the farm page says the licences have not been checked. This relaxes the rule in `docs/COMPLIANCE.md` for unclaimed public-source listings only; farmer-entered listings still need licence details. Other categories become unpriced products named by their label. Free-text "also sold" wording from the source is shown as written, as a footer under produce.
- No prices, photos, payment types, tags, licences or stories beyond the one research sentence. Phone numbers are only those the research recorded, and personal numbers were already left out.
- **Hours are never invented.** A day with no published times is dropped and the wording goes in the note. Monthly, seasonal, fortnightly and unpublished-times places are flagged `irregular`, so the status reads "Check dates" (never "Open now" or "opens Saturday") and the note is shown.
- **Location precision:** 25 pins sit on a geocoded street address or venue; 30 are the suburb centre only (the farm page says "Approximate location"). Directions use the street address when there is one.

### Excluded

| Entry | Reason |
|---|---|
| Mulgowie Farmers Market (QLD) | A single dated event (5 Dec 2026), recurrence unconfirmed, so not a recurring place |
| Baudin's Macadamias (WA) | Seasonal stall; the research says the season may already be ending and asks to confirm before listing; no published hours |

### Rerun it

```bash
node scripts/build-real-listings.mjs
```

Reads the four research files and rewrites `src/data/realListings.json`. It geocodes with Nominatim at no more than one request per second and caches every answer, so a rerun with unchanged research makes no requests. To add or fix a place, edit the research JSON (keep `sources` and `caveats`) and rerun; to drop one, add it to `EXCLUDE` in the script with a reason. Uses `curl` when `HTTPS_PROXY` is set, because Node's `fetch` ignores the proxy.

### Doubtful or unconfirmed details (read the `caveats` in the research files)

- Many postcodes were added from general knowledge, not the source page.
- Conflicting or inferred hours: Kiama (summer and winter times differ), Newcastle City (weekly pattern inferred), Hill & Ridge (times from a search snippet), Green Shed Market (sources give 7-11am or 7am-noon).
- Rapid Creek Markets: the site still shows an old 2020 "suspended" banner; NT tourism confirms the hours.
- Farm Club Australia is mainly a cafe and bakery, and Maleny Dairies MilkBar is a factory outlet, not a farm-gate sale.
- Jan Powers Eagle Farm is described as new in 2026; check it is still running.

### Unverified leads still in the research files

42 more leads are recorded under `unverified` in the same files and are **not** loaded: Bega Produce Market, Mudgee Farmers' Market, Lismore, Moruya (SAGE), Arden Farm Produce, Riverview Produce, three NSW orchards that are closed or short of fruit this season (Shields, Pine Crest, Huntley Berry Farm), Ballarat, Bendigo, Daylesford, South Geelong and Collingwood Children's Farm markets, Burnie, Devonport, Deloraine and Salamanca markets, Huon Valley roadside stalls, Strawberry Fields, Maleny Cheese, Gallo Dairyland, Crazy Acres, Parap and Palmerston markets (NT, dry season), and others. Each has a `why` and a `leadUrl`. Confirm with the operator or their own page, move the entry into `listings`, and rerun the script.

## Step 1: pick a pilot region (week 0)

Start in one or two regions so the map feels full, then expand. Choose where the density is highest: lots of farm gates and weekly farmers' markets within an hour of a town of 20,000+ people. Candidate *types* of place: peri-urban food belts near a capital city, and regional tourist food trails (for example the Hawkesbury, Southern Highlands, Yarra Valley, Macedon Ranges, Adelaide Hills, Scenic Rim, Sunshine Coast hinterland, Margaret River, Huon Valley and Tamar Valley areas). Pick the one where you already know people.

## Step 2: build the first list of places (weeks 1–2)

Sources, roughly best to worst:

| Source | Notes |
|---|---|
| People you know | Fastest and best. Ask them to claim their own listing |
| Farmers' market operators and associations | Ask for their stallholder list and permission to invite them. Offer to put the market itself on the map first |
| Council market and visitor pages, regional tourism and food-trail groups | Public facts only. Ask before reusing text or photos |
| State farm-gate or direct-sales guides and local produce directories | Check each one's terms |
| Driving around and photographing farm-gate signs and honesty-box stalls | Genuine, local and legal. Note the place and what's sold; the farmer adds the rest |
| Community groups | Ask the group admin; post a request, don't harvest members' details |

Record every candidate as a **suggestion** (Account tab → Suggest a farm, or admins can add them from the Review queue), with the source in the notes.

## Step 3: invite the farmers (weeks 2–6)

- **Visit in person on market day** with a one-page flyer: what Farm Direct is, "free for farmers, you keep all the money", and a QR code to the TestFlight or App Store link.
- **Phone call script (about 10 minutes):** explain, ask permission to list them, walk them through signing up, offer to enter their first products with them while on the call.
- **Help the first 20 by hand.** Photos and a good story make a big difference, so ask for a photo of the stall.
- **Ask the market operator** to announce it, put a sign at the info stall, and mention it in their newsletter.
- **Make it worth it:** free forever, and a "founding farmer" mention in the first release notes.

## Step 4: verify before publishing (ongoing)

Reviewers follow this checklist in the Review queue:

1. ABN looks up correctly at abr.business.gov.au and is plausibly the same business.
2. Phone call, or a message from the farm's own page, confirms the person is who they say.
3. Licence details for milk, eggs and meat match the regulator's public register where one exists. Mark licences as **checked** only after doing this.
4. Photos are of the actual place. Reject stock photos.
5. Opening hours and prices look sensible. Ask for changes if not.

## Step 5: keep it fresh

Stale listings are worse than none. The app warns customers when a listing hasn't been updated for 90 days. To help farmers stay current:

- Make stock updates a 10-second job (the app's quick stock screen).
- Ask the farmers you know to update stock at the start of each market day.
- Reviewers contact farmers whose listings go stale, then hide ones that don't respond.

## What to measure

| Measure | First target (8 weeks, pilot region) |
|---|---|
| Live, reviewed listings | 60–100 |
| Listings with at least one photo | 80% |
| Listings with stock updated in the last 14 days | 50% |
| Average time from claim to approval | under 3 days |
| Customers who save at least one favourite | 30% |

## Not in version 1 (ideas for later)

CSV import for reviewers, automatic reminders to farmers (with consent), a public "claim this listing" web page and QR links that open the app, and deeper market features (stallholder rosters, market-day-only listings).
