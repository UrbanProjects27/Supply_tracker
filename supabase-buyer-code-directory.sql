-- Adds the authoritative Buyer Code → Buyer Name directory used by Sales.
-- Existing buyer names remain intact; an Admin can assign their codes from the app.

alter table public.master_buyers
  add column if not exists code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.master_buyers'::regclass
      and conname = 'master_buyers_code_key'
  ) then
    alter table public.master_buyers
      add constraint master_buyers_code_key unique (code);
  end if;
end;
$$;

create or replace function public.validate_order_buyer_selection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.buyer_code is distinct from old.buyer_code
     or new.buyer_name is distinct from old.buyer_name then
    if not exists (
      select 1
      from public.master_buyers
      where active = true
        and code = new.buyer_code
        and value = new.buyer_name
    ) then
      raise exception 'Buyer Code must be selected from the approved Buyer Code list.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_order_buyer_selection() from public, anon, authenticated;

drop trigger if exists trg_validate_order_buyer_selection on public.orders;
create trigger trg_validate_order_buyer_selection
before insert or update on public.orders
for each row execute function public.validate_order_buyer_selection();
