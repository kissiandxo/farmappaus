# Data sources

## Offline suburb and postcode list (`src/data/auPostcodes.json`)

Used for suburb/postcode search and to name a GPS fix, with no network needed (works on patchy regional reception).

Locality and postcode pairs come from the [GeoNames Australian postal code extract](https://download.geonames.org/export/zip/AU.zip). GeoNames publishes the postal code files under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), as recorded in its [distribution readme](https://download.geonames.org/export/zip/readme.txt). The About tab credits GeoNames. The build filters facility suffixes, removes duplicate locality/postcode/state combinations and rounds estimated coordinates to three decimals.

```bash
curl -fsSL https://download.geonames.org/export/zip/AU.zip -o /tmp/AU.zip
unzip -p /tmp/AU.zip AU.txt > /tmp/AU.txt
node scripts/build-postcodes.mjs /tmp/AU.txt
```

## Real places (`src/data/realListings.json`, `src/data/realFarms.ts`)

Shown when no backend is configured. 151 real places (67 farmers' markets, 45 independent butcher shops, 26 farm shops, 8 farms and 5 farm-gate stalls; 86 list beef, lamb, pork or chicken; QLD 36, NSW 32, WA 25, VIC 23, SA 14, NT 10, TAS 7, ACT 4), researched by hand on **13 Nov 2026** from public pages (each place's own site, councils, tourism bodies). Butchers are listed as retail shops with no claim about where their meat comes from. Public facts only: name, type, address, hours, the sentence describing the place, a website and phone only where the source published them, and the source links. No photos, reviews, prices or text copied from the sources. Everything stays "unclaimed" until the owner claims it. See `docs/REAL_LISTINGS.md`.

- **Research:** `docs/research/listings/*.json`, with `sources`, `confidence` and `caveats` per entry.
- **Build:** `node scripts/build-real-listings.mjs` adds coordinates and rewrites `realListings.json`. Optional later passes, `meat-3.json` (new places), the four `butchers-*.json` files (new butcher shops) and `product-updates.json` (confirmed products for existing places), are read when present.
- **Rules the build enforces** (it stops and names the record, writing nothing): `hours.kind: "always"` only on honesty-box farm-gate stalls; no research-process wording in descriptions, "also sold" text or hours notes; no aliases in brackets or " - " in names; Website is the place's own site, never a tourism, blog or council listing (those stay in `sources`). `hours.irregular: true` in the research marks a not-every-week pattern the wording does not make plain. `realFarms.test.ts` checks the same rules on the bundled data.

### Geocoding and attribution (OpenStreetMap, ODbL)

Coordinates come from [Nominatim](https://nominatim.openstreetmap.org/), which searches OpenStreetMap data. The map data is **© OpenStreetMap contributors** and is available under the [Open Database Licence (ODbL)](https://www.openstreetmap.org/copyright). The app shows "Map locations © OpenStreetMap contributors" at the foot of the Account tab. The script follows the Nominatim usage policy: a descriptive User-Agent (`farm-direct-build/1.0`), at most one request per second, and every result cached in `docs/research/listings/geocode-cache.json` so a rerun does not query the service again. Pins found from a street address are marked `address`; pins that fell back to the suburb centre are `locality` and shown as "Approximate location".

## Sample farms (`src/data/sampleFarms.ts`)

Invented placeholders, clearly labelled `SAMPLE`, kept **for tests only**. The running app never shows them. Locations are real locality centres so the map and distance logic can be tested in every state and territory.
