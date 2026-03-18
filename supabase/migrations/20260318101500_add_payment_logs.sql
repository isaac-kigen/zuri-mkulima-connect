create table if not exists public.payment_logs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  provider text not null default 'daraja',
  event_type text not null,
  status text,
  merchant_request_id text,
  checkout_request_id text,
  mpesa_receipt_number text,
  result_code integer,
  result_desc text,
  phone_number text,
  amount_kes numeric,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_logs_created_at
  on public.payment_logs(created_at desc);

create index if not exists idx_payment_logs_payment_id
  on public.payment_logs(payment_id);

create index if not exists idx_payment_logs_order_id
  on public.payment_logs(order_id);

create index if not exists idx_payment_logs_checkout_request_id
  on public.payment_logs(checkout_request_id);

alter table public.payment_logs enable row level security;

drop policy if exists payment_logs_select_admin on public.payment_logs;
drop policy if exists payment_logs_insert_admin on public.payment_logs;

create policy payment_logs_select_admin
on public.payment_logs
for select
using (public.is_admin());

create policy payment_logs_insert_admin
on public.payment_logs
for insert
with check (public.is_admin());
