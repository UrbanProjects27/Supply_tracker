alter table public.orders
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by_user text;

create index if not exists idx_orders_deleted_at on public.orders(deleted_at);
