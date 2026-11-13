# Connecting the backend (Supabase)

Until you do this, the app runs on built-in **sample data** with no accounts. Everything below can be done from an iPhone browser.

## 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) and create a project. Choose the **Sydney (ap-southeast-2)** region so data stays in Australia and is fast for regional users.
2. **Authentication → Providers → Email:** keep it on. Keep **Confirm email** on (recommended) so people can't sign up with someone else's address.
3. **Authentication → URL configuration:** leave the defaults for now. (A branded confirmation page can come later.)

## 2. Create the tables and security rules

Open **SQL Editor** and run, in order:

1. `supabase/migrations/0001_init.sql` – tables, row-level security, the review workflow and food-safety rules.
2. `supabase/migrations/0002_storage.sql` – the `farm-photos` bucket and its upload rules.

`0001_init.sql` is tested by `npm run test:sql` (28 checks run against a real Postgres engine): who can see what, farmers can't publish their own listings, raw milk and unlicensed meat can't be approved, licence status can't be faked, claims, suggestions, and account deletion. `0002_storage.sql` can only be checked on Supabase itself, so try uploading a photo after step 4.

No sample farms are put in the live database. Real listings arrive through the app (see `docs/REAL_LISTINGS.md`).

## 3. Give the app the project address

In **Project Settings → API** copy the *Project URL* and the *anon public* key (the anon key is designed to be public; the security rules protect the data). Never use the `service_role` key in the app.

- **Local / Expo Go previews:** copy `.env.example` to `.env` and fill in both values.
- **EAS builds (TestFlight):** add both as EAS environment variables named `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (expo.dev → your project → Environment variables), visible to the `preview` and `production` environments.

## 4. Make yourself the administrator

1. Open the app, create an account, and confirm your email.
2. In the SQL Editor run (with your email):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Close and reopen the app. The Account tab now shows the **Review queue**.

Only an administrator can approve listings and claims, and only this SQL (run by you in the Supabase dashboard) can make an administrator.

## 5. Load the researched leads (optional)

`supabase/seed/candidate-suggestions.sql` adds 8 real farmers’ markets (one or two per state and territory, except Victoria) as **pending suggestions**, not live listings. Run it in the SQL editor after the migrations. They appear in the Review queue under *Suggested places*; check each with its operator before converting it. How they were found, what is uncertain, and what was left out: `docs/research/candidate-markets.md`. Running it twice does nothing.

## How reviews work

| Who | What they can do |
|---|---|
| Anyone | See **live** listings, products and licences |
| Signed-in customer | Save favourites, suggest farms (5 a day), claim an unowned live listing, report a listing |
| Farmer (free, one tap) | Create drafts, edit own listings, toggle stock and prices, add photos, submit for review |
| Administrator | Review the queue: approve, ask for changes, reject; confirm licences; approve claims; turn suggestions into listings |

Listing status: `draft → pending → live` (or `rejected`). A farmer can never set `live`. Editing a live listing's name or location, adding a regulated product (milk, eggs, meat) or changing a licence sends it back to `pending`. Stock, price, opening hours and story edits stay live and refresh the listing's "last updated" date.

## Later: scale

The app filters and sorts listings on the phone, which also powers the offline cache, and is fine up to a few thousand listings. If you outgrow that, add PostGIS and a "listings near me" function in a new migration.
