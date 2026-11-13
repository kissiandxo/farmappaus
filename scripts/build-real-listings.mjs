// Builds src/data/realListings.json from the researched listings in docs/research/listings/*.json.
// Usage: node scripts/build-real-listings.mjs
//
// - Geocodes each place with Nominatim (OpenStreetMap), at most one request per second.
//   Every answer (including "no result") is cached in docs/research/listings/geocode-cache.json,
//   so a rerun with the same research makes no requests.
// - Tries the full street address first, then "<locality> <STATE> <postcode>", then the locality
//   centre from src/data/auPostcodes.json. A place nothing can locate is skipped, with the reason printed.
// - Facts come only from the research files. Nothing is invented or improved here.
// Map data: (c) OpenStreetMap contributors, ODbL. See docs/DATA.md.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RESEARCH_DIR = join(ROOT, 'docs/research/listings');
const CACHE_FILE = join(RESEARCH_DIR, 'geocode-cache.json');
const OUT_FILE = join(ROOT, 'src/data/realListings.json');
const POSTCODES_FILE = join(ROOT, 'src/data/auPostcodes.json');
const FILES = ['nsw-act', 'vic-tas', 'qld-nt', 'sa-wa', 'east-2', 'north-west-2'];

const USER_AGENT = 'farm-direct-build/1.0';
const MIN_INTERVAL_MS = 1100; // Nominatim policy: at most 1 request per second
/** A geocoder hit further than this from the locality centre is treated as the wrong place. */
const MAX_KM_FROM_LOCALITY = 30;

/**
 * Entries that are researched but must NOT be loaded. Matched by exact name.
 * Each needs a reason, which is printed and is listed in docs/REAL_LISTINGS.md.
 */
const EXCLUDE = [
  {
    name: 'Mulgowie Farmers Market',
    reason: 'A single dated event (Sat 5 Dec 2026); recurrence is not confirmed, so it is not a recurring place.',
  },
  {
    name: "Baudin's Macadamias",
    reason:
      'Seasonal stall (nuts on sale late May until stocks run out); the research notes the season may already be ending and asks to confirm before listing. No opening hours are published.',
  },
  {
    name: 'HOTA Farmers and Artisan Markets',
    reason: "The market's own event page still shows 2025 dates, so it is not confirmed as running now.",
  },
];

/** Rough state bounding boxes [minLat, maxLat, minLng, maxLng], deliberately a little generous. */
const STATE_BOX = {
  NSW: [-37.6, -28.1, 140.9, 153.8],
  ACT: [-35.95, -35.1, 148.7, 149.4],
  VIC: [-39.3, -33.9, 140.9, 150.1],
  QLD: [-29.3, -9.0, 137.9, 153.8],
  SA: [-38.2, -25.9, 128.9, 141.1],
  WA: [-35.2, -13.6, 112.8, 129.1],
  TAS: [-43.8, -39.5, 143.7, 148.7],
  NT: [-26.1, -10.9, 128.9, 138.1],
};
const AUSTRALIA_BOX = [-44.0, -9.0, 112.0, 154.0];

const inBox = (lat, lng, [minLat, maxLat, minLng, maxLng]) =>
  lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;

function haversineKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// ------------------------------------------------------------------ postcodes
const postcodeRows = JSON.parse(readFileSync(POSTCODES_FILE, 'utf8')); // [postcode, locality, state, lat, lng]
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function localityRows(locality, state) {
  const key = norm(locality);
  return postcodeRows.filter((r) => r[2] === state && norm(r[1]) === key);
}

/** The postcode, if every row for this locality+state agrees on one. */
function unambiguousPostcode(locality, state) {
  const codes = new Set(localityRows(locality, state).map((r) => r[0]));
  return codes.size === 1 ? [...codes][0] : '';
}

function localityCentre(locality, state, postcode) {
  const rows = localityRows(locality, state);
  const row = rows.find((r) => postcode && r[0] === postcode) ?? rows[0];
  return row ? { lat: row[3], lng: row[4] } : null;
}

// ------------------------------------------------------------------ geocoding
const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};
let lastRequestAt = 0;
let requestCount = 0;
let useCurl = Boolean(process.env.HTTPS_PROXY || process.env.https_proxy); // Node's fetch ignores the proxy

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function httpGetJson(url) {
  if (!useCurl) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`  fetch failed (${err.message}); switching to curl`);
      useCurl = true;
    }
  }
  const out = execFileSync('curl', ['-sS', '-f', '-m', '30', '-A', USER_AGENT, url], { encoding: 'utf8' });
  return JSON.parse(out);
}

