-- Mkulima Connect Supabase backend: RLS + business functions

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Cleanup policies for idempotent migration re-runs
DROP POLICY IF EXISTS profiles_select_self_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;

DROP POLICY IF EXISTS listings_select_public_owner_admin ON public.listings;
DROP POLICY IF EXISTS listings_insert_farmer ON public.listings;
DROP POLICY IF EXISTS listings_update_owner_admin ON public.listings;
DROP POLICY IF EXISTS listings_delete_owner_admin ON public.listings;

DROP POLICY IF EXISTS listing_photos_select_visible_listings ON public.listing_photos;
DROP POLICY IF EXISTS listing_photos_insert_owner_admin ON public.listing_photos;
DROP POLICY IF EXISTS listing_photos_delete_owner_admin ON public.listing_photos;

DROP POLICY IF EXISTS orders_select_participants_admin ON public.orders;
DROP POLICY IF EXISTS orders_insert_buyer ON public.orders;
DROP POLICY IF EXISTS orders_update_participants_admin ON public.orders;

DROP POLICY IF EXISTS payments_select_participants_admin ON public.payments;
DROP POLICY IF EXISTS payments_insert_buyer_admin ON public.payments;
DROP POLICY IF EXISTS payments_update_buyer_admin ON public.payments;

DROP POLICY IF EXISTS notifications_select_recipient_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_system_or_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_update_recipient_admin ON public.notifications;

DROP POLICY IF EXISTS admin_logs_select_admin ON public.admin_audit_logs;
DROP POLICY IF EXISTS admin_logs_insert_admin ON public.admin_audit_logs;

-- Profiles
create policy profiles_select_self_or_admin
on public.profiles
for select
using (auth.uid() = id or public.is_admin());

create policy profiles_update_self_or_admin
on public.profiles
for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create policy profiles_insert_self
on public.profiles
for insert
with check (auth.uid() = id);

-- Listings
create policy listings_select_public_owner_admin
on public.listings
for select
using (
  status = 'active'
  or farmer_id = auth.uid()
  or public.is_admin()
);

create policy listings_insert_farmer
on public.listings
for insert
with check (
  farmer_id = auth.uid()
  and public.is_active_user(auth.uid())
  and public.user_role(auth.uid()) in ('farmer', 'admin')
);

create policy listings_update_owner_admin
on public.listings
for update
using (farmer_id = auth.uid() or public.is_admin())
with check (farmer_id = auth.uid() or public.is_admin());

create policy listings_delete_owner_admin
on public.listings
for delete
using (farmer_id = auth.uid() or public.is_admin());

-- Listing photos
create policy listing_photos_select_visible_listings
on public.listing_photos
for select
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and (
        l.status = 'active'
        or l.farmer_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy listing_photos_insert_owner_admin
on public.listing_photos
for insert
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and (
        l.farmer_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy listing_photos_delete_owner_admin
on public.listing_photos
for delete
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and (
        l.farmer_id = auth.uid()
        or public.is_admin()
      )
  )
);

-- Orders
create policy orders_select_participants_admin
on public.orders
for select
using (
  buyer_id = auth.uid()
  or farmer_id = auth.uid()
  or public.is_admin()
);

create policy orders_insert_buyer
on public.orders
for insert
with check (
  buyer_id = auth.uid()
  and public.user_role(auth.uid()) = 'buyer'
  and public.is_active_user(auth.uid())
);

create policy orders_update_participants_admin
on public.orders
for update
using (
  buyer_id = auth.uid()
  or farmer_id = auth.uid()
  or public.is_admin()
)
with check (
  buyer_id = auth.uid()
  or farmer_id = auth.uid()
  or public.is_admin()
);

-- Payments
create policy payments_select_participants_admin
on public.payments
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (
        o.buyer_id = auth.uid()
        or o.farmer_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy payments_insert_buyer_admin
on public.payments
for insert
with check (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.buyer_id = auth.uid()
  )
);

create policy payments_update_buyer_admin
on public.payments
for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.buyer_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.buyer_id = auth.uid()
  )
);

-- Notifications
create policy notifications_select_recipient_admin
on public.notifications
for select
using (recipient_id = auth.uid() or public.is_admin());

create policy notifications_insert_system_or_admin
on public.notifications
for insert
with check (public.is_admin());

create policy notifications_update_recipient_admin
on public.notifications
for update
using (recipient_id = auth.uid() or public.is_admin())
with check (recipient_id = auth.uid() or public.is_admin());

