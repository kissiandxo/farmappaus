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

## Sample farms (`src/data/sampleFarms.ts`)

Invented placeholders, clearly labelled `SAMPLE`. Locations are real locality centres so the map and distance logic can be tested in every state and territory. Replaced by reviewed listings in M4.
