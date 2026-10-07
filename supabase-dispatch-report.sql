create extension if not exists pgcrypto;

alter table public.orders
add column if not exists vehicle_type text;

create table if not exists public.dispatch_reports (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique,
  order_number text not null,
  appointment_date date,
  buyer_code text,
  buyer_name text,
  location text,
  dispatched_at timestamptz not null,
  vehicle_number text not null,
  vehicle_type text not null,
  boxes numeric,
  dispatch_status text not null default 'Dispatched',
  created_by_user text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dispatch_reports_dispatched_at on public.dispatch_reports(dispatched_at desc);
create index if not exists idx_dispatch_reports_order_number on public.dispatch_reports(order_number);
create index if not exists idx_dispatch_reports_location on public.dispatch_reports(location);

create or replace function public.touch_dispatch_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_dispatch_reports_updated_at on public.dispatch_reports;
create trigger trg_touch_dispatch_reports_updated_at
before update on public.dispatch_reports
for each row
execute function public.touch_dispatch_reports_updated_at();

grant usage on schema public to authenticated;
grant select, insert, update on public.dispatch_reports to authenticated;

alter table public.dispatch_reports enable row level security;

drop policy if exists dispatch_reports_select on public.dispatch_reports;
create policy dispatch_reports_select
on public.dispatch_reports
for select
using (auth.role() = 'authenticated');

drop policy if exists dispatch_reports_insert on public.dispatch_reports;
create policy dispatch_reports_insert
on public.dispatch_reports
for insert
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('fc', 'fc admin', 'admin')
  )
);

drop policy if exists dispatch_reports_update on public.dispatch_reports;
create policy dispatch_reports_update
on public.dispatch_reports
for update
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('fc', 'fc admin', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('fc', 'fc admin', 'admin')
  )
);
