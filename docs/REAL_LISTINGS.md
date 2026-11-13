# Getting real listings

The app ships with clearly labelled **sample** farms and no real ones. A map with nothing on it is the biggest risk to launch, so this is the plan for filling it, honestly and legally.

## Principles

1. **Farmers own their listings.** We never publish a farm's details as if they had written them. Anything we find ourselves starts as a *suggestion* and only goes live after a farmer claims it, or after we have checked it ourselves.
2. **No fake farms, no fake reviews, no copied photos or stories.** Facts only: name, locality, what they sell, contact details the business has published itself.
3. **Check every source's terms.** Don't scrape websites or Facebook pages without permission. Use public directories where the terms allow it, or ask the owner.
4. **Be careful with contact details.** Many farmers are sole traders, so phone numbers and names can be personal information under the Privacy Act. Spam Act 2003: no unsolicited marketing emails or SMS without consent. Phone, post, in-person visits and replies to people who contacted us are fine.
5. **Food-safety first.** No product that needs a licence (milk, eggs, meat) goes live without licence details. See `docs/COMPLIANCE.md`.

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
