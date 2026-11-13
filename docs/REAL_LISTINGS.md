# Getting real listings

Version 1.0.0 ships with **106 real places from public sources** and no sample farms (sample farms are used by tests only). This page explains how those places were researched and built, the rules they follow, and the plan for adding more, honestly and legally.

## Principles

1. **Farmers own their listings.** We never publish a farm's details as if they had written them. Anything we find ourselves starts as a *suggestion* and only goes live after a farmer claims it, or after we have checked it ourselves.
2. **No fake farms, no fake reviews, no copied photos or stories.** Facts only: name, locality, what they sell, contact details the business has published itself.
3. **Check every source's terms.** Don't scrape websites or Facebook pages without permission. Use public directories where the terms allow it, or ask the owner.
4. **Be careful with contact details.** Many farmers are sole traders, so phone numbers and names can be personal information under the Privacy Act. Spam Act 2003: no unsolicited marketing emails or SMS without consent. Phone, post, in-person visits and replies to people who contacted us are fine.
5. **Food-safety first.** No product that needs a licence (milk, eggs, meat) goes live without licence details. See `docs/COMPLIANCE.md`.

## What is loaded (app version 1.0.0)

When no backend is configured, the app shows **106 real places** from public sources instead of sample farms (67 farmers' markets, 26 farm shops, 8 farms, 5 farm-gate stalls; three research passes, seven research files, plus confirmed product updates), across every state and territory (QLD 26, NSW 21, WA 20, VIC 18, SA 9, TAS 5, NT 5, ACT 2). They were researched by hand on 13 Nov 2026 from each place's own site, council pages and tourism pages. When Supabase **is** configured, behaviour is unchanged: the app shows only reviewed live listings from the database.

**Meat.** 41 places list beef, lamb, pork or chicken (beef 28, lamb 23, pork 18, chicken 16): 25 farmers' markets and 16 farm shops (12), farms (3) or farm-gate stalls (1). The meat research pass (`meat-3.json`) added meat-focused places, and `product-updates.json` added confirmed meat, egg and milk categories to 21 existing listings, each with its evidence URL in `sources`. The Meat filter chip and the screenshot tour (Torello Farm, Barossa Farmers Market) use this data.

| Step | File |
|---|---|
| Research (entries plus unverified leads, with sources and caveats) | `docs/research/listings/{nsw-act,vic-tas,qld-nt,sa-wa,east-2,north-west-2}.json` |
| Later passes (optional: the script works without them; both are present and applied in 1.0) | `docs/research/listings/meat-3.json` (new places), `docs/research/listings/product-updates.json` (confirmed products for existing places) |
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
- **Explicit `hours.irregular`.** When a place does not run every week but its wording does not say "monthly", "seasonal" and so on (for example Batchelor, which runs April to December, or Perth City Farm, whose times change on 1 December), set `"irregular": true` inside `hours` in the research. The mapper ORs it into the irregular flag.
- **"Open any time" is for honesty-box stalls only.** `hours.kind: "always"` is allowed only on a `farm_gate_stall`. A shop or farm that is "open daily" gets its published daily times, or, if no times are published, every day with empty times (so it reads "Check dates") and a note saying to call first. The build fails otherwise.
- **Website means the place's own site.** The Website button opens only the place's own site (or, where it has none, its own Facebook page, as for Kiama and Lismore; Golden Plains is council-run, so its council page is its own). Tourism, blog and council listings are never the Website; they stay in `sources`, so they are still reachable from the Sources section of the place page. The build fails on a known tourism or council host.
- **Shopper copy, not research notes.** Descriptions, "also sold" text and hours notes are written for shoppers. Research-process wording ("page opened", "see caveats", "per the site", "not itemised", "not recorded", "regional guide", "no product list", a leading "Per …") belongs in `caveats`, and the build fails if it appears in shopper copy. Names carry no aliases in brackets and no " - "; an alias (Bermi Market, Farmy, Snake Creek Cattle Company, The Chook House) goes in the description so search still finds it.
- **Location precision:** 57 pins sit on a geocoded street address or venue; 49 are the suburb centre only (the farm page says "Approximate location"). Directions use the street address when there is one.
- **Checked date.** `LISTINGS_CHECKED_ON` in `src/data/realFarms.ts` is the latest `researchedOn` across the bundled records; each place's `updatedOn` is its own `researchedOn`.

### Excluded

| Entry | Reason |
|---|---|
| Mulgowie Farmers Market (QLD) | A single dated event (5 Dec 2026), recurrence unconfirmed, so not a recurring place |
| Baudin's Macadamias (WA) | Seasonal stall; the research says the season may already be ending and asks to confirm before listing; no published hours |
| HOTA Farmers and Artisan Markets (QLD) | The market's own event page still shows 2025 dates, so it is not confirmed as running now |

### Rerun it

```bash
node scripts/build-real-listings.mjs
```

Reads the six research files (plus `meat-3.json` and `product-updates.json` when present) and rewrites `src/data/realListings.json`. It first checks every record against the rules above and stops, writing nothing, if any record breaks one, naming the record. `meat-3.json` has the same shape as the other files; a place already listed (same name and state) is skipped. `product-updates.json` is `{"updates":[{"name","state","addProducts":[...],"evidenceUrl","evidence"}]}`: each update adds its categories to the one listing with that name and state and adds `evidenceUrl` to its `sources`; a name that matches no listing stops the build. It geocodes with Nominatim at no more than one request per second and caches every answer, so a rerun with unchanged research makes no requests. To add or fix a place, edit the research JSON (keep `sources` and `caveats`) and rerun; to drop one, add it to `EXCLUDE` in the script with a reason. Uses `curl` when `HTTPS_PROXY` is set, because Node's `fetch` ignores the proxy.

### Doubtful or unconfirmed details (read the `caveats` in the research files)

- Many postcodes were added from general knowledge, not the source page.
- Conflicting or inferred hours: Kiama (summer and winter times differ), Newcastle City (weekly pattern inferred), Hill & Ridge (times from a council listing seen only in search results; the note says so), Green Shed Market (sources give 7-11am or 7am-noon), Stanthorpe Cheese (open daily, times not published), Marcoola (only the venue name, Berry Keeper, is known; it did not geocode, so the pin is the suburb centre).
- Rapid Creek Markets: the site still shows an old 2020 "suspended" banner; NT tourism confirms the hours.
- Farm Club Australia is mainly a cafe and bakery, and Maleny Dairies MilkBar is a factory outlet, not a farm-gate sale.
- Jan Powers Eagle Farm is described as new in 2026; check it is still running.

### Unverified leads still in the research files

74 more leads are recorded under `unverified` in the same files and are **not** loaded: Bega Produce Market, Mudgee Farmers' Market, Lismore, Moruya (SAGE), Arden Farm Produce, Riverview Produce, three NSW orchards that are closed or short of fruit this season (Shields, Pine Crest, Huntley Berry Farm), Ballarat, Bendigo, Daylesford, South Geelong and Collingwood Children's Farm markets, Burnie, Devonport, Deloraine and Salamanca markets, Huon Valley roadside stalls, Strawberry Fields, Maleny Cheese (now resolved and listed), Gallo Dairyland, Crazy Acres, Parap and Palmerston markets (NT, dry season), and others. Each has a `why` and a `leadUrl`. Confirm with the operator or their own page, move the entry into `listings`, and rerun the script.

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
