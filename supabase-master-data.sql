create extension if not exists pgcrypto;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create table if not exists public.master_buyers (
  id uuid primary key default gen_random_uuid(),
  value text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.master_locations (
  id uuid primary key default gen_random_uuid(),
  value text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.master_order_statuses (
  id uuid primary key default gen_random_uuid(),
  value text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.master_buyers (value)
values
  ('ARIPL'),
  ('ARIPL_Fresh'),
  ('ARIPL_Now'),
  ('BigBasket'),
  ('Blinkit'),
  ('CityMall'),
  ('Clicktech'),
  ('ETRADE'),
  ('ETRADE_Fresh'),
  ('FirstCry'),
  ('fk-grocery'),
  ('fk-hyperlocal'),
  ('fk-national'),
  ('Purplle'),
  ('RK_World'),
  ('RK_World_Fresh'),
  ('RK_World_Now'),
  ('Swiggy'),
  ('Tatacliq'),
  ('Trumeds'),
  ('Urban'),
  ('Zepto')
on conflict (value) do nothing;

insert into public.master_locations (value)
values
  ('Ahmedabad'),
  ('Delhi'),
  ('Bangalore'),
  ('Lucknow'),
  ('Mumbai'),
  ('Kolkata'),
  ('Jaipur'),
  ('Rajpura'),
  ('Hyderabad'),
  ('Pune'),
  ('Indore'),
  ('Chennai'),
  ('Guwahati'),
  ('Gurugram'),
  ('Ghaziabad')
on conflict (value) do nothing;

insert into public.master_order_statuses (value)
values
  ('Confirmed'),
  ('Part Allocated'),
  ('Allocated')
on conflict (value) do nothing;

grant usage on schema public to authenticated;
grant select on public.master_buyers to authenticated;
grant select on public.master_locations to authenticated;
grant select on public.master_order_statuses to authenticated;
grant insert, update, delete on public.master_buyers to authenticated;
grant insert, update, delete on public.master_locations to authenticated;
grant insert, update, delete on public.master_order_statuses to authenticated;

alter table public.master_buyers enable row level security;
alter table public.master_locations enable row level security;
alter table public.master_order_statuses enable row level security;

drop policy if exists master_buyers_select on public.master_buyers;
create policy master_buyers_select
on public.master_buyers
for select
using (auth.role() = 'authenticated');

drop policy if exists master_buyers_admin_manage on public.master_buyers;
create policy master_buyers_admin_manage
on public.master_buyers
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists master_locations_select on public.master_locations;
create policy master_locations_select
on public.master_locations
for select
using (auth.role() = 'authenticated');

drop policy if exists master_locations_admin_manage on public.master_locations;
create policy master_locations_admin_manage
on public.master_locations
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists master_order_statuses_select on public.master_order_statuses;
create policy master_order_statuses_select
on public.master_order_statuses
for select
using (auth.role() = 'authenticated');

drop policy if exists master_order_statuses_admin_manage on public.master_order_statuses;
create policy master_order_statuses_admin_manage
on public.master_order_statuses
for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
