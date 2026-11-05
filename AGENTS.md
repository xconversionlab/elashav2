# ELASHA Artware & Apparel — working notes

React + Vite + TypeScript storefront and admin dashboard backed by Supabase.

## Run

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 12000   # http://localhost:12000
```

`npm run build` for the production bundle; `npx tsc --noEmit -p tsconfig.app.json`
and `npm run lint` for checks. Config comes from `.env`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

## Supabase provisioning

A correctly provisioned project needs the migrations in `supabase/migrations/`,
applied in filename order. For a fresh project, `supabase/provision.sql` is a
single ordered bundle generated from those files — paste it into the Supabase
SQL editor and run it once. It takes no elevated credentials beyond the editor.

It creates the schema, reference data, 28 products, 840 product variants
(`20261006052800_seed_product_variants.sql` — required for size/colour
selectors, add-to-cart, and the inventory dashboard), the public `artwork`
storage bucket with policies, the admin RLS policies, and a `handle_new_user`
trigger (`20261006053000_profile_on_signup.sql`) that creates a `profiles` row
for every new auth user.

The client only holds the anon key, so it cannot provision schema or storage
itself. If tables are missing, the storefront degrades to empty states and
registration fails on the missing `profiles` table.

### Auth settings

New signups need a confirmed email before they can sign in. In the Supabase
dashboard, either turn off Authentication → Providers → Email → "Confirm email"
for local/staging use, or confirm users yourself:

```sql
UPDATE auth.users SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;
```

Create your admin account (register through the app, then grant access):

```sql
UPDATE public.profiles SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = '<your-email>');
```

## Admin access

`20261006070000_admin_rls_policies.sql` adds `profiles.is_admin` and admin
`SELECT` policies for orders, order_items, custom_designs and profiles. Grant a
user with:

```sql
UPDATE public.profiles SET is_admin = true WHERE id = '<auth-user-uuid>';
```

The dashboard shows owner-scoped data until that flag is set for an account.

## Notes

- Custom artwork uploads try the `artwork` bucket first and fall back to a
  bounded inline base64 image when storage is unavailable (`src/lib/artwork.ts`).
- The storefront checkout uses Razorpay through the Supabase Edge Functions `create-razorpay-order` and `verify-razorpay-payment`.

## Motion layer gotcha

`src/components/motion/{Reveal,AnimatedImage}` drive scroll reveals through an
`IntersectionObserver` plus a `clip-path` wipe (`data-mask`). An element clipped
to `inset(0 0 100%)` has an empty intersection region, so an observer placed on
the clipped node never fires and the content stays hidden forever. Both
components therefore observe an *unclipped* wrapper and apply the wipe to a
child. Keep that split when editing the motion primitives — putting `data-mask`
directly on the observed element silently breaks every masked image/collection
tile in every browser.

## Security note

RLS policies are permissive (OR'd). `20261006070000_admin_rls_policies.sql`
must `DROP POLICY "profiles_update"` (from the base schema) before adding the
`is_admin`-aware update policies, or any authenticated user can set their own
`is_admin = true` and read every customer's data. Keep that drop when editing
either the migration or `supabase/provision.sql`.

## Production security checks

- A valid Supabase session persists in browser storage. An already-authenticated admin can revisit `/admin` without entering the password again; this is normal session behavior. The admin UI must still fail closed unless the user is authenticated and their database profile has `is_admin = true`. Verify the logged-out flow in a clean/incognito session and confirm the database RLS policies independently.
- Apply `supabase/migrations/20261014090000_secure_order_insert_policies.sql` to the existing live database using the migration workflow after reviewing the deployed checkout functions. It removes client-side INSERT policies for `orders` and `order_items`, and only permits customer custom-design submissions that remain pending and match an active garment's base price.
- The order-integrity migration requires `create-razorpay-order` and `verify-razorpay-payment` to create orders using a server-side service-role client after validating item ownership, current prices, inventory, Razorpay order ID/signature, and replay/idempotency. Never put the service-role key in `VITE_*` variables or client code.
- The current Git repository tree does not contain `supabase/functions/` source for those two checkout functions. Before declaring the store production-ready, retrieve/version their actual deployed sources, audit and test them in Razorpay test mode, and confirm the migrations are applied to the live Supabase project. Do not run the full provisioning bundle blindly against an existing production database.
