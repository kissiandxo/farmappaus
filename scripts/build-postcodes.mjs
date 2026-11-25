// Builds the compact offline postcode/suburb lookup used by the app.
//
// Input: GeoNames AU.txt (UTF-8 TSV). See docs/DATA.md for source and licence.
import { readFileSync, writeFileSync } from 'node:fs';

const input = process.argv[2];
const output = process.argv[3] ?? new URL('../src/data/auPostcodes.json', import.meta.url).pathname;
if (!input) {
  console.error('Usage: node scripts/build-postcodes.mjs <AU.txt> [output.json]');
  process.exit(1);
}

const STATES = new Set(['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']);
const seen = new Set();
const rows = [];
for (const line of readFileSync(input, 'utf8').split(/\r?\n/)) {
  const [country, postcode, locality, , state, , , , , latitude, longitude] = line.split('\t');
  if (country !== 'AU' || !/^\d{4}$/.test(postcode) || !locality || !STATES.has(state)) continue;
  if (/\s(BC|DC|MC|LPO|PO)$/i.test(locality) || !latitude || !longitude) continue;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
  if (lat > -9 || lat < -44.5 || lng < 96 || lng > 168) continue; // keeps mainland, Tasmania and territories
  const key = `${postcode}|${locality.toLowerCase()}|${state}`;
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push([postcode, locality, state, Number(lat.toFixed(3)), Number(lng.toFixed(3))]);
}

if (!rows.length) throw new Error('No Australian locality rows found');
rows.sort((a, b) => a[1].localeCompare(b[1]) || a[2].localeCompare(b[2]) || a[0].localeCompare(b[0]));
writeFileSync(output, JSON.stringify(rows));
console.log(`Wrote ${rows.length} places to ${output}`);
