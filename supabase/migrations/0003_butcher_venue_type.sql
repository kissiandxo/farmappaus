-- Adds "butcher" (an independent butcher shop) as a place type, alongside farm, farm-gate stall,
-- farm shop and farmers' market. Matches VenueType in src/domain/types.ts.
-- The checks in 0001_init.sql are unnamed column constraints, so Postgres named them
-- farms_type_check and suggestions_venue_type_check.

alter table public.farms drop constraint if exists farms_type_check;
alter table public.farms
  add constraint farms_type_check
  check (type in ('farm', 'farm_gate_stall', 'farm_shop', 'farmers_market', 'butcher'));

alter table public.suggestions drop constraint if exists suggestions_venue_type_check;
alter table public.suggestions
  add constraint suggestions_venue_type_check
  check (venue_type in ('farm', 'farm_gate_stall', 'farm_shop', 'farmers_market', 'butcher'));
