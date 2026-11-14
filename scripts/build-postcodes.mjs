// Builds the compact offline postcode/suburb lookup used by the app.
//
// Usage:
//   npm pack aus-postcode-suburbs && tar xzf aus-postcode-suburbs-*.tgz
//   node scripts/build-postcodes.mjs package/lib/resources/aus_postcodes.json
//
// Output: src/data/auPostcodes.json, rows of [postcode, locality, state, lat, lng].
// See docs/DATA.md for the data source and licence notes.
import { readFileSync, writeFileSync } from 'node:fs';

const input = process.argv[2];
const output = process.argv[3] ?? new URL('../src/data/auPostcodes.json', import.meta.url).pathname;
if (!input) {
  console.error('Usage: node scripts/build-postcodes.mjs <aus_postcodes.json> [output.json]');
  process.exit(1);
}

const STATES = new Set(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']);
const titleCase = (s) =>
  s === s.toUpperCase()
    ? s.toLowerCase().replace(/(^|[\s\-'(])([a-z])/g, (_, a, b) => a + b.toUpperCase())
    : s;

const seen = new Set();
const rows = [];
for (const r of JSON.parse(readFileSync(input, 'utf8'))) {
  const postcode = String(r.postcode ?? '').padStart(4, '0');
  const locality = String(r.locality ?? '').trim();
  const lat = Number(r.lat);
  const lng = Number(r.long);
  if (!/^\d{4}$/.test(postcode) || !locality || !STATES.has(r.state)) continue;
  // Drop Australia Post facilities that are not suburbs people would search for.
  // Many real suburbs (e.g. Darwin's) have a blank type, so only blank-type rows
  // whose name ends in a facility suffix (BC, DC, MC, LPO, PO) are removed.
  if (r.type === 'LVR' || r.type === 'Post Office Boxes') continue;
  if (!r.type && /\s(BC|DC|MC|LPO|PO)$/i.test(locality)) continue;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
  if (lat > -9 || lat < -44.5 || lng < 96 || lng > 168) continue; // keeps mainland, Tasmania and territories
  const key = `${postcode}|${locality.toLowerCase()}|${r.state}`;
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push([postcode, titleCase(locality), r.state, Number(lat.toFixed(3)), Number(lng.toFixed(3))]);
}

rows.sort((a, b) => a[1].localeCompare(b[1]) || a[2].localeCompare(b[2]) || a[0].localeCompare(b[0]));
writeFileSync(output, JSON.stringify(rows));
console.log(`Wrote ${rows.length} places to ${output}`);