-- Admin logs
create policy admin_logs_select_admin
on public.admin_audit_logs
for select
using (public.is_admin());

create policy admin_logs_insert_admin
on public.admin_audit_logs
for insert
with check (public.is_admin());

-- Profile update guard: only admins can change role / suspension flags
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    if old.id <> auth.uid() then
      raise exception 'cannot modify another profile';
    end if;

    if new.role <> old.role then
      raise exception 'only admins can change role';
    end if;

    if new.is_suspended <> old.is_suspended then
      raise exception 'only admins can change suspension state';
    end if;
  end if;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_update ON public.profiles;
create trigger trg_profiles_guard_update
before update on public.profiles
for each row
execute function public.guard_profile_update();

-- Generic notification helper
create or replace function public.create_notification(
  p_recipient_id uuid,
  p_title text,
  p_message text,
  p_type public.notification_type
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification public.notifications;
begin
  insert into public.notifications (
    recipient_id,
    title,
    message,
    type
  )
  values (
    p_recipient_id,
    p_title,
    p_message,
    p_type
  )
  returning * into v_notification;

  return v_notification;
end;
$$;

-- Buyer order creation with strict validation
create or replace function public.place_order(
  p_listing_id uuid,
  p_quantity numeric
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.user_role;
  v_listing public.listings;
  v_order public.orders;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select role into v_role
  from public.profiles
  where id = v_user_id
    and is_suspended = false;

  if v_role is distinct from 'buyer' then
    raise exception 'only buyers can place orders';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be greater than zero';
  end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'listing not found';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'listing must be active';
  end if;

  if p_quantity > v_listing.quantity then
    raise exception 'requested quantity exceeds available stock';
  end if;

  insert into public.orders (
    listing_id,
    buyer_id,
    farmer_id,
    quantity,
    unit_price_kes,
    total_kes,
    status
  )
  values (
    v_listing.id,
    v_user_id,
    v_listing.farmer_id,
    p_quantity,
    v_listing.price_kes,
    p_quantity * v_listing.price_kes,
    'pending'
  )
  returning * into v_order;

  perform public.create_notification(
    v_listing.farmer_id,
    'New Order Received',
    format('A buyer placed an order for %s %s of %s.', p_quantity, v_listing.unit, v_listing.product_name),
    'order'
  );

  return v_order;
end;
$$;

-- Farmer/admin review of pending orders
create or replace function public.review_order(
  p_order_id uuid,
  p_action text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_order public.orders;
  v_actor public.profiles;
  v_next_status public.order_status;
begin
  if v_actor_id is null then
    raise exception 'authentication required';
  end if;

  select * into v_actor
  from public.profiles
  where id = v_actor_id
    and is_suspended = false;

  if not found then
    raise exception 'active profile required';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if p_action not in ('accept', 'reject') then
    raise exception 'invalid review action';
  end if;

  if v_actor.role <> 'admin' and v_order.farmer_id <> v_actor_id then
    raise exception 'only assigned farmer or admin can review';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'only pending orders can be reviewed';
  end if;

  v_next_status := case when p_action = 'accept' then 'accepted' else 'rejected' end;

  update public.orders
  set status = v_next_status
  where id = p_order_id
  returning * into v_order;

  if v_next_status = 'accepted' then
    perform public.create_notification(
      v_order.buyer_id,
      'Order Accepted',
      'Your order was accepted. You can proceed to payment.',
      'order'
    );
  else
    perform public.create_notification(
      v_order.buyer_id,
      'Order Rejected',
      'Your order was rejected by the farmer.',
      'order'
    );
  end if;

  return v_order;
end;
$$;

-- Buyer/admin cancellation
create or replace function public.cancel_order(
  p_order_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor public.profiles;
  v_order public.orders;
begin
  if v_actor_id is null then
    raise exception 'authentication required';
  end if;

  select * into v_actor
  from public.profiles
  where id = v_actor_id
    and is_suspended = false;

  if not found then
    raise exception 'active profile required';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if v_actor.role <> 'admin' and v_order.buyer_id <> v_actor_id then
    raise exception 'only buyer or admin can cancel';
  end if;

  if v_order.status not in ('pending', 'accepted', 'payment_pending') then
    raise exception 'order cannot be cancelled in current state';
  end if;

  update public.orders
  set status = 'cancelled'
  where id = p_order_id
  returning * into v_order;

  perform public.create_notification(
    v_order.farmer_id,
    'Order Cancelled',
    'A buyer cancelled an order before completion.',
    'order'
  );

  return v_order;
end;
$$;

-- Payment initiation (stores STK metadata)
create or replace function public.initiate_payment(
  p_order_id uuid,
  p_phone_number text,
  p_checkout_request_id text,
  p_merchant_request_id text
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor public.profiles;
  v_order public.orders;
  v_payment public.payments;
begin
  if v_actor_id is null then
    raise exception 'authentication required';
  end if;

  if p_phone_number is null or p_phone_number !~ '^2547[0-9]{8}$' then
    raise exception 'phone number must be in format 2547XXXXXXXX';
  end if;

  select * into v_actor
  from public.profiles
  where id = v_actor_id
    and is_suspended = false;

  if not found then
    raise exception 'active profile required';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  if v_actor.role <> 'admin' and v_order.buyer_id <> v_actor_id then
    raise exception 'only buyer or admin can initiate payment';
  end if;

  if v_order.status <> 'accepted' then
    raise exception 'order must be accepted before payment';
  end if;

  insert into public.payments (
    order_id,
    amount_kes,
    status,
    merchant_request_id,
    checkout_request_id,
    phone_number
  )
  values (
    v_order.id,
    v_order.total_kes,
    'pending',
    p_merchant_request_id,
    p_checkout_request_id,
    p_phone_number
  )
  on conflict (order_id)
  do update set
    status = excluded.status,
    merchant_request_id = excluded.merchant_request_id,
    checkout_request_id = excluded.checkout_request_id,
    phone_number = excluded.phone_number,
    updated_at = now()
  returning * into v_payment;

  update public.orders
  set status = 'payment_pending'
  where id = v_order.id;

  return v_payment;
end;
$$;

-- Callback processor with idempotency
create or replace function public.process_payment_callback(
  p_checkout_request_id text,
  p_result_code integer,
  p_result_desc text,
  p_mpesa_receipt_number text default null,
  p_transaction_date timestamptz default null,
  p_phone_number text default null,
  p_payload jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
  v_order public.orders;
  v_listing public.listings;
  v_success boolean;
  v_effective_receipt text;
begin
  if p_checkout_request_id is null or trim(p_checkout_request_id) = '' then
    raise exception 'checkout request id is required';
  end if;

  select * into v_payment
  from public.payments
  where checkout_request_id = p_checkout_request_id
  for update;

  if not found then
    raise exception 'payment record not found';
  end if;

  if v_payment.status in ('success', 'failed', 'reversed') then
    return jsonb_build_object(
      'idempotent', true,
      'payment_id', v_payment.id,
      'payment_status', v_payment.status
    );
  end if;

  select * into v_order
  from public.orders
  where id = v_payment.order_id
  for update;

  if not found then
    raise exception 'order not found for payment';
  end if;

  v_success := p_result_code = 0;

  if v_success then
    v_effective_receipt := coalesce(nullif(trim(p_mpesa_receipt_number), ''), concat('SIM', substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8)));

    update public.payments
    set
      status = 'success',
      mpesa_receipt_number = v_effective_receipt,
      transaction_date = coalesce(p_transaction_date, now()),
      phone_number = coalesce(nullif(trim(p_phone_number), ''), phone_number),
      raw_callback = coalesce(p_payload, jsonb_build_object('result_code', p_result_code, 'result_desc', p_result_desc)),
      updated_at = now()
    where id = v_payment.id
    returning * into v_payment;

    update public.orders
    set status = 'paid'
    where id = v_order.id
    returning * into v_order;

    select * into v_listing
    from public.listings
    where id = v_order.listing_id
    for update;

    if found then
      update public.listings
      set
        quantity = greatest(0, quantity - v_order.quantity),
        status = case when greatest(0, quantity - v_order.quantity) = 0 then 'inactive' else status end,
        updated_at = now()
      where id = v_listing.id;
    end if;

    perform public.create_notification(
      v_order.buyer_id,
      'Payment Confirmed',
      format('Payment confirmed for order %s.', left(v_order.id::text, 8)),
      'payment'
    );

    perform public.create_notification(
      v_order.farmer_id,
      'Order Paid',
      format('Buyer completed payment for order %s.', left(v_order.id::text, 8)),
      'payment'
    );
  else
    update public.payments
    set
      status = 'failed',
      raw_callback = coalesce(p_payload, jsonb_build_object('result_code', p_result_code, 'result_desc', p_result_desc)),
      updated_at = now()
    where id = v_payment.id
    returning * into v_payment;

    update public.orders
    set status = 'accepted'
    where id = v_order.id
    returning * into v_order;

    perform public.create_notification(
      v_order.buyer_id,
      'Payment Failed',
      coalesce(p_result_desc, 'Payment failed. Please retry.'),
      'payment'
    );
  end if;

  return jsonb_build_object(
    'idempotent', false,
    'payment_id', v_payment.id,
    'payment_status', v_payment.status,
    'order_id', v_order.id,
    'order_status', v_order.status
  );
end;
$$;

-- Notification read helper
create or replace function public.mark_notification_read(
  p_notification_id uuid
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification public.notifications;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  update public.notifications
  set is_read = true
  where id = p_notification_id
    and (recipient_id = v_user_id or public.is_admin(v_user_id))
  returning * into v_notification;

  if not found then
    raise exception 'notification not found or forbidden';
  end if;

  return v_notification;
end;
$$;

-- Admin helpers
create or replace function public.set_user_suspension(
  p_target_user_id uuid,
  p_suspend boolean,
  p_note text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_target public.profiles;
begin
  if not public.is_admin(v_admin_id) then
    raise exception 'admin privileges required';
  end if;

  if v_admin_id = p_target_user_id then
    raise exception 'admin cannot suspend own account';
  end if;

  update public.profiles
  set is_suspended = p_suspend
  where id = p_target_user_id
  returning * into v_target;

  if not found then
    raise exception 'target profile not found';
  end if;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    target_table,
    target_id,
    note
  )
  values (
    v_admin_id,
    case when p_suspend then 'suspend_user' else 'activate_user' end,
    'profiles',
    p_target_user_id,
    p_note
  );

  return v_target;
end;
$$;

create or replace function public.archive_listing_admin(
  p_listing_id uuid,
  p_reason text default null
)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_listing public.listings;
begin
  if not public.is_admin(v_admin_id) then
    raise exception 'admin privileges required';
  end if;

  update public.listings
  set status = 'archived'
  where id = p_listing_id
  returning * into v_listing;

  if not found then
    raise exception 'listing not found';
  end if;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    target_table,
    target_id,
    note
  )
  values (
    v_admin_id,
    'remove_listing',
    'listings',
    p_listing_id,
    p_reason
  );

  return v_listing;
end;
$$;

-- Dashboard snapshot by role
create or replace function public.dashboard_snapshot(
  p_user_id uuid default auth.uid()
)
returns table (
  active_listings bigint,
  pending_orders bigint,
  completed_orders bigint,
  total_revenue_kes numeric,
  unread_notifications bigint
)
language sql
security definer
set search_path = public
as $$
  with actor as (
    select p.id, p.role
    from public.profiles p
    where p.id = p_user_id
  ),
  scope_orders as (
    select o.*
    from public.orders o, actor a
    where
      (a.role = 'admin')
      or (a.role = 'farmer' and o.farmer_id = a.id)
      or (a.role = 'buyer' and o.buyer_id = a.id)
  ),
  scope_listings as (
    select l.*
    from public.listings l, actor a
    where
      (a.role = 'admin')
      or (a.role = 'farmer' and l.farmer_id = a.id)
      or (a.role = 'buyer' and l.status = 'active')
  )
  select
    (select count(*) from scope_listings where status = 'active') as active_listings,
    (select count(*) from scope_orders where status = 'pending') as pending_orders,
    (select count(*) from scope_orders where status in ('paid', 'completed')) as completed_orders,
    coalesce(
      (
        select sum(o.total_kes)
        from scope_orders o
        join public.payments p on p.order_id = o.id and p.status = 'success'
      ),
      0
    ) as total_revenue_kes,
    (
      select count(*)
      from public.notifications n
      where n.recipient_id = p_user_id
        and n.is_read = false
    ) as unread_notifications;
$$;

-- Grants for RPC use from supabase clients
grant usage on schema public to anon, authenticated, service_role;
grant execute on function public.place_order(uuid, numeric) to authenticated, service_role;
grant execute on function public.review_order(uuid, text) to authenticated, service_role;
grant execute on function public.cancel_order(uuid) to authenticated, service_role;
grant execute on function public.initiate_payment(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.process_payment_callback(text, integer, text, text, timestamptz, text, jsonb) to service_role;
grant execute on function public.mark_notification_read(uuid) to authenticated, service_role;
grant execute on function public.set_user_suspension(uuid, boolean, text) to authenticated, service_role;
grant execute on function public.archive_listing_admin(uuid, text) to authenticated, service_role;
grant execute on function public.dashboard_snapshot(uuid) to authenticated, service_role;
