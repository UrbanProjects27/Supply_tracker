-- Urban Retail Dispatch Hub
-- Phase 1: stability
-- Phase 2: reporting support
-- Phase 3: automation and admin controls foundation

create extension if not exists pgcrypto;

alter table public.orders
add column if not exists created_by_user text,
add column if not exists last_updated_by_user text,
add column if not exists sales_entry_timestamp timestamptz,
add column if not exists updated_at timestamptz not null default now(),
add column if not exists boxes numeric;

alter table public.orders
drop constraint if exists orders_boxes_positive;

alter table public.orders
add constraint orders_boxes_positive check (boxes is null or boxes > 0);

create table if not exists public.order_audit_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  action text not null,
  changed_by_user text,
  changed_at timestamptz not null default now(),
  row_before jsonb,
  row_after jsonb
);

create index if not exists idx_order_audit_log_order_id on public.order_audit_log(order_id);
create index if not exists idx_order_audit_log_changed_at on public.order_audit_log(changed_at desc);

create or replace function public.touch_order_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_order_updated_at on public.orders;
create trigger trg_touch_order_updated_at
before update on public.orders
for each row
execute function public.touch_order_updated_at();

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

drop trigger if exists trg_audit_order_changes on public.orders;
create trigger trg_audit_order_changes
after insert or update or delete on public.orders
for each row
execute function public.audit_order_changes();

grant select on public.order_audit_log to authenticated;

-- Optional stronger role separation policies.
-- Apply after validating in a test environment.
-- Sales: select/insert/update only sales-owned fields.
-- Ops: update only picklist fields.
-- FC: update only dispatch fields.
