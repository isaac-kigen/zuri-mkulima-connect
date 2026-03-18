# Supabase Backend (Mkulima Connect)

This folder contains the Supabase backend implementation for Mkulima Connect:

- Schema migrations (tables, enums, indexes, triggers)
- Row-Level Security (RLS) policies
- Business RPC functions for orders, payments, notifications, and admin operations
- Storage bucket + policies for listing photos
- Optional sample seed script

## Files

- `migrations/20260221110000_init_schema.sql`
  - Core schema, constraints, triggers, helper auth/profile functions
- `migrations/20260221113000_rls_and_business_functions.sql`
  - RLS policies + core workflow functions
- `migrations/20260221114000_storage_and_views.sql`
  - Storage policies + read-optimized views
- `seed.sql`
  - Optional sample data (requires at least one farmer profile)

## Prerequisites

- Supabase CLI installed
- Supabase project created
- Local project linked to remote: `supabase link --project-ref <PROJECT_REF>`

## Apply migrations

```bash
supabase db push
```

## Seed sample data (optional)

```bash
supabase db query < supabase/seed.sql
```

## Required auth metadata on signup

When creating users, include metadata to auto-create profiles correctly:

```json
{
  "full_name": "Amina Njeri",
  "role": "farmer",
  "phone": "254712345678",
  "county": "Nakuru"
}
```

If `role` is omitted, it defaults to `buyer`.

## Core RPC functions

- `place_order(p_listing_id uuid, p_quantity numeric)`
- `review_order(p_order_id uuid, p_action text)`
- `cancel_order(p_order_id uuid)`
- `initiate_payment(p_order_id uuid, p_phone_number text, p_checkout_request_id text, p_merchant_request_id text)`
- `process_payment_callback(...)` (service-role intended)
- `mark_notification_read(p_notification_id uuid)`
- `set_user_suspension(p_target_user_id uuid, p_suspend boolean, p_note text)`
- `archive_listing_admin(p_listing_id uuid, p_reason text)`
- `dashboard_snapshot(p_user_id uuid default auth.uid())`

## Payment observability

- `payments` stores the current canonical payment state.
- `payment_logs` stores immutable Daraja lifecycle events such as STK initiation, initiation failures, callback receipt, idempotent callbacks, and callback processing outcomes.

## Storage bucket

- Bucket: `listing-photos`
- Suggested object path: `listing-photos/{listing_id}/{uuid}.jpg`
- Policies enforce owner/admin write access

## Notes

- `process_payment_callback` is intended for secure server-side usage (service key).
- RLS policies enforce role-specific access; do not bypass with client-side admin credentials.
