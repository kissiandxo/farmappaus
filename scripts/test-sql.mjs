// Runs supabase/migrations/0001_init.sql in an in-process Postgres (PGlite) and checks the
// security rules and review workflow. Usage: npm run test:sql
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
// PGlite's multi-statement SQL runner (not a shell command).
const runScript = db.exec.bind(db);
const sql = readFileSync(new URL('../supabase/migrations/0001_init.sql', import.meta.url), 'utf8');

// Minimal stand-in for Supabase's auth schema and roles.
await runScript(`
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid());
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon; create role authenticated;
`);
await runScript(sql);
await runScript(`
  grant usage on schema public, auth to anon, authenticated;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant select on auth.users to anon, authenticated;
  grant delete on auth.users to authenticated;
  grant execute on all functions in schema public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    console.error(`FAIL  ${name}\n      ${e.message}`);
    process.exitCode = 1;
  }
}
const one = async (q, p) => (await db.query(q, p)).rows[0];
const rows = async (q, p) => (await db.query(q, p)).rows;

async function as(user, fn) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? '']);
  await runScript(user ? 'set role authenticated' : 'set role anon');
  try {
    return await fn();
  } finally {
    await runScript('reset role');
  }
}
async function rejects(fn, pattern) {
  try {
    await fn();
  } catch (e) {
    if (pattern) assert.match(e.message, pattern);
    return;
  }
  assert.fail('expected the statement to be rejected');
}

async function newUser(role = 'user') {
  const { id } = await one('insert into auth.users default values returning id');
  if (role !== 'user') await db.query('update public.profiles set role = $1 where id = $2', [role, id]);
  return id;
}
const farmSql = `insert into public.farms (owner_id, name, type, state, locality, postcode, lat, lng, status)
  values ($1, $2, 'farm', 'QLD', 'Toowoomba', '4350', -27.56, 151.95, $3) returning id`;
async function addFarm(owner, name = 'Test Farm', status = 'draft') {
  return (await one(farmSql, [owner, name, status])).id;
}
const addProduct = (farm, category, extra = {}) =>
  db.query(
    'insert into public.products (farm_id, category, name, price_cents, pasteurised) values ($1,$2,$3,500,$4)',
    [farm, category, `${category} product`, extra.pasteurised ?? null],
  );
const addLicence = (farm, category, expires = null) =>
  db.query(
    "insert into public.licences (farm_id, category, regulator, licence_number, expires_on) values ($1,$2,'Test Regulator','T-1',$3)",
    [farm, category, expires],
  );
const status = async (farm) => (await one('select status from public.farms where id = $1', [farm])).status;

const admin = await newUser('admin');
const farmer = await newUser('farmer');
const other = await newUser('farmer');
const visitor = await newUser();

console.log('Profiles and roles');
await test('a profile is created automatically for every new user', async () => {
  assert.equal((await one('select count(*)::int n from public.profiles')).n, 4);
});
await test('a user cannot make themselves admin', async () => {
  await rejects(() => as(visitor, () => db.query("update public.profiles set role = 'admin' where id = $1", [visitor])), /row-level security/);
  assert.equal((await one('select role from public.profiles where id = $1', [visitor])).role, 'user');
});
await test('become_farmer upgrades a user, and does not touch admins', async () => {
  await as(visitor, () => db.query('select public.become_farmer()'));
  assert.equal((await one('select role from public.profiles where id = $1', [visitor])).role, 'farmer');
  await as(admin, () => db.query('select public.become_farmer()'));
  assert.equal((await one('select role from public.profiles where id = $1', [admin])).role, 'admin');
  await db.query("update public.profiles set role = 'user' where id = $1", [visitor]);
});

console.log('Visibility');
const liveFarm = await addFarm(farmer, 'Live Farm', 'live');
const draftFarm = await addFarm(farmer, 'Draft Farm', 'draft');
await test('the public only sees live listings', async () => {
  const seen = await as(null, () => rows('select name from public.farms order by name'));
  assert.deepEqual(seen.map((r) => r.name), ['Live Farm']);
});
await test('owners see their own drafts, other farmers do not', async () => {
  const mine = await as(farmer, () => rows('select name from public.farms order by name'));
  assert.deepEqual(mine.map((r) => r.name), ['Draft Farm', 'Live Farm']);
  const theirs = await as(other, () => rows('select name from public.farms'));
  assert.deepEqual(theirs.map((r) => r.name), ['Live Farm']);
});
await test('admins see everything', async () => {
  assert.equal((await as(admin, () => rows('select 1 from public.farms'))).length, 2);
});

console.log('Creating and submitting listings');
await test('only farmers can create listings, and only as drafts owned by themselves', async () => {
  await rejects(() => as(visitor, () => addFarm(visitor)));
  await rejects(() => as(farmer, () => addFarm(farmer, 'Sneaky', 'live')));
  await rejects(() => as(farmer, () => addFarm(other, 'Impersonation')));
  const id = await as(farmer, () => addFarm(farmer, 'Fine'));
  assert.ok(id);
});
await test('a farmer cannot publish their own listing', async () => {
  await rejects(() => as(farmer, () => db.query("update public.farms set status = 'live' where id = $1", [draftFarm])), /not allowed/);
});
await test('submitting for review is blocked until food-safety rules are met', async () => {
  const f = await addFarm(farmer, 'Meat Farm');
  await addProduct(f, 'beef');
  await rejects(() => as(farmer, () => db.query("update public.farms set status = 'pending' where id = $1", [f])), /licence_missing:meat/);
  await addLicence(f, 'meat');
  await as(farmer, () => db.query("update public.farms set status = 'pending' where id = $1", [f]));
  assert.equal(await status(f), 'pending');
});
await test('raw milk can never be submitted', async () => {
  const f = await addFarm(farmer, 'Raw Milk Farm');
  await addProduct(f, 'milk', { pasteurised: false });
  await addLicence(f, 'dairy');
  await rejects(() => as(farmer, () => db.query("update public.farms set status = 'pending' where id = $1", [f])), /raw_milk_not_allowed/);
});
await test('an expired licence does not count', async () => {
  const f = await addFarm(farmer, 'Expired Farm');
  await addProduct(f, 'eggs');
  await addLicence(f, 'eggs', '2020-01-01');
  assert.deepEqual((await one('select public.farm_compliance_issues($1) a', [f])).a, ['licence_expired:eggs']);
});
await test('honey, fruit and vegetables need no licence', async () => {
  const f = await addFarm(farmer, 'Veg Farm');
  await addProduct(f, 'veg');
  await addProduct(f, 'honey');
  assert.deepEqual((await one('select public.farm_compliance_issues($1) a', [f])).a, []);
});

console.log('Review workflow');
await test('only admins can review', async () => {
  await rejects(() => as(farmer, () => db.query("select public.review_farm($1, 'approve')", [draftFarm])), /Admins only/);
});
await test('admin can approve a clean listing and request changes with a note', async () => {
  const f = await addFarm(farmer, 'Review Me');
  await addProduct(f, 'veg');
  await as(farmer, () => db.query("update public.farms set status = 'pending' where id = $1", [f]));
  await as(admin, () => db.query("select public.review_farm($1, 'request_changes', 'Add a photo')", [f]));
  const r = await one('select status, review_note from public.farms where id = $1', [f]);
  assert.deepEqual(r, { status: 'draft', review_note: 'Add a photo' });
  await as(farmer, () => db.query("update public.farms set status = 'pending' where id = $1", [f]));
  await as(admin, () => db.query("select public.review_farm($1, 'approve')", [f]));
  assert.deepEqual(await one('select status, review_note from public.farms where id = $1', [f]), { status: 'live', review_note: null });
});
await test('admin cannot approve a listing with food-safety issues', async () => {
  const f = await addFarm(farmer, 'Unsafe');
  await addProduct(f, 'pork');
  await rejects(() => as(admin, () => db.query("select public.review_farm($1, 'approve')", [f])), /Cannot approve/);
});
await test('a rejected listing can be fixed and resubmitted, and the note stays admin-only', async () => {
  const f = await addFarm(farmer, 'Rejected One');
  await as(admin, () => db.query("select public.review_farm($1, 'reject', 'Not a farm')", [f]));
  await as(farmer, () => db.query("update public.farms set review_note = 'hacked', story = 'better' where id = $1", [f]));
  assert.equal((await one('select review_note from public.farms where id = $1', [f])).review_note, 'Not a farm');
  await as(farmer, () => db.query("update public.farms set status = 'pending' where id = $1", [f]));
  assert.equal(await status(f), 'pending');
});

console.log('Edits to live listings');
await test('stock and price changes keep a live listing live, and refresh "updated"', async () => {
  const f = await addFarm(farmer, 'Stock Farm', 'live');
  await addProduct(f, 'veg');
  await db.query("update public.farms set updated_at = '2020-01-01' where id = $1", [f]);
  await as(farmer, () => db.query('update public.products set in_stock = false, price_cents = 900 where farm_id = $1', [f]));
  assert.equal(await status(f), 'live');
  assert.ok((await one("select updated_at > '2025-01-01' ok from public.farms where id = $1", [f])).ok);
});
await test('adding a regulated product or a licence sends a live listing back for review', async () => {
  const f = await addFarm(farmer, 'Grows Farm', 'live');
  await as(farmer, () => addProduct(f, 'beef'));
  assert.equal(await status(f), 'pending');
  const g = await addFarm(farmer, 'Licence Farm', 'live');
  await as(farmer, () => addLicence(g, 'meat'));
  assert.equal(await status(g), 'pending');
});
await test('changing the name or location of a live listing needs re-review', async () => {
  const f = await addFarm(farmer, 'Renamer', 'live');
  await as(farmer, () => db.query("update public.farms set story = 'new story' where id = $1", [f]));
  assert.equal(await status(f), 'live');
  await as(farmer, () => db.query("update public.farms set name = 'New Name' where id = $1", [f]));
  assert.equal(await status(f), 'pending');
});
await test('owners cannot edit other farmers’ listings or hand over ownership', async () => {
  const mine = await addFarm(farmer, 'Mine', 'live');
  await as(other, () => db.query("update public.farms set story = 'taken' where id = $1", [mine]));
  assert.equal((await one('select story from public.farms where id = $1', [mine])).story, '');
  await rejects(() => as(farmer, () => db.query('update public.farms set owner_id = $1 where id = $2', [other, mine])));
});
await test('owners cannot mark their own licence as checked; admins can; edits reset it', async () => {
  const f = await addFarm(farmer, 'Lic Farm');
  await as(farmer, () => addLicence(f, 'meat'));
  const lic = (await one('select id from public.licences where farm_id = $1', [f])).id;
  await as(farmer, () => db.query("update public.licences set status = 'admin_checked' where id = $1", [lic]));
  assert.equal((await one('select status from public.licences where id = $1', [lic])).status, 'self_declared');
  await as(admin, () => db.query('select public.set_licence_checked($1, true)', [lic]));
  assert.equal((await one('select status from public.licences where id = $1', [lic])).status, 'admin_checked');
  await as(farmer, () => db.query("update public.licences set licence_number = 'NEW-2' where id = $1", [lic]));
  assert.equal((await one('select status from public.licences where id = $1', [lic])).status, 'self_declared');
});

console.log('Favourites, suggestions, claims, reports');
await test('favourites are private to each user', async () => {
  await as(visitor, () => db.query('insert into public.favourites (user_id, farm_id) values ($1, $2)', [visitor, liveFarm]));
  assert.equal((await as(visitor, () => rows('select 1 from public.favourites'))).length, 1);
  assert.equal((await as(other, () => rows('select 1 from public.favourites'))).length, 0);
  await rejects(() => as(other, () => db.query('insert into public.favourites (user_id, farm_id) values ($1, $2)', [visitor, liveFarm])));
});
const sug = `insert into public.suggestions (user_id, name, state, locality, postcode, lat, lng, notes)
  values ($1, $2, 'VIC', 'Daylesford', '3460', -37.35, 144.15, 'Great honey') returning id`;
await test('suggestions need sign-in, are limited to 5 a day, and convert to unowned pending listings', async () => {
  await rejects(() => as(null, () => db.query(sug, [null, 'Anon Farm'])));
  const id = (await as(visitor, () => one(sug, [visitor, 'Honey Place']))).id;
  assert.equal((await as(other, () => rows('select 1 from public.suggestions'))).length, 0);
  for (let i = 0; i < 4; i++) await as(visitor, () => one(sug, [visitor, `Extra ${i}`]));
  await rejects(() => as(visitor, () => one(sug, [visitor, 'One too many'])), /limit of 5/);
  const farmId = (await as(admin, () => one('select public.convert_suggestion($1) id', [id]))).id;
  assert.deepEqual(await one('select status, owner_id from public.farms where id = $1', [farmId]), { status: 'pending', owner_id: null });
  assert.equal((await one('select status from public.suggestions where id = $1', [id])).status, 'converted');
});
await test('a claim on an unowned live listing makes the claimant its owner once approved', async () => {
  const unowned = await addFarm(null, 'Unowned Farm', 'live');
  await rejects(() => as(other, () => db.query("insert into public.claims (farm_id, user_id, abn, phone) values ($1,$2,'12345678901','0400000000')", [liveFarm, other])));
  await as(other, () => db.query("insert into public.claims (farm_id, user_id, abn, phone) values ($1,$2,'12345678901','0400000000')", [unowned, other]));
  const claim = (await one('select id from public.claims where farm_id = $1', [unowned])).id;
  await rejects(() => as(other, () => db.query('select public.review_claim($1, true)', [claim])), /Admins only/);
  await as(admin, () => db.query('select public.review_claim($1, true)', [claim]));
  assert.equal((await one('select owner_id from public.farms where id = $1', [unowned])).owner_id, other);
});
await test('claims need a valid 11-digit ABN', async () => {
  const unowned = await addFarm(null, 'ABN Farm', 'live');
  await rejects(() => as(visitor, () => db.query("insert into public.claims (farm_id, user_id, abn, phone) values ($1,$2,'123','0400000000')", [unowned, visitor])), /abn/);
});
await test('reports are write-only for users and readable by admins', async () => {
  await as(visitor, () => db.query("insert into public.reports (farm_id, user_id, reason) values ($1,$2,'Wrong phone number')", [liveFarm, visitor]));
  assert.equal((await as(visitor, () => rows('select 1 from public.reports'))).length, 0);
  assert.equal((await as(admin, () => rows('select 1 from public.reports'))).length, 1);
});

console.log('Account deletion');
await test('deleting an account removes drafts and unowns reviewed listings', async () => {
  const leaver = await newUser('farmer');
  const d = await addFarm(leaver, 'Leaver Draft');
  const l = await addFarm(leaver, 'Leaver Live', 'live');
  await as(leaver, () => db.query('select public.delete_my_account()'));
  assert.equal((await rows('select 1 from public.farms where id = $1', [d])).length, 0);
  assert.equal((await one('select owner_id from public.farms where id = $1', [l])).owner_id, null);
  assert.equal((await rows('select 1 from auth.users where id = $1', [leaver])).length, 0);
});
await test('an owner cannot simply walk away from a listing with a direct update', async () => {
  const f = await addFarm(farmer, 'Stays Owned', 'live');
  await rejects(() => as(farmer, () => db.query('update public.farms set owner_id = null where id = $1', [f])), /row-level security/);
  assert.equal((await one('select owner_id from public.farms where id = $1', [f])).owner_id, farmer);
});

console.log(`\n${passed} database checks passed${process.exitCode ? ' (with failures above)' : ''}`);
