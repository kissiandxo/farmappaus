-- Farm Direct: core schema, security rules and review workflow.
-- Run with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
-- Tested locally by `npm run test:sql` (scripts/test-sql.mjs).

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'farmer', 'admin')),
  display_name text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- security definer so policies can ask "who am I?" without recursing into RLS
create function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

-- ------------------------------------------------------------------- farms
create table public.farms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 100),
  type text not null check (type in ('farm', 'farm_gate_stall', 'farm_shop', 'farmers_market')),
  state text not null check (state in ('NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT')),
  locality text not null,
  postcode text not null check (postcode ~ '^\d{4}$'),
  lat double precision not null check (lat between -45 and -9),
  lng double precision not null check (lng between 96 and 169),
  story text not null default '' check (char_length(story) <= 2000),
  photos text[] not null default '{}' check (cardinality(photos) <= 8),
  tags text[] not null default '{}',
  hours jsonb not null default '{"kind":"appointment"}',
  fulfilment text[] not null default '{pickup}',
  payment_types text[] not null default '{cash}',
  phone text,
  website text,
  status text not null default 'draft' check (status in ('draft', 'pending', 'live', 'rejected')),
  review_note text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index farms_status_idx on public.farms (status);
create index farms_owner_idx on public.farms (owner_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  category text not null check (category in ('milk', 'eggs', 'chicken', 'beef', 'lamb', 'pork', 'honey', 'fruit', 'veg')),
  name text not null check (char_length(name) between 1 and 100),
  price_cents integer check (price_cents >= 0 and price_cents < 10000000),
  unit text,
  in_stock boolean not null default true,
  pasteurised boolean,
  created_at timestamptz not null default now()
);
create index products_farm_idx on public.products (farm_id);

create table public.licences (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  category text not null check (category in ('dairy', 'eggs', 'meat', 'poultry', 'other')),
  regulator text not null check (char_length(regulator) between 2 and 120),
  licence_number text not null check (char_length(licence_number) between 1 and 60),
  expires_on date,
  status text not null default 'self_declared' check (status in ('self_declared', 'admin_checked')),
  created_at timestamptz not null default now()
);
create index licences_farm_idx on public.licences (farm_id);

