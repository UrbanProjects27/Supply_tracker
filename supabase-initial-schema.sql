-- DispatchFlow initial schema for a new Supabase project.
-- This migration explicitly grants Data API access and enables RLS on every
-- application table. The frontend must use only the publishable API key.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'sales' check (role in ('admin', 'sales', 'ops', 'fc', 'fc admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fc_location_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  location text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, location)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  appointment_date date not null,
  buyer_code text not null,
  buyer_name text not null,
  order_number text not null unique,
  order_status text not null,
  location text not null,
  appointment_id text not null,
  max_qty numeric not null check (max_qty >= 0),
  time_slot time not null,
  status text not null default 'Pending',
  picklist_number numeric,
  picklist_qty numeric,
  vehicle_number text,
  vehicle_type text,
  boxes numeric check (boxes is null or boxes > 0),
  dispatch_status text not null default 'Pending' check (dispatch_status in ('Pending', 'Dispatched')),
  created_by_user text,
  last_updated_by_user text,
  sales_entry_timestamp timestamptz,
  deleted_at timestamptz,
  deleted_by_user text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_audit_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_by_user text,
  changed_at timestamptz not null default now(),
  row_before jsonb,
  row_after jsonb
);

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

create table if not exists public.dispatch_reports (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique,
  order_number text not null,
  appointment_date date,
  buyer_code text,
  buyer_name text,
  location text,
  dispatched_at timestamptz not null,
  vehicle_number text not null,
  vehicle_type text not null,
  boxes numeric check (boxes is null or boxes > 0),
  dispatch_status text not null default 'Dispatched' check (dispatch_status in ('Pending', 'Dispatched')),
  created_by_user text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_appointment_date on public.orders(appointment_date);
create index if not exists idx_orders_location on public.orders(location);
create index if not exists idx_orders_buyer_code on public.orders(buyer_code);
create index if not exists idx_orders_dispatch_status on public.orders(dispatch_status);
create index if not exists idx_orders_picklist_number on public.orders(picklist_number);
create index if not exists idx_orders_active_appointment_date on public.orders(appointment_date) where deleted_at is null;
create index if not exists idx_orders_active_location on public.orders(location) where deleted_at is null;
create index if not exists idx_orders_active_buyer_code on public.orders(buyer_code) where deleted_at is null;
create index if not exists idx_orders_active_dispatch_status on public.orders(dispatch_status) where deleted_at is null;
create index if not exists idx_order_audit_log_order_id on public.order_audit_log(order_id);
create index if not exists idx_order_audit_log_changed_at on public.order_audit_log(changed_at desc);
create index if not exists idx_dispatch_reports_dispatched_at on public.dispatch_reports(dispatched_at desc);
create index if not exists idx_dispatch_reports_order_number on public.dispatch_reports(order_number);
create index if not exists idx_dispatch_reports_location on public.dispatch_reports(location);

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

create or replace function public.is_fc_location_allowed(target_location text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.fc_location_access
    where user_id = auth.uid()
      and location = target_location
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when lower(new.email) = 'mis@urbanretail.in' then 'admin' else 'sales' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.audit_order_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_audit_log (order_id, action, changed_by_user, row_after)
    values (new.id, 'INSERT', new.last_updated_by_user, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.order_audit_log (order_id, action, changed_by_user, row_before, row_after)
    values (new.id, 'UPDATE', new.last_updated_by_user, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.order_audit_log (order_id, action, changed_by_user, row_before)
    values (old.id, 'DELETE', old.last_updated_by_user, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

create or replace function public.enforce_order_role_field_protection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_name text;
begin
  role_name := public.current_user_role();

  if tg_op = 'INSERT' then
    if role_name = 'admin' then
      return new;
    end if;
    if role_name <> 'sales' then
      raise exception 'Only Sales Team or Admin can create orders.';
    end if;
    if new.picklist_number is not null
       or new.picklist_qty is not null
       or coalesce(new.vehicle_number, '') <> ''
       or coalesce(new.vehicle_type, '') <> ''
       or new.boxes is not null
       or new.dispatch_status <> 'Pending'
       or new.deleted_at is not null
       or new.deleted_by_user is not null then
      raise exception 'Sales Team cannot set picklist, dispatch, or delete fields while creating an order.';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if role_name = 'admin' then
      return old;
    end if;
    raise exception 'Only Admin can permanently delete orders.';
  end if;

  if role_name = 'admin' then
    return new;
  end if;

  if role_name = 'sales' then
    if new.deleted_at is distinct from old.deleted_at
       or new.deleted_by_user is distinct from old.deleted_by_user then
      if old.picklist_number is not null and old.picklist_number <> 0 then
        raise exception 'Sales Team can soft delete only when picklist is pending.';
      end if;
      if new.appointment_date is distinct from old.appointment_date
         or new.buyer_code is distinct from old.buyer_code
         or new.buyer_name is distinct from old.buyer_name
         or new.order_number is distinct from old.order_number
         or new.order_status is distinct from old.order_status
         or new.location is distinct from old.location
         or new.appointment_id is distinct from old.appointment_id
         or new.max_qty is distinct from old.max_qty
         or new.time_slot is distinct from old.time_slot
         or new.status is distinct from old.status
         or new.picklist_number is distinct from old.picklist_number
         or new.picklist_qty is distinct from old.picklist_qty
         or new.vehicle_number is distinct from old.vehicle_number
         or new.vehicle_type is distinct from old.vehicle_type
         or new.boxes is distinct from old.boxes
         or new.dispatch_status is distinct from old.dispatch_status
         or new.created_by_user is distinct from old.created_by_user
         or new.sales_entry_timestamp is distinct from old.sales_entry_timestamp then
        raise exception 'Sales Team soft delete must not change other order fields.';
      end if;
      return new;
    end if;

    if new.picklist_number is distinct from old.picklist_number
       or new.picklist_qty is distinct from old.picklist_qty
       or new.vehicle_number is distinct from old.vehicle_number
       or new.vehicle_type is distinct from old.vehicle_type
       or new.boxes is distinct from old.boxes
       or new.dispatch_status is distinct from old.dispatch_status
       or new.deleted_at is distinct from old.deleted_at
       or new.deleted_by_user is distinct from old.deleted_by_user
       or new.created_by_user is distinct from old.created_by_user
       or new.sales_entry_timestamp is distinct from old.sales_entry_timestamp then
      raise exception 'Sales Team can update only sales-owned fields.';
    end if;
    return new;
  end if;

  if role_name = 'ops' then
    if new.appointment_date is distinct from old.appointment_date
       or new.buyer_code is distinct from old.buyer_code
       or new.buyer_name is distinct from old.buyer_name
       or new.order_number is distinct from old.order_number
       or new.order_status is distinct from old.order_status
       or new.location is distinct from old.location
       or new.appointment_id is distinct from old.appointment_id
       or new.max_qty is distinct from old.max_qty
       or new.time_slot is distinct from old.time_slot
       or new.status is distinct from old.status
       or new.vehicle_number is distinct from old.vehicle_number
       or new.vehicle_type is distinct from old.vehicle_type
       or new.boxes is distinct from old.boxes
       or new.dispatch_status is distinct from old.dispatch_status
       or new.deleted_at is distinct from old.deleted_at
       or new.deleted_by_user is distinct from old.deleted_by_user
       or new.created_by_user is distinct from old.created_by_user
       or new.sales_entry_timestamp is distinct from old.sales_entry_timestamp then
      raise exception 'Ops Team can update only picklist fields.';
    end if;
    return new;
  end if;

  if role_name in ('fc', 'fc admin') then
    if new.appointment_date is distinct from old.appointment_date
       or new.buyer_code is distinct from old.buyer_code
       or new.buyer_name is distinct from old.buyer_name
       or new.order_number is distinct from old.order_number
       or new.order_status is distinct from old.order_status
       or new.location is distinct from old.location
       or new.appointment_id is distinct from old.appointment_id
       or new.max_qty is distinct from old.max_qty
       or new.time_slot is distinct from old.time_slot
       or new.status is distinct from old.status
       or new.picklist_number is distinct from old.picklist_number
       or new.picklist_qty is distinct from old.picklist_qty
       or new.deleted_at is distinct from old.deleted_at
       or new.deleted_by_user is distinct from old.deleted_by_user
       or new.created_by_user is distinct from old.created_by_user
       or new.sales_entry_timestamp is distinct from old.sales_entry_timestamp then
      raise exception 'FC Team can update only dispatch fields.';
    end if;
    return new;
  end if;

  raise exception 'This user role is not allowed to change orders.';
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists trg_touch_profiles_updated_at on public.profiles;
create trigger trg_touch_profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_orders_updated_at on public.orders;
create trigger trg_touch_orders_updated_at before update on public.orders
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_dispatch_reports_updated_at on public.dispatch_reports;
create trigger trg_touch_dispatch_reports_updated_at before update on public.dispatch_reports
for each row execute function public.touch_updated_at();

drop trigger if exists trg_enforce_order_role_field_protection on public.orders;
create trigger trg_enforce_order_role_field_protection before insert or update or delete on public.orders
for each row execute function public.enforce_order_role_field_protection();

drop trigger if exists trg_audit_order_changes on public.orders;
create trigger trg_audit_order_changes after insert or update or delete on public.orders
for each row execute function public.audit_order_changes();

insert into public.master_buyers (value) values
  ('ARIPL'), ('ARIPL_Fresh'), ('ARIPL_Now'), ('BigBasket'), ('Blinkit'),
  ('CityMall'), ('Clicktech'), ('ETRADE'), ('ETRADE_Fresh'), ('FirstCry'),
  ('fk-grocery'), ('fk-hyperlocal'), ('fk-national'), ('Purplle'), ('RK_World'),
  ('RK_World_Fresh'), ('RK_World_Now'), ('Swiggy'), ('Tatacliq'), ('Trumeds'),
  ('Urban'), ('Zepto')
on conflict (value) do nothing;

insert into public.master_locations (value) values
  ('Ahmedabad'), ('Delhi'), ('Bangalore'), ('Lucknow'), ('Mumbai'), ('Kolkata'),
  ('Jaipur'), ('Rajpura'), ('Hyderabad'), ('Pune'), ('Indore'), ('Chennai'),
  ('Guwahati'), ('Gurugram'), ('Ghaziabad')
on conflict (value) do nothing;

insert into public.master_order_statuses (value) values
  ('Confirmed'), ('Part Allocated'), ('Allocated')
on conflict (value) do nothing;

alter table public.profiles enable row level security;
alter table public.fc_location_access enable row level security;
alter table public.orders enable row level security;
alter table public.order_audit_log enable row level security;
alter table public.master_buyers enable row level security;
alter table public.master_locations enable row level security;
alter table public.master_order_statuses enable row level security;
alter table public.dispatch_reports enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, public;
grant usage on schema public to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_fc_location_allowed(text) to authenticated;

grant select on public.profiles to authenticated;
grant select on public.fc_location_access to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select on public.order_audit_log to authenticated;
grant select, insert, update, delete on public.master_buyers to authenticated;
grant select, insert, update, delete on public.master_locations to authenticated;
grant select, insert, update, delete on public.master_order_statuses to authenticated;
grant select, insert, update on public.dispatch_reports to authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists fc_location_access_select on public.fc_location_access;
create policy fc_location_access_select on public.fc_location_access for select to authenticated
using (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated
using (
  public.current_user_role() in ('admin', 'sales', 'ops', 'fc admin')
  or (public.current_user_role() = 'fc' and public.is_fc_location_allowed(location))
);

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert to authenticated
with check (public.current_user_role() in ('admin', 'sales'));

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update to authenticated
using (
  public.current_user_role() in ('admin', 'sales', 'ops', 'fc admin')
  or (public.current_user_role() = 'fc' and public.is_fc_location_allowed(location))
)
with check (
  public.current_user_role() in ('admin', 'sales', 'ops', 'fc admin')
  or (public.current_user_role() = 'fc' and public.is_fc_location_allowed(location))
);

drop policy if exists orders_delete on public.orders;
create policy orders_delete on public.orders for delete to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists order_audit_log_select on public.order_audit_log;
create policy order_audit_log_select on public.order_audit_log for select to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists master_buyers_select on public.master_buyers;
create policy master_buyers_select on public.master_buyers for select to authenticated using (true);
drop policy if exists master_buyers_admin_manage on public.master_buyers;
create policy master_buyers_admin_manage on public.master_buyers for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists master_locations_select on public.master_locations;
create policy master_locations_select on public.master_locations for select to authenticated using (true);
drop policy if exists master_locations_admin_manage on public.master_locations;
create policy master_locations_admin_manage on public.master_locations for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists master_order_statuses_select on public.master_order_statuses;
create policy master_order_statuses_select on public.master_order_statuses for select to authenticated using (true);
drop policy if exists master_order_statuses_admin_manage on public.master_order_statuses;
create policy master_order_statuses_admin_manage on public.master_order_statuses for all to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists dispatch_reports_select on public.dispatch_reports;
create policy dispatch_reports_select on public.dispatch_reports for select to authenticated
using (
  public.current_user_role() in ('admin', 'sales', 'ops', 'fc admin')
  or (public.current_user_role() = 'fc' and public.is_fc_location_allowed(location))
);

drop policy if exists dispatch_reports_insert on public.dispatch_reports;
create policy dispatch_reports_insert on public.dispatch_reports for insert to authenticated
with check (
  public.current_user_role() in ('admin', 'fc admin')
  or (public.current_user_role() = 'fc' and public.is_fc_location_allowed(location))
);

drop policy if exists dispatch_reports_update on public.dispatch_reports;
create policy dispatch_reports_update on public.dispatch_reports for update to authenticated
using (
  public.current_user_role() in ('admin', 'fc admin')
  or (public.current_user_role() = 'fc' and public.is_fc_location_allowed(location))
)
with check (
  public.current_user_role() in ('admin', 'fc admin')
  or (public.current_user_role() = 'fc' and public.is_fc_location_allowed(location))
);

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon;
