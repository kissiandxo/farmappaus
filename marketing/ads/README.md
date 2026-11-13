# Farm Direct: real meat ads

Five Meta ads (Facebook and Instagram) for people who want real meat from a real farmer. Each ad comes in two sizes. All of it is in this folder.

**Do not run these ads until Farm Direct is live on the App Store.** Every ad says "Free for iPhone", and that is only true once people can download it.

## The five ads

All files are in `out/`. "Feed" is 1080x1350 (4:5). "Story" is 1080x1920 (9:16). A preview of all ten is in `out/contact-sheet.png`. The same copy, as data, is in `ads.json`.

| # | Files | The idea | On the image | Primary text | Headline | Description | Button |
|---|---|---|---|---|---|---|---|
| 1 | `01-paddock-not-petri-feed.png`, `01-paddock-not-petri-story.png` | The bold "real, not lab" poster. One witty line, nobody named or blamed. | From a paddock, not a petri dish. / About 40 places across Australia list beef, lamb, pork or chicken. | From a paddock, not a petri dish. About 40 places across Australia list beef, lamb, pork or chicken. Check before you go. (121) | Meat from a paddock, not a petri dish (37) | Free. No account needed. (24) | Install now |
| 2 | `02-real-meat-tap-feed.png`, `02-real-meat-tap-story.png` | The defiant line, backed by the one button you press: Meat. | Real meat. Real farmers. / Tap Meat for about 40 places listing beef, lamb, pork or chicken. / [Meat button] | Real meat. Real farmers. Tap Meat and see about 40 places listing beef, lamb, pork or chicken. Free, no sign-up. (112) | Tap Meat. Find the farmer. (26) | Beef, lamb, pork and chicken (28) | Install now |
| 3 | `03-meat-with-postcode-feed.png`, `03-meat-with-postcode-story.png` | Real meat comes from a real place. Search a town or postcode; ask the farmer the rest. | Meat with a postcode. / Search a town or postcode for meat. Ask the farmer the rest. / BEEF · LAMB · PORK · CHICKEN | Enter a town or postcode to find the nearest of about 40 places listing beef, lamb, pork or chicken. Ask the farmer the rest. (125) | Meat with a postcode (20) | Search by town or postcode (26) | Download |
| 4 | `04-weekend-meat-run-feed.png`, `04-weekend-meat-run-story.png` | The Saturday market or farm-shop run, planned with the Meat and This weekend filters. | Your weekend meat run, sorted. / SAT, SUN / [Meat] [This weekend] / Nearly 30 places listing meat publish Saturday or Sunday hours. | Plan the weekend meat run: turn on Meat and This weekend, check the published hours, get directions. Free, no account. (118) | Weekend meat run, sorted (24) | Check hours before you go (25) | Download |
| 5 | `05-pin-drive-buy-feed.png`, `05-pin-drive-buy-story.png` | The map, for road trips and caravans: every place is a pin, tap for hours and directions. | Pin it. Drive there. Buy direct. / About 40 places listing meat, each one pinned on the map. | Driving through? About 40 places listing beef, lamb, pork or chicken, each pinned on the map with hours and directions. (119) | Pin it. Drive there. Buy direct. (32) | Free. No sign-up. (17) | Install now |

Numbers in brackets are character counts. Meta's limits we work to: primary text 125, headline 40, description 30. All five are inside them. Every image also carries the footer "Farm Direct / Free for iPhone" with the app icon.

## Where each claim comes from

Every number comes from the app's own list of places, `src/data/realListings.json`, checked on 13 November 2026. "Meat" means a place whose `products` list includes beef, lamb, pork or chicken.

| Claim in the ads | The real figure |
|---|---|
| "About 40 places" list beef, lamb, pork or chicken | 41 of the 106 places |
| "Across Australia" | NSW 13, VIC 7, WA 7, SA 6, QLD 5, ACT 2, TAS 1. None in the NT, so the ads never say "every state" |
| Kinds of places | 25 farmers' markets, 12 farm shops, 3 farms, 1 farm-gate stall |
| By meat | beef 28, lamb 23, pork 18, chicken 16 |
| "Nearly 30 places listing meat publish Saturday or Sunday hours" | 29 of the 41 have weekly hours that include a Saturday or Sunday |
| "Each one pinned on the map" | All 41 have a map position |
| "Search a town or postcode" | All 41 have a postcode; search by name, town, postcode or produce is in `docs/APP_STORE.md` |
| Meat button, This weekend filter | The labels "Meat" and "This weekend" are in `src/components/FilterPanel.tsx` |
| Hours and directions | Place pages show hours (or "by appointment"); Directions opens Apple Maps (`docs/APP_STORE.md`) |
| Free, no account, no sign-up | `docs/APP_STORE.md`: free, no in-app purchases, no account, no sign-in |

**To re-check the numbers**, run this from the project folder:

