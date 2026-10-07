create index if not exists idx_orders_order_number on public.orders(order_number);
create index if not exists idx_orders_appointment_date on public.orders(appointment_date);
create index if not exists idx_orders_location on public.orders(location);
create index if not exists idx_orders_buyer_code on public.orders(buyer_code);
create index if not exists idx_orders_dispatch_status on public.orders(dispatch_status);
create index if not exists idx_orders_picklist_number on public.orders(picklist_number);
create index if not exists idx_orders_deleted_at on public.orders(deleted_at);

create index if not exists idx_orders_active_appointment_date
on public.orders(appointment_date)
where deleted_at is null;

create index if not exists idx_orders_active_location
on public.orders(location)
where deleted_at is null;

create index if not exists idx_orders_active_buyer_code
on public.orders(buyer_code)
where deleted_at is null;

create index if not exists idx_orders_active_dispatch_status
on public.orders(dispatch_status)
where deleted_at is null;
