# Real-listing leads: farmers’ markets (researched 13 Nov 2026)

First research pass for `docs/REAL_LISTINGS.md`. These are **leads, not listings**: public facts about real farmers’ markets, found through web search, loaded into the app as pending suggestions for a reviewer to confirm with each operator. Nothing here is published as if the market had written it, and no photos, stories or personal contact details were taken.

## How reliable is this?

Mostly good enough to *start a conversation*, not good enough to publish.

- The search tool returns summaries of third-party pages (tourism guides, event sites, travel articles). I could not open the pages themselves from this environment, so each fact is "as listed by those sources".
- Official pages turned up for only two of the eight: the Capital Region Farmers Market site and Brisbane City Council’s event listing. The rest rely on tourism and event sites.
- Hours differ between sources for several markets (flagged below). Markets also change hours with the season and close for events.
- Markets are only one kind of place. Individual farms and farm-gate stalls need a different approach (see `docs/REAL_LISTINGS.md`).

## The eight leads (all in `supabase/seed/candidate-suggestions.sql`)

| State | Market | Where | When (as listed) | Needs checking |
|---|---|---|---|---|
| NSW | Carriageworks Farmers Market | Eveleigh (245 Wilson St per most listings) | Sat 8am–1pm | Entrance address differs (243 Wilson St, Darlington on one site) |
| ACT | Capital Region Farmers Market | Exhibition Park (EPIC), Mitchell | Almost every Sat 7am–11:30am | Dates on the market’s own site; closed for the Royal Canberra Show |
| QLD | Northey Street Organic Farmers Market | Northey Street City Farm, 16 Victoria St, Windsor | Sun 6am–11am | Close time: 11am (council) vs 10:30am (older description); weather cancellations |
| SA | Adelaide Showground Farmers’ Market | Rose Terrace, Wayville | Sun 8:30am–12:30pm | Some listings say 9am–1pm; moves during the Royal Adelaide Show |
| TAS | Farm Gate Market | Bathurst St (Murray to Elizabeth St), Hobart | Sun 8:30am–1pm | None found |
| NT | Parap Village Market | Parap Village, Parap | Sat 8am–2pm, year round | A general market, so confirm how many stalls are farmers |
| WA | Perth City Farm Farmers Market | 1 City Farm Place, East Perth | Sat 8am–12pm (Apr–Nov), 7:30am–11:30am (Dec–Mar) | Seasonal hours |
| WA | Subiaco Farmers Market | Subiaco Primary School, 271 Bagot Rd | Sat 8am–12pm | One source gives 7:30am–11:30am for May 2026 |

## Not loaded: needs a clearer source first

- **Victoria – Abbotsford Convent.** Sources disagree: one says a Slow Food farmers’ market runs on the fourth Saturday, another describes a monthly Regional Farmers Market on the second Saturday (9am–2pm), and one says the operator changed in 2019. Check the Convent’s website or Melbourne Farmers Markets directly before adding it.
- **ACT extras** found while searching: Southside Farmers Market (Phillip, Sundays, 7am–11am or 11:30am depending on the source) and Haig Park Village Markets (Braddon, Sundays, 8am–2pm; may be more crafts than farms). Little Burley Market runs on Sundays but no hours were found.

## What to do with these

1. **Load them.** After the migrations, run `supabase/seed/candidate-suggestions.sql` in the Supabase SQL editor (see `docs/BACKEND.md`). They appear in the app’s Review queue under *Suggested places*. Running it twice does nothing.
2. **Confirm each one with the operator.** A short call or email asking: are the days and hours right, do you mind being listed, and would a stallholder like to claim a listing? Markets are the best entry point because one operator introduces dozens of farmers.
3. **Convert, then fill in.** In the Review queue tap *Add as a listing to review*, then edit it (reviewers can edit any listing) to set the right hours, a short description in your own words, and a better map pin.
4. **Invite the stallholders.** Use the market as the way in (see `docs/REAL_LISTINGS.md`, Step 3).

To change or add leads, edit `scripts/build-candidate-seed.mjs` and run `node scripts/build-candidate-seed.mjs`.

## What I did not do

- I did not list any individual farm. I found no source I could check well enough, and a made-up or half-checked farm is worse than none.
- I did not add any of these to the sample data, which stays labelled SAMPLE.
- I did not collect phone numbers or emails. Several listings show them, but they are the operators’ to share when you ask.