create table public.favourites (
  user_id uuid not null references auth.users (id) on delete cascade,
  farm_id uuid not null references public.farms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, farm_id)
);

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 100),
  venue_type text not null default 'farm' check (venue_type in ('farm', 'farm_gate_stall', 'farm_shop', 'farmers_market')),
  state text not null check (state in ('NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT')),
  locality text not null,
  postcode text not null check (postcode ~ '^\d{4}$'),
  lat double precision not null check (lat between -45 and -9),
  lng double precision not null check (lng between 96 and 169),
  products text[] not null default '{}',
  notes text not null default '' check (char_length(notes) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'converted', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  abn text not null check (abn ~ '^\d{11}$'),
  phone text not null check (char_length(phone) between 8 and 20),
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (farm_id, user_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------- food-safety rules (see docs/COMPLIANCE.md)
-- Mirrors src/domain/compliance.ts. Returns e.g. {raw_milk_not_allowed, licence_missing:meat}.
create function public.farm_compliance_issues(p_farm uuid) returns text[]
language plpgsql stable security definer set search_path = public as $$
declare
  issues text[] := '{}';
  need text;
begin
  if exists (
    select 1 from public.products
    where farm_id = p_farm and category = 'milk' and coalesce(pasteurised, false) = false
  ) then
    issues := issues || 'raw_milk_not_allowed';
  end if;

  for need in
    select distinct case category
      when 'milk' then 'dairy' when 'eggs' then 'eggs' when 'chicken' then 'poultry'
      when 'beef' then 'meat' when 'lamb' then 'meat' when 'pork' then 'meat' end
    from public.products where farm_id = p_farm
  loop
    continue when need is null;
    if not exists (select 1 from public.licences where farm_id = p_farm and category = need) then
      issues := issues || ('licence_missing:' || need);
    elsif not exists (
      select 1 from public.licences
      where farm_id = p_farm and category = need and (expires_on is null or expires_on >= current_date)
    ) then
      issues := issues || ('licence_expired:' || need);
    end if;
  end loop;

  return issues;
end $$;

-- ------------------------------------------------------------------ guards
-- Farmers cannot publish themselves, hand over ownership, or edit review notes.
create function public.farms_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if public.is_admin() then
    return new;
  end if;

  -- Ownership never moves between people. The one exception is the automatic
  -- "set owner to null" when the owner deletes their own account (foreign key action;
  -- a direct update like this is still refused by the farms_update policy).
  if new.owner_id is distinct from old.owner_id
     and not (new.owner_id is null and old.owner_id = auth.uid()) then
    raise exception 'The owner of a listing cannot be changed';
  end if;
  if new.is_sample is distinct from old.is_sample then
    raise exception 'is_sample cannot be changed';
  end if;
  new.review_note := old.review_note;

  if new.status is distinct from old.status then
    if not (
      (old.status in ('draft', 'rejected') and new.status = 'pending')
      or (old.status = 'pending' and new.status = 'draft')
      or (old.status = 'live' and new.status in ('pending', 'draft'))
    ) then
      raise exception 'Status change % -> % is not allowed', old.status, new.status;
    end if;
    if old.status in ('draft', 'rejected') and new.status = 'pending'
       and cardinality(public.farm_compliance_issues(new.id)) > 0 then
      raise exception 'Listing has food-safety issues: %', public.farm_compliance_issues(new.id);
    end if;
  end if;

  -- Changing who/where a live listing is sends it back for review.
  if old.status = 'live' and new.status = 'live'
     and (new.name, new.type, new.state, new.locality, new.postcode, new.lat, new.lng)
         is distinct from (old.name, old.type, old.state, old.locality, old.postcode, old.lat, old.lng) then
    new.status := 'pending';
  end if;

  return new;
end $$;

create trigger farms_guard_trg before update on public.farms
  for each row execute function public.farms_guard();

-- Products/licences: keep "last updated" fresh; regulated changes on a live listing need re-review.
create function public.touch_farm_after_child() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  fid uuid := coalesce(new.farm_id, old.farm_id);
  regulated boolean := false;
begin
  update public.farms set updated_at = now() where id = fid;

  if tg_table_name = 'licences' then
    regulated := true;
  elsif tg_op = 'INSERT' then
    regulated := new.category in ('milk', 'eggs', 'chicken', 'beef', 'lamb', 'pork');
  elsif tg_op = 'UPDATE' then
    regulated := new.category is distinct from old.category
                 or new.pasteurised is distinct from old.pasteurised;
  end if;

  if regulated and not public.is_admin() then
    update public.farms set status = 'pending' where id = fid and status = 'live';
  end if;
  return coalesce(new, old);
end $$;

create trigger products_touch after insert or update or delete on public.products
  for each row execute function public.touch_farm_after_child();
create trigger licences_touch after insert or update or delete on public.licences
  for each row execute function public.touch_farm_after_child();

-- Only admins can mark a licence as checked; edits by owners reset it to self-declared.
create function public.licences_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'self_declared';
  elsif (new.category, new.regulator, new.licence_number, new.expires_on)
        is distinct from (old.category, old.regulator, old.licence_number, old.expires_on) then
    new.status := 'self_declared';
  else
    new.status := old.status;
  end if;
  return new;
end $$;

create trigger licences_guard_trg before insert or update on public.licences
  for each row execute function public.licences_guard();

-- Simple spam brake: at most 5 suggestions per person per day.
create function public.suggestions_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.suggestions
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You have reached today''s limit of 5 suggestions. Please try again tomorrow.';
  end if;
  return new;
end $$;

create trigger suggestions_limit_trg before insert on public.suggestions
  for each row execute function public.suggestions_limit();

-- ----------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.products enable row level security;
alter table public.licences enable row level security;
alter table public.favourites enable row level security;
alter table public.suggestions enable row level security;
alter table public.claims enable row level security;
alter table public.reports enable row level security;

create policy profiles_read on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = public.my_role());

create policy farms_read on public.farms for select
  using (status = 'live' or owner_id = auth.uid() or public.is_admin());
create policy farms_insert on public.farms for insert
  with check (
    public.is_admin()
    or (owner_id = auth.uid() and status = 'draft' and not is_sample
        and public.my_role() in ('farmer', 'admin'))
  );
create policy farms_update on public.farms for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy farms_delete on public.farms for delete
  using ((owner_id = auth.uid() and status in ('draft', 'rejected')) or public.is_admin());

create policy products_read on public.products for select
  using (exists (select 1 from public.farms f where f.id = farm_id));
create policy products_write on public.products for all
  using (exists (select 1 from public.farms f where f.id = farm_id and (f.owner_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.farms f where f.id = farm_id and (f.owner_id = auth.uid() or public.is_admin())));

create policy licences_read on public.licences for select
  using (exists (select 1 from public.farms f where f.id = farm_id));
create policy licences_write on public.licences for all
  using (exists (select 1 from public.farms f where f.id = farm_id and (f.owner_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.farms f where f.id = farm_id and (f.owner_id = auth.uid() or public.is_admin())));

create policy favourites_own on public.favourites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy suggestions_insert on public.suggestions for insert
  with check (user_id = auth.uid());
create policy suggestions_read on public.suggestions for select
  using (user_id = auth.uid() or public.is_admin());
create policy suggestions_admin_update on public.suggestions for update
  using (public.is_admin()) with check (public.is_admin());

create policy claims_insert on public.claims for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.farms f where f.id = farm_id and f.owner_id is null and f.status = 'live')
  );
create policy claims_read on public.claims for select
  using (user_id = auth.uid() or public.is_admin());

create policy reports_insert on public.reports for insert
  with check (user_id = auth.uid());
create policy reports_read on public.reports for select
  using (public.is_admin());

-- ------------------------------------------------------------ RPC functions
create function public.become_farmer() returns void
language sql security definer set search_path = public as $$
  update public.profiles set role = 'farmer' where id = auth.uid() and role = 'user';
$$;

-- Admin: approve, reject or ask for changes. Approval is blocked by food-safety issues.
create function public.review_farm(p_farm uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare issues text[];
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_decision = 'approve' then
    issues := public.farm_compliance_issues(p_farm);
    if cardinality(issues) > 0 then
      raise exception 'Cannot approve: %', issues;
    end if;
    update public.farms set status = 'live', review_note = null where id = p_farm;
  elsif p_decision = 'reject' then
    update public.farms set status = 'rejected', review_note = p_note where id = p_farm;
  elsif p_decision = 'request_changes' then
    update public.farms set status = 'draft', review_note = p_note where id = p_farm;
  else
    raise exception 'Unknown decision %', p_decision;
  end if;
end $$;

create function public.set_licence_checked(p_licence uuid, p_checked boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.licences set status = case when p_checked then 'admin_checked' else 'self_declared' end
  where id = p_licence;
end $$;

create function public.review_claim(p_claim uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare c public.claims;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into c from public.claims where id = p_claim;
  if c.id is null then raise exception 'Claim not found'; end if;
  if p_approve then
    if exists (select 1 from public.farms where id = c.farm_id and owner_id is not null) then
      raise exception 'This listing already has an owner';
    end if;
    update public.farms set owner_id = c.user_id where id = c.farm_id;
    update public.profiles set role = 'farmer' where id = c.user_id and role = 'user';
    update public.claims set status = 'approved' where id = p_claim;
    update public.claims set status = 'rejected'
      where farm_id = c.farm_id and id <> p_claim and status = 'pending';
  else
    update public.claims set status = 'rejected' where id = p_claim;
  end if;
end $$;

-- Admin: turn a suggestion into an unowned listing waiting for review.
create function public.convert_suggestion(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare s public.suggestions; fid uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into s from public.suggestions where id = p_id and status = 'pending';
  if s.id is null then raise exception 'Suggestion not found or already handled'; end if;
  insert into public.farms (owner_id, name, type, state, locality, postcode, lat, lng, story, status)
  values (null, s.name, s.venue_type, s.state, s.locality, s.postcode, s.lat, s.lng, s.notes, 'pending')
  returning id into fid;
  update public.suggestions set status = 'converted' where id = p_id;
  return fid;
end $$;

-- In-app account deletion (App Store requirement). Drafts go; reviewed listings become unowned.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from public.farms where owner_id = auth.uid() and status in ('draft', 'rejected');
  delete from auth.users where id = auth.uid();
end $$;
