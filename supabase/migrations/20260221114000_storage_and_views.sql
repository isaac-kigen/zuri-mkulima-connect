-- Supabase storage + reporting views

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- storage policies
DROP POLICY IF EXISTS listing_photos_public_read ON storage.objects;
DROP POLICY IF EXISTS listing_photos_insert_owner_admin ON storage.objects;
DROP POLICY IF EXISTS listing_photos_update_owner_admin ON storage.objects;
DROP POLICY IF EXISTS listing_photos_delete_owner_admin ON storage.objects;

create policy listing_photos_public_read
on storage.objects
for select
using (bucket_id = 'listing-photos');

create policy listing_photos_insert_owner_admin
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-photos'
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.listings l
      where l.id::text = (storage.foldername(name))[1]
        and l.farmer_id = auth.uid()
    )
  )
);

create policy listing_photos_update_owner_admin
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-photos'
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.listings l
      where l.id::text = (storage.foldername(name))[1]
        and l.farmer_id = auth.uid()
    )
  )
)
with check (
  bucket_id = 'listing-photos'
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.listings l
      where l.id::text = (storage.foldername(name))[1]
        and l.farmer_id = auth.uid()
    )
  )
);

create policy listing_photos_delete_owner_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-photos'
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.listings l
      where l.id::text = (storage.foldername(name))[1]
        and l.farmer_id = auth.uid()
    )
  )
);

-- Read-optimized views
create or replace view public.listing_with_farmer as
select
  l.id,
  l.farmer_id,
  p.full_name as farmer_name,
  p.county as farmer_county,
  l.product_name,
  l.category,
  l.quantity,
  l.unit,
  l.price_kes,
  l.location,
  l.description,
  l.status,
  l.created_at,
  l.updated_at
from public.listings l
join public.profiles p on p.id = l.farmer_id;

create or replace view public.order_with_relations as
select
  o.id,
  o.listing_id,
  o.buyer_id,
  b.full_name as buyer_name,
  o.farmer_id,
  f.full_name as farmer_name,
  o.quantity,
  o.unit_price_kes,
  o.total_kes,
  o.status,
  o.created_at,
  o.updated_at,
  l.product_name,
  l.unit,
  pay.status as payment_status,
  pay.checkout_request_id,
  pay.mpesa_receipt_number
from public.orders o
join public.profiles b on b.id = o.buyer_id
join public.profiles f on f.id = o.farmer_id
join public.listings l on l.id = o.listing_id
left join public.payments pay on pay.order_id = o.id;
