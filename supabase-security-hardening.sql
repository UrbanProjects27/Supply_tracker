-- Keeps RLS helper functions out of the public/Data API schema and removes
-- execution rights from trigger-only functions.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
  limit 1;
$$;

create or replace function private.is_fc_location_allowed(target_location text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.fc_location_access
    where user_id = (select auth.uid())
      and location = target_location
  );
$$;

revoke all on function private.current_user_role() from public, anon, authenticated;
revoke all on function private.is_fc_location_allowed(text) from public, anon, authenticated;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_fc_location_allowed(text) to authenticated;

create or replace function public.enforce_order_role_field_protection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_name text;
begin
  role_name := private.current_user_role();

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

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.audit_order_changes() from public, anon, authenticated;
revoke all on function public.enforce_order_role_field_protection() from public, anon, authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.current_user_role()) = 'admin');

drop policy if exists fc_location_access_select on public.fc_location_access;
create policy fc_location_access_select on public.fc_location_access for select to authenticated
using (user_id = (select auth.uid()) or (select private.current_user_role()) = 'admin');

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated
using (
  (select private.current_user_role()) in ('admin', 'sales', 'ops', 'fc admin')
  or ((select private.current_user_role()) = 'fc' and (select private.is_fc_location_allowed(location)))
);

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert to authenticated
with check ((select private.current_user_role()) in ('admin', 'sales'));

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update to authenticated
using (
  (select private.current_user_role()) in ('admin', 'sales', 'ops', 'fc admin')
  or ((select private.current_user_role()) = 'fc' and (select private.is_fc_location_allowed(location)))
)
with check (
  (select private.current_user_role()) in ('admin', 'sales', 'ops', 'fc admin')
  or ((select private.current_user_role()) = 'fc' and (select private.is_fc_location_allowed(location)))
);

drop policy if exists orders_delete on public.orders;
create policy orders_delete on public.orders for delete to authenticated
using ((select private.current_user_role()) = 'admin');

drop policy if exists order_audit_log_select on public.order_audit_log;
create policy order_audit_log_select on public.order_audit_log for select to authenticated
using ((select private.current_user_role()) = 'admin');

drop policy if exists master_buyers_admin_manage on public.master_buyers;
create policy master_buyers_admin_insert on public.master_buyers for insert to authenticated
with check ((select private.current_user_role()) = 'admin');
create policy master_buyers_admin_update on public.master_buyers for update to authenticated
using ((select private.current_user_role()) = 'admin')
with check ((select private.current_user_role()) = 'admin');
create policy master_buyers_admin_delete on public.master_buyers for delete to authenticated
using ((select private.current_user_role()) = 'admin');

drop policy if exists master_locations_admin_manage on public.master_locations;
create policy master_locations_admin_insert on public.master_locations for insert to authenticated
with check ((select private.current_user_role()) = 'admin');
create policy master_locations_admin_update on public.master_locations for update to authenticated
using ((select private.current_user_role()) = 'admin')
with check ((select private.current_user_role()) = 'admin');
create policy master_locations_admin_delete on public.master_locations for delete to authenticated
using ((select private.current_user_role()) = 'admin');

drop policy if exists master_order_statuses_admin_manage on public.master_order_statuses;
create policy master_order_statuses_admin_insert on public.master_order_statuses for insert to authenticated
with check ((select private.current_user_role()) = 'admin');
create policy master_order_statuses_admin_update on public.master_order_statuses for update to authenticated
using ((select private.current_user_role()) = 'admin')
with check ((select private.current_user_role()) = 'admin');
create policy master_order_statuses_admin_delete on public.master_order_statuses for delete to authenticated
using ((select private.current_user_role()) = 'admin');

drop policy if exists dispatch_reports_select on public.dispatch_reports;
create policy dispatch_reports_select on public.dispatch_reports for select to authenticated
using (
  (select private.current_user_role()) in ('admin', 'sales', 'ops', 'fc admin')
  or ((select private.current_user_role()) = 'fc' and (select private.is_fc_location_allowed(location)))
);

drop policy if exists dispatch_reports_insert on public.dispatch_reports;
create policy dispatch_reports_insert on public.dispatch_reports for insert to authenticated
with check (
  (select private.current_user_role()) in ('admin', 'fc admin')
  or ((select private.current_user_role()) = 'fc' and (select private.is_fc_location_allowed(location)))
);

drop policy if exists dispatch_reports_update on public.dispatch_reports;
create policy dispatch_reports_update on public.dispatch_reports for update to authenticated
using (
  (select private.current_user_role()) in ('admin', 'fc admin')
  or ((select private.current_user_role()) = 'fc' and (select private.is_fc_location_allowed(location)))
)
with check (
  (select private.current_user_role()) in ('admin', 'fc admin')
  or ((select private.current_user_role()) = 'fc' and (select private.is_fc_location_allowed(location)))
);

drop function if exists public.current_user_role();
drop function if exists public.is_fc_location_allowed(text);
