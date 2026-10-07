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

create or replace function public.enforce_order_role_field_protection()
returns trigger
language plpgsql
security definer
set search_path = public, auth
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

    return new;
  end if;

  if tg_op = 'DELETE' then
    if role_name = 'admin' then
      return old;
    end if;

    raise exception 'Only Admin can delete orders.';
  end if;

  if role_name = 'admin' then
    return new;
  end if;

  if role_name = 'sales' then
    if new.deleted_at is distinct from old.deleted_at
       or new.deleted_by_user is distinct from old.deleted_by_user then
      if old.picklist_number is not null
         and old.picklist_number <> 0 then
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

    if new.picklist_qty is distinct from old.picklist_qty
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

drop trigger if exists trg_enforce_order_role_field_protection on public.orders;

create trigger trg_enforce_order_role_field_protection
before insert or update or delete on public.orders
for each row
execute function public.enforce_order_role_field_protection();
