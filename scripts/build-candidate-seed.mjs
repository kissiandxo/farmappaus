// Builds supabase/seed/candidate-suggestions.sql from the researched leads below.
// Usage: node scripts/build-candidate-seed.mjs
//
// These are UNVERIFIED leads from public listings, loaded as *pending suggestions* (never live
// listings). A reviewer checks each one with the operator, then converts it in the Review queue.
// See docs/research/candidate-markets.md for how they were found and what is uncertain.
import { writeFileSync } from 'node:fs';

const CHECKED = '13 Nov 2026';
const PREFIX = `UNVERIFIED lead from public listings (checked ${CHECKED}). `;
const SUFFIX = ' Confirm with the operator before publishing.';

const leads = [
  {
    name: 'Carriageworks Farmers Market',
    type: 'farmers_market',
    state: 'NSW', locality: 'Eveleigh', postcode: '2015', lat: -33.91, lng: 151.195,
    note: 'Saturdays 8am-1pm (several listings agree), undercover. Address in listings: 245 Wilson St, Eveleigh (Sydney.com.au gives the entrance as 243 Wilson St, Darlington). Free entry. Sources: https://www.sydney.com.au/carriageworks-farmers-market.htm and https://qantas.com/travelinsider/en/explore/australia/new-south-wales/sydney/eveleigh-markets.html.',
  },
  {
    name: 'Capital Region Farmers Market',
    type: 'farmers_market',
    state: 'ACT', locality: 'Mitchell', postcode: '2911', lat: -35.219, lng: 149.133,
    note: 'At Exhibition Park in Canberra (EPIC), undercover. Almost every Saturday, 7am-11:30am; the market site lists the dates. It was closed one Saturday for the Royal Canberra Show in Feb 2025. Official page: https://capitalregionfarmersmarket.com.au/?p=1554 . Guide: https://www.act.gov.au/our-canberra/latest-news/2025/april/the-ultimate-canberra-markets-guide .',
  },
  {
    name: 'Northey Street Organic Farmers Market',
    type: 'farmers_market',
    state: 'QLD', locality: 'Windsor', postcode: '4030', lat: -27.427, lng: 153.03,
    note: 'Sundays at Northey Street City Farm, 16 Victoria St, Windsor. Brisbane City Council listings show 6am-11am; an older description says 6am-10:30am, so the close time needs checking. Free entry. A council listing noted cancellation in severe weather. Source: https://www.brisbane.qld.gov.au/events/northey-street-organic-farmers-market/183115607 .',
  },
  {
    name: "Adelaide Showground Farmers' Market",
    type: 'farmers_market',
    state: 'SA', locality: 'Wayville', postcode: '5034', lat: -34.956, lng: 138.588,
    note: 'Sundays at the Showground, Rose Terrace, Wayville. Most listings say 8:30am-12:30pm; some say 9am-1pm, so hours need checking. Does not run at the Showground during the Royal Adelaide Show (moves to a pop-up venue). No official site found in the search. Source: https://onlyadelaide.com.au/adelaide-showground-farmers-market .',
  },
  {
    name: 'Farm Gate Market (Hobart)',
    type: 'farmers_market',
    state: 'TAS', locality: 'Hobart', postcode: '7000', lat: -42.878, lng: 147.308,
    note: 'Sundays 8:30am-1pm on Bathurst Street between Murray and Elizabeth Streets (104 Bathurst St); one listing says it runs rain, hail or shine. Sources: https://www.discovertasmania.com.au/event/farmgatemarket and https://grandchancellorhotels.com/hotel-grand-chancellor-hobart/local-attractions/farm-gate-market .',
  },
  {
    name: 'Parap Village Market',
    type: 'farmers_market',
    state: 'NT', locality: 'Parap', postcode: '0804', lat: -12.428, lng: 130.873,
    note: 'Every Saturday 8am-2pm, year round, rain or shine (sources agree). In the Parap Village shopping precinct on Parap Road; one listing gives 3/3 Vickers St, Parap NT 0804. A general market, so confirm which stalls are farmers. Source: https://northernterritory.com/gb/en/darwin-and-surrounds/see-and-do/parap-village-market .',
  },
  {
    name: 'Perth City Farm Farmers Market',
    type: 'farmers_market',
    state: 'WA', locality: 'East Perth', postcode: '6004', lat: -31.957, lng: 115.875,
    note: 'Saturdays. Hours change with the season: 7:30am-11:30am Dec-Mar and 8am-12pm Apr-Nov. At 1 City Farm Place, East Perth. Free entry. No official hours page found in the search. Source: https://onlyperth.com.au/perth-city-farm-farmers-market .',
  },
  {
    name: 'Subiaco Farmers Market',
    type: 'farmers_market',
    state: 'WA', locality: 'Subiaco', postcode: '6008', lat: -31.957, lng: 115.811,
    note: 'Saturdays, most sources 8am-12pm (one source gives 7:30am-11:30am for a May 2026 date, so seasonal hours may differ). In the grounds of Subiaco Primary School, 271 Bagot Road. No official hours page found in the search. Source: https://onlyperth.com.au/subiaco-farmers-market .',
  },
];

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const statements = leads.map((l) => {
  const notes = `${PREFIX}${l.note}${SUFFIX}`;
  if (notes.length > 1000) throw new Error(`Notes for ${l.name} are ${notes.length} characters (limit 1000)`);
  return `insert into public.suggestions (user_id, name, venue_type, state, locality, postcode, lat, lng, products, notes)
select null, ${q(l.name)}, ${q(l.type)}, ${q(l.state)}, ${q(l.locality)}, ${q(l.postcode)}, ${l.lat}, ${l.lng}, '{}', ${q(notes)}
where not exists (select 1 from public.suggestions where name = ${q(l.name)} and postcode = ${q(l.postcode)});`;
});

const sql = `-- Researched leads, loaded as PENDING SUGGESTIONS (not live listings).
-- Generated by scripts/build-candidate-seed.mjs. Safe to run more than once.
-- Run in the Supabase SQL editor after the migrations. Then open the app's Review queue,
-- check each lead with its operator, and use "Add as a listing to review".
-- Coordinates are suburb centres; fix the pin when you edit the listing.

${statements.join('\n\n')}
`;

writeFileSync(new URL('../supabase/seed/candidate-suggestions.sql', import.meta.url), sql);
console.log(`Wrote ${leads.length} suggestions to supabase/seed/candidate-suggestions.sql`);
