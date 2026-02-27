-- Mkulima Connect Supabase backend bootstrap
-- Creates core schema, enums, constraints, triggers, and helper functions.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('farmer', 'buyer', 'admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
    CREATE TYPE public.listing_status AS ENUM ('active', 'inactive', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM (
      'pending',
      'accepted',
      'rejected',
      'payment_pending',
      'paid',
      'completed',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE public.payment_status AS ENUM (
      'initiated',
      'pending',
      'success',
      'failed',
      'reversed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM ('order', 'payment', 'system');
  END IF;
END$$;

-- Core profile table linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email citext not null unique,
  phone text,
  role public.user_role not null default 'buyer',
  county text,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_format_chk check (email::text ~* '^\\S+@\\S+\\.\\S+$')
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  product_name text not null,
  category text,
  quantity numeric not null,
  unit text not null,
  price_kes numeric not null,
  location text not null,
  description text,
  status public.listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_quantity_positive_chk check (quantity > 0),
  constraint listings_price_positive_chk check (price_kes > 0)
);

create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  farmer_id uuid not null references public.profiles(id) on delete restrict,
  quantity numeric not null,
  unit_price_kes numeric not null,
  total_kes numeric not null,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_quantity_positive_chk check (quantity > 0),
  constraint orders_unit_price_positive_chk check (unit_price_kes > 0),
  constraint orders_total_positive_chk check (total_kes > 0)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  amount_kes numeric not null,
  status public.payment_status not null default 'initiated',
  merchant_request_id text,
  checkout_request_id text,
  mpesa_receipt_number text,
  transaction_date timestamptz,
  phone_number text,
  raw_callback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_positive_chk check (amount_kes > 0)
);

create unique index if not exists payments_checkout_request_uidx
  on public.payments(checkout_request_id)
  where checkout_request_id is not null;

create unique index if not exists payments_mpesa_receipt_uidx
  on public.payments(mpesa_receipt_number)
  where mpesa_receipt_number is not null;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type public.notification_type not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_table text not null,
  target_id uuid not null,
  note text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_listings_status on public.listings(status);
create index if not exists idx_listings_location on public.listings(location);
create index if not exists idx_listings_product_name on public.listings(product_name);
create index if not exists idx_listings_farmer_id on public.listings(farmer_id);

create index if not exists idx_orders_buyer_id on public.orders(buyer_id);
create index if not exists idx_orders_farmer_id on public.orders(farmer_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

create index if not exists idx_notifications_recipient_created
  on public.notifications(recipient_id, created_at desc);

create index if not exists idx_admin_audit_logs_created
  on public.admin_audit_logs(created_at desc);

-- Utility trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Updated-at triggers
DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

DROP TRIGGER IF EXISTS trg_listings_set_updated_at ON public.listings;
create trigger trg_listings_set_updated_at
before update on public.listings
for each row
execute function public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_set_updated_at ON public.orders;
create trigger trg_orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payments_set_updated_at ON public.payments;
create trigger trg_payments_set_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

-- Email normalization
create or replace function public.normalize_profile_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email::text));
  return new;
end;
$$;

DROP TRIGGER IF EXISTS trg_profiles_normalize_email ON public.profiles;
create trigger trg_profiles_normalize_email
before insert or update on public.profiles
for each row
execute function public.normalize_profile_email();

-- Keep total_kes in sync when order is inserted/updated
create or replace function public.compute_order_total()
returns trigger
language plpgsql
as $$
begin
  new.total_kes := new.quantity * new.unit_price_kes;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS trg_orders_compute_total ON public.orders;
create trigger trg_orders_compute_total
before insert or update of quantity, unit_price_kes on public.orders
for each row
execute function public.compute_order_total();

-- New auth user => profile row
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_full_name text;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'buyer');
  v_full_name := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1));

  insert into public.profiles (id, full_name, email, role, phone, county)
  values (
    new.id,
    v_full_name,
    new.email,
    v_role,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'county', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- Access helpers
create or replace function public.user_role(p_user_id uuid default auth.uid())
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = p_user_id;
$$;

create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'admin'
      and p.is_suspended = false
  );
$$;

create or replace function public.is_active_user(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.is_suspended = false
  );
$$;
