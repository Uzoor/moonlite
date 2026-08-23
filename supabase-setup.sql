-- =====================================================================
-- Moon Lite's Footwear — SUPABASE SETUP
-- ---------------------------------------------------------------------
-- Run this ONCE in your Supabase project:
--   Supabase dashboard → SQL Editor → New query → paste all of this → Run
--
-- It is safe to run more than once (nothing is destroyed).
--
-- What it creates:
--   • products  — the catalogue. Anyone may read; only a signed-in user writes.
--   • settings  — one row holding the business details (WhatsApp number etc).
--   • product-photos — a public storage bucket for photos.
--
-- Security model: the site ships a public "anon" key, which is normal and
-- safe. These row-level-security policies are what actually protect you —
-- the public can only READ. Every write requires a signed-in account, which
-- you create yourself under Authentication → Users.
-- =====================================================================

-- ---------------------------------------------------------------- products
create table if not exists public.products (
  id          text primary key,
  name        text not null default '',
  subtitle    text default '',
  category    text default '',
  price       numeric not null default 0,
  old_price   numeric,
  stock       integer not null default 0,
  badge       text default '',
  description text default '',
  sizes       jsonb not null default '[]'::jsonb,
  colors      jsonb not null default '[]'::jsonb,
  images      jsonb not null default '[]'::jsonb,
  featured    boolean not null default false,
  sold_out    boolean not null default false,
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists products_sort_idx on public.products (sort, name);

alter table public.products enable row level security;

drop policy if exists "products are readable by everyone" on public.products;
create policy "products are readable by everyone"
  on public.products for select
  using (true);

drop policy if exists "signed-in users can add products" on public.products;
create policy "signed-in users can add products"
  on public.products for insert
  to authenticated
  with check (true);

drop policy if exists "signed-in users can edit products" on public.products;
create policy "signed-in users can edit products"
  on public.products for update
  to authenticated
  using (true) with check (true);

drop policy if exists "signed-in users can delete products" on public.products;
create policy "signed-in users can delete products"
  on public.products for delete
  to authenticated
  using (true);

-- keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- settings
create table if not exists public.settings (
  id         integer primary key default 1,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint settings_single_row check (id = 1)
);

insert into public.settings (id, data)
  values (1, '{}'::jsonb)
  on conflict (id) do nothing;

alter table public.settings enable row level security;

drop policy if exists "settings are readable by everyone" on public.settings;
create policy "settings are readable by everyone"
  on public.settings for select
  using (true);

drop policy if exists "signed-in users can add settings" on public.settings;
create policy "signed-in users can add settings"
  on public.settings for insert
  to authenticated
  with check (true);

drop policy if exists "signed-in users can edit settings" on public.settings;
create policy "signed-in users can edit settings"
  on public.settings for update
  to authenticated
  using (true) with check (true);

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at
  before update on public.settings
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------- photo storage
insert into storage.buckets (id, name, public)
  values ('product-photos', 'product-photos', true)
  on conflict (id) do update set public = true;

drop policy if exists "product photos are viewable by everyone" on storage.objects;
create policy "product photos are viewable by everyone"
  on storage.objects for select
  using (bucket_id = 'product-photos');

drop policy if exists "signed-in users can upload product photos" on storage.objects;
create policy "signed-in users can upload product photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-photos');

drop policy if exists "signed-in users can replace product photos" on storage.objects;
create policy "signed-in users can replace product photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-photos')
  with check (bucket_id = 'product-photos');

drop policy if exists "signed-in users can delete product photos" on storage.objects;
create policy "signed-in users can delete product photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-photos');

-- =====================================================================
-- Done. Next:
--   1. Authentication → Users → Add user → give the shop owner an email
--      and password (tick "Auto Confirm User" so she can sign in at once).
--   2. Authentication → Providers → Email → turn OFF "Enable sign ups"
--      so nobody can create their own account.
--   3. Project Settings → API → copy the Project URL and the anon public
--      key into assets/js/config.js.
--   4. Open the dashboard, sign in, and use "Upload catalogue to the
--      database" once to send the starting products up.
-- =====================================================================
