-- Before running this script:
-- 1. Create your owner account in Supabase Authentication > Users.
-- 2. Confirm that the owner UUID below matches your Supabase Auth user ID.
-- 3. Keep public sign-ups disabled in Authentication settings.

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  category text not null default 'Other' check (char_length(category) <= 60),
  price numeric(12, 2) check (price is null or price >= 0),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'wanted' check (status in ('wanted', 'ordered', 'owned')),
  reserved boolean not null default false,
  reserved_at timestamptz,
  url text not null default '' check (char_length(url) <= 2048),
  image text not null default '' check (char_length(image) <= 2048),
  note text not null default '' check (char_length(note) <= 240),
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- Safe migration for databases created with the original schema.
alter table public.wishlist_items add column if not exists priority text not null default 'medium';
alter table public.wishlist_items add column if not exists status text not null default 'wanted';
alter table public.wishlist_items add column if not exists reserved boolean not null default false;
alter table public.wishlist_items add column if not exists reserved_at timestamptz;

update public.wishlist_items
set priority = 'medium'
where priority is null or priority not in ('high', 'medium', 'low');

update public.wishlist_items
set status = 'wanted'
where status is null or status not in ('wanted', 'ordered', 'owned');

alter table public.wishlist_items drop constraint if exists wishlist_items_priority_check;
alter table public.wishlist_items add constraint wishlist_items_priority_check check (priority in ('high', 'medium', 'low'));
alter table public.wishlist_items drop constraint if exists wishlist_items_status_check;
alter table public.wishlist_items add constraint wishlist_items_status_check check (status in ('wanted', 'ordered', 'owned'));

-- Public gift reservations do not expose the reserver's identity and are race-safe.
create or replace function public.reserve_wishlist_item(item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.wishlist_items
  set reserved = true, reserved_at = now()
  where id = item_id and status = 'wanted' and reserved = false;
  return found;
end;
$$;

revoke all on function public.reserve_wishlist_item(uuid) from public;
grant execute on function public.reserve_wishlist_item(uuid) to anon, authenticated;

-- Uploaded images are public because wishlist cards are public.
insert into storage.buckets (id, name, public)
values ('wishlist-images', 'wishlist-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can view wishlist images" on storage.objects;
create policy "Anyone can view wishlist images"
  on storage.objects for select
  using (bucket_id = 'wishlist-images');

drop policy if exists "Owner can upload wishlist images" on storage.objects;
create policy "Owner can upload wishlist images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'wishlist-images' and auth.uid() = '4b9d3d9e-1e06-428e-b238-9305457c89c2'::uuid);

drop policy if exists "Owner can update wishlist images" on storage.objects;
create policy "Owner can update wishlist images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'wishlist-images' and auth.uid() = '4b9d3d9e-1e06-428e-b238-9305457c89c2'::uuid)
  with check (bucket_id = 'wishlist-images' and auth.uid() = '4b9d3d9e-1e06-428e-b238-9305457c89c2'::uuid);

drop policy if exists "Owner can delete wishlist images" on storage.objects;
create policy "Owner can delete wishlist images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'wishlist-images' and auth.uid() = '4b9d3d9e-1e06-428e-b238-9305457c89c2'::uuid);

alter table public.wishlist_items enable row level security;

revoke all on public.wishlist_items from anon, authenticated;
grant select on public.wishlist_items to anon, authenticated;
grant insert, update, delete on public.wishlist_items to authenticated;

drop policy if exists "Anyone can view wishlist items" on public.wishlist_items;
create policy "Anyone can view wishlist items"
  on public.wishlist_items for select
  using (true);

drop policy if exists "Only owner can add wishlist items" on public.wishlist_items;
create policy "Only owner can add wishlist items"
  on public.wishlist_items for insert
  to authenticated
  with check (auth.uid() = '4b9d3d9e-1e06-428e-b238-9305457c89c2'::uuid);

drop policy if exists "Only owner can edit wishlist items" on public.wishlist_items;
create policy "Only owner can edit wishlist items"
  on public.wishlist_items for update
  to authenticated
  using (auth.uid() = '4b9d3d9e-1e06-428e-b238-9305457c89c2'::uuid)
  with check (auth.uid() = '4b9d3d9e-1e06-428e-b238-9305457c89c2'::uuid);

drop policy if exists "Only owner can remove wishlist items" on public.wishlist_items;
create policy "Only owner can remove wishlist items"
  on public.wishlist_items for delete
  to authenticated
  using (auth.uid() = '4b9d3d9e-1e06-428e-b238-9305457c89c2'::uuid);