/** Returns {lat, lng} or null. Cached either way. */
async function geocode(query) {
  if (Object.prototype.hasOwnProperty.call(cache, query)) return cache[query];
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=au&q=${encodeURIComponent(query)}`;
  let result = null;
  try {
    lastRequestAt = Date.now();
    requestCount++;
    const rows = await httpGetJson(url);
    if (Array.isArray(rows) && rows[0]) {
      const lat = Number(rows[0].lat);
      const lng = Number(rows[0].lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) result = { lat, lng };
    }
  } catch (err) {
    // Do not cache network errors; a rerun should try again.
    console.warn(`  request failed for "${query}": ${err.message}`);
    return null;
  }
  cache[query] = result;
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n');
  return result;
}

function plausible(point, state, centre) {
  if (!point) return false;
  if (!inBox(point.lat, point.lng, AUSTRALIA_BOX)) return false;
  if (!inBox(point.lat, point.lng, STATE_BOX[state])) return false;
  if (centre && haversineKm(point, centre) > MAX_KM_FROM_LOCALITY) return false;
  return true;
}

/** Drops "(...)" asides, which confuse the geocoder. */
const cleanAddress = (a) => a.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').replace(/[\s,]+$/, '').trim();
const hasUsableAddress = (a) => !!a && !/not stated/i.test(a);

async function locate(listing) {
  const { address, locality, state, postcode } = listing;
  const localityPart = [locality, state, postcode].filter(Boolean).join(' ');
  // The town as OpenStreetMap places it is the reference point. The bundled postcode list is only a
  // last resort: its centres are postcode-wide and can sit tens of kilometres from a rural town.
  const town = await geocode(`${localityPart}, Australia`);
  const townOk = plausible(town, state, null);
  const centre = townOk ? town : localityCentre(locality, state, postcode);

  if (hasUsableAddress(address)) {
    const hit = await geocode(`${cleanAddress(address)}, ${localityPart}, Australia`);
    if (plausible(hit, state, centre)) return { ...hit, precision: 'address' };
  }
  if (townOk) return { ...town, precision: 'locality' };
  if (centre && plausible(centre, state, null)) return { ...centre, precision: 'locality', viaCentroid: true };
  return null;
}

// ------------------------------------------------------------------ main
const accepted = [];
const excluded = [];
const skipped = [];
const warnings = [];

for (const file of FILES) {
  const data = JSON.parse(readFileSync(join(RESEARCH_DIR, `${file}.json`), 'utf8'));
  for (const listing of data.listings) {
    const rule = EXCLUDE.find((e) => e.name === listing.name);
    if (rule) {
      excluded.push({ name: listing.name, reason: rule.reason });
      continue;
    }
    if (/closed for|temporarily closed|suspended|no longer/i.test(listing.caveats ?? '')) {
      warnings.push(`${listing.name}: caveats mention a closure; check it is not meant to be excluded.`);
    }

    const postcode = listing.postcode || unambiguousPostcode(listing.locality, listing.state);
    const record = { ...listing, postcode };
    process.stdout.write(`Locating ${listing.name} ... `);
    const where = await locate(record);
    if (!where) {
      console.log('FAILED');
      skipped.push({ name: listing.name, reason: 'no plausible coordinates from the address, the locality or the postcode list' });
      continue;
    }
    console.log(`${where.precision}${where.viaCentroid ? ' (postcode list)' : ''}`);
    accepted.push({
      ...record,
      researchedOn: data.researchedOn,
      region: data.region,
      lat: Math.round(where.lat * 1e5) / 1e5,
      lng: Math.round(where.lng * 1e5) / 1e5,
      locationPrecision: where.precision,
    });
  }
}

writeFileSync(OUT_FILE, JSON.stringify(accepted, null, 2) + '\n');

// ------------------------------------------------------------------ report
console.log(`\n${'Name'.padEnd(58)} ${'State'.padEnd(4)} ${'Precision'.padEnd(9)} Coordinates`);
for (const r of accepted) {
  console.log(`${r.name.slice(0, 57).padEnd(58)} ${r.state.padEnd(4)} ${r.locationPrecision.padEnd(9)} ${r.lat}, ${r.lng}`);
}
const byPrecision = (p) => accepted.filter((r) => r.locationPrecision === p).length;
console.log(`\nWrote ${accepted.length} listings to ${OUT_FILE}`);
console.log(`Precision: ${byPrecision('address')} address, ${byPrecision('locality')} locality. Network requests: ${requestCount}.`);
for (const e of excluded) console.log(`EXCLUDED  ${e.name}: ${e.reason}`);
for (const s of skipped) console.log(`SKIPPED   ${s.name}: ${s.reason}`);
for (const w of warnings) console.log(`WARNING   ${w}`);