```bash
node -e "
const L=require('./src/data/realListings.json'), M=['beef','lamb','pork','chicken'];
const m=L.filter(r=>(r.products||[]).some(p=>M.includes(p)));
const tally=f=>m.reduce((o,r)=>(o[f(r)]=(o[f(r)]||0)+1,o),{});
console.log('places',L.length,'meat',m.length);
console.log(tally(r=>r.type), tally(r=>r.state));
M.forEach(x=>console.log(x,m.filter(r=>r.products.includes(x)).length));
console.log('sat/sun',m.filter(r=>r.hours?.kind==='weekly'&&(r.hours.days?.sat||r.hours.days?.sun)).length);
"
```

**If the listings change, re-check before every flight.** The words to change:

- If places listing meat drop below about 38, change "About 40" (ads 1, 2, 3 and 5) to "Dozens of places".
- If the Saturday/Sunday count drops below 28, change "Nearly 30" in ad 4 to "About 30", or recount and reword.
- If meat places turn up in the NT, "across Australia" still holds. Never change it to "every state" unless every state and territory has one.

## The rules these ads follow, and why

These rules keep the ads honest and inside the Australian Consumer Law and Meta's and Apple's ad rules.

- **No claims about how the animals were raised, or about quality, health, price or safety.** No "grass-fed", "free-range", "organic", "hormone-free", "healthier", "cheaper" or "safer". Farm Direct lists places from public sources; it doesn't check any of that. The ads tell people to ask the farmer instead ("Ask the farmer the rest").
- **"Real, not lab" is positioning, not a claim about anyone else.** "From a paddock, not a petri dish" and "Real meat. Real farmers." say what Farm Direct is about. The ads never say or hint that supermarkets, brands, scientists or the government are selling, hiding or pushing lab-grown meat, and there is no health or safety scare. No lab, scientist or petri dish is drawn.
- **No named business is the hero, and no endorsement is implied.** The listings are not yet confirmed by their owners, so no farm or market appears by name.
- **Honest numbers.** "About 40" for 41, "Nearly 30" for 29. Nothing says there is a place in every town or near you.
- **Apple rules.** No Apple logo, no App Store badge, no picture of an iPhone. "Free for iPhone" is plain text.
- **Meta rules.** No "Are you...?" lines about the viewer, no shock images, no before/after, no swearing, and all text is at least 34 px so it reads on a phone.
- **Only original artwork.** No stock photos and no AI photos. Everything is type, colour, simple drawings made for these ads, and the app icon.
- **Australian English throughout.**

## Re-rendering

The ads are HTML files (`NN-name/ad.html`) built on the shared kit in `shared/`. To rebuild all ten PNGs:

```bash
cd marketing/ads
node render.mjs          # writes out/*-feed.png and out/*-story.png
node contact-sheet.mjs   # rebuilds out/contact-sheet.png
```

`render.mjs` prints every file with its size and warns about text outside the safe areas or too small.

**About the app screenshots.** The files in `shared/screens/` are still placeholders (01 to 06 are the same picture). None of the five finished ads shows a screenshot today, so swapping in the real screens changes nothing on its own. Ad 2 is ready to show a phone with the Meat-filtered list: once the real `shared/screens/02-explore-meat.png` is in, check it shows several places (not one business), change `data-phone="off"` to `data-phone="on"` in `02-real-meat-tap/ad.html`, run `node render.mjs`, and look at both PNGs. You can preview it first by opening `02-real-meat-tap/ad.html?size=feed&phone=1` in a browser.

## Sizes

| Placement | Size | Notes |
|---|---|---|
| Feed (Facebook and Instagram) | 1080x1350, 4:5 | |
| Stories and Reels | 1080x1920, 9:16 | Text kept out of the top 250 px and bottom 340 px, where Meta puts its buttons |

## Suggested audiences in Australia

Location: Australia, people living in or recently in the area. Ages 25 to 65+. Target by interests and places only; do not target by health, religion, ethnicity, politics or any other sensitive personal trait (Meta doesn't allow it anyway).

Start broad and let Meta find people, then test these interest groups:

- **Cooking and meat:** cooking, barbecue, home cooking, butchery, slow cooking, recipes, meal planning.
- **Local food:** farmers' markets, local food, farm-to-table, food provenance, regional produce.
- **Backing local:** shop local, small business, Australian-made, agriculture, farming.
- **Weekend outings (ad 4):** weekend markets, day trips, family activities.
- **Road trips (ad 5):** caravanning, camping, road trips, the Grey Nomads lifestyle, four-wheel driving, travel in Australia.

Regions: put most of the spend where the listings are. NSW (13 meat places), Victoria (7), WA (7), SA (6) and Queensland (5) first; ACT and Tasmania at lower spend. **Leave out the Northern Territory**, which has no meat places listed yet. Within states, regional and outer-suburban areas suit ads 3, 4 and 5 well.

Suggested pairings: ad 1 and ad 2 for broad reach; ad 3 for regional households; ad 4 for families and market-goers (run Thursday to Saturday); ad 5 for caravan and road-trip audiences.

## Before each flight

1. The app is live on the App Store.
2. Re-run the count above; change any wording that no longer holds.
3. `node render.mjs`, then look at all ten PNGs.
4. Paste the copy from `ads.json` (or the table above) into Meta Ads Manager.
