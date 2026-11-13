# Data sources

## Offline suburb and postcode list (`src/data/auPostcodes.json`)

Used for suburb/postcode search and to name a GPS fix, with no network needed (works on patchy regional reception).

- **Rows:** `[postcode, locality, state, lat, lng]`, about 18,000 localities, coordinates to 3 decimal places (~100 m).
- **Source:** built by `scripts/build-postcodes.mjs` from the npm package [`aus-postcode-suburbs`](https://www.npmjs.com/package/aus-postcode-suburbs) (ISC licence), which republishes [Matthew Proctor's Australian Postcodes](https://www.matthewproctor.com/australian_postcodes).
- **Regenerate:**
  ```bash
  npm pack aus-postcode-suburbs && tar xzf aus-postcode-suburbs-*.tgz
  node scripts/build-postcodes.mjs package/lib/resources/aus_postcodes.json
  ```

### Licence to confirm before public launch

The upstream list is derived from Australia Post postcode information and Australian Bureau of Statistics data. The npm package is ISC-licensed, but I could not confirm that the underlying postcode data may be redistributed inside a commercial app. Before the App Store launch, either confirm the terms on the source page, or swap in a dataset with a clear open licence (for example ABS postal areas/localities under CC BY 4.0). The app only reads this file through `src/domain/places.ts`, so replacing it is a one-file change.

## Real places (`src/data/realListings.json`, `src/data/realFarms.ts`)

Shown when no backend is configured. More than 100 real farmers' markets, farm shops, farm-gate stalls and farms, researched by hand on **13 Nov 2026** from public pages (each place's own site, councils, tourism bodies). Public facts only: name, type, address, hours, the sentence describing the place, a website and phone only where the source published them, and the source links. No photos, reviews, prices or text copied from the sources. Everything stays "unclaimed" until the owner claims it. See `docs/REAL_LISTINGS.md`.

- **Research:** `docs/research/listings/*.json`, with `sources`, `confidence` and `caveats` per entry.
- **Build:** `node scripts/build-real-listings.mjs` adds coordinates and rewrites `realListings.json`. Optional later passes, `meat-3.json` (new places) and `product-updates.json` (confirmed products for existing places), are read when present.
- **Rules the build enforces** (it stops and names the record, writing nothing): `hours.kind: "always"` only on honesty-box farm-gate stalls; no research-process wording in descriptions, "also sold" text or hours notes; no aliases in brackets or " - " in names; Website is the place's own site, never a tourism, blog or council listing (those stay in `sources`). `hours.irregular: true` in the research marks a not-every-week pattern the wording does not make plain. `realFarms.test.ts` checks the same rules on the bundled data.

### Geocoding and attribution (OpenStreetMap, ODbL)

Coordinates come from [Nominatim](https://nominatim.openstreetmap.org/), which searches OpenStreetMap data. The map data is **© OpenStreetMap contributors** and is available under the [Open Database Licence (ODbL)](https://www.openstreetmap.org/copyright). The app shows "Map locations © OpenStreetMap contributors" at the foot of the Account tab. The script follows the Nominatim usage policy: a descriptive User-Agent (`farm-direct-build/1.0`), at most one request per second, and every result cached in `docs/research/listings/geocode-cache.json` so a rerun does not query the service again. Pins found from a street address are marked `address`; pins that fell back to the suburb centre are `locality` and shown as "Approximate location".

## Sample farms (`src/data/sampleFarms.ts`)

Invented placeholders, clearly labelled `SAMPLE`, kept **for tests only**. The running app never shows them. Locations are real locality centres so the map and distance logic can be tested in every state and territory.
