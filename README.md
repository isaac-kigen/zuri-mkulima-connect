# Mkulima Connect

Mkulima Connect is a mobile-first agricultural marketplace built with Next.js App Router. It connects farmers and buyers through listing management, order workflows, payment simulation, notifications, and an admin moderation dashboard.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4
- Supabase Auth + PostgreSQL backend
- Server-side session cookies backed by Supabase access/refresh tokens
- Shadcn-style reusable UI components in `src/components/ui`

## Core Features Implemented

- Role-based authentication: `farmer`, `buyer`, `admin`
- Profile management and account suspension enforcement
- Listing lifecycle: create, edit, activate/inactivate/archive
- Marketplace search, filtering, and sorting
- Order lifecycle: pending, accepted/rejected, payment pending, paid/cancelled
- Payment flow with callback/idempotency simulation (Daraja-style contract)
- In-app notifications for order/payment/system events
- Admin panel for user moderation, listing moderation, reports, and audit logs
- REST API routes aligned with the project SDS/SRS endpoint catalog
- Supabase backend package with SQL migrations, RLS, RPC business functions, and storage policies

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## ⚠️ IMPORTANT: Registration Issue & Fix

**Issue:** User profiles are not being created when users register (as of 2026-02-28).

**Status:** ✅ FIXED - See [QUICK_FIX.md](./QUICK_FIX.md)

**Quick Fix (3 steps):**
1. Go to https://app.supabase.com/project/dmhjccyjbzxaxpikfcve/sql/new
2. Paste the SQL from `supabase/migrations/20260228140000_fix_email_constraint.sql`
3. Click "Run"

For detailed explanation, see [REGISTRATION_FIX.md](./REGISTRATION_FIX.md)

After applying the fix:
```bash
source .env.local
node test-registration-fix.mjs  # Verify fix
npm run dev                       # Start server
# Register user at http://localhost:3000/register
```

## Build & Lint

```bash
npm run lint
npm run build
npm run test
```

## Supabase Backend

Supabase database backend is implemented under `supabase/`:

- `supabase/migrations/*.sql` for schema, RLS, triggers, RPC functions, and storage policies
- `supabase/seed.sql` for optional sample data
- `supabase/README.md` for CLI setup and execution

Apply migrations with Supabase CLI:

```bash
supabase db push
```

The app runtime is now Supabase-backed end to end (`src/lib/auth.ts` + `src/lib/services.ts`).

## Production Notes

- Set `PAYMENT_CALLBACK_TOKEN` and send it as `x-callback-token` from payment callbacks.
- Optionally set `PAYMENT_CALLBACK_ALLOWED_IPS` (comma-separated) to restrict callback source IPs.
- Set `NEXT_PUBLIC_APP_URL` for password reset and callback URL construction.
- Optional Daraja integration is enabled when Daraja env credentials are provided.
- Health endpoint: `GET /api/health`.
- Operational runbook: `docs/operations.md`.

## Account Setup

1. Register buyer/farmer accounts via `/register`.
2. Promote any user to admin in Supabase SQL editor if needed:
   `update public.profiles set role = 'admin' where email = 'your-email@example.com';`
