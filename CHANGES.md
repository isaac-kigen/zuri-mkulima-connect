# Zuri Mkulima Connect — New Features Implementation

## Summary of Changes

### 1. ✅ Two-Way Ratings System
**Per-Listing Rating + Farmer Rating**

- **Farmer Rating** (`ratings` table): Rates the farmer overall after a transaction
- **Listing Rating** (`listing_ratings` table): Rates the specific product/listing
- **Rule**: Ratings can ONLY be submitted after an order is `completed`
- **Endpoint**: `POST /api/ratings` — accepts `order_id`, `farmer_rating`, `farmer_review`, `listing_rating`, `listing_review`

### 2. ✅ Mandatory Farmer Vetting
**Farmers cannot list without being vetted**

- **Vetting Form** (`vetting_forms` table): Farmers submit farm details on registration
- **Admin Review**: Admin approves/rejects after visiting
- **Listing creation blocked**: `POST /api/marketplace` checks `vetting_status === "approved"`
- **Buyers auto-approved**: No vetting needed for buyers

### 3. ✅ Buyer Views Farmer Stats on Listings
**Brief stats: 📦 completed sales, ⭐ avg rating, 💬 total ratings**

### 4. ✅ Inventory Management
**Quantity reduces when orders are placed; auto-deactivates at 0**

### 5. ✅ 5% Platform Fee
**Calculated: `platform_fee = total * 0.05`, farmer earns the rest**

### 6. ✅ Escrow Payment System (NEW)
**Payment held in platform until both parties confirm**

#### Flow:
```
pending → accepted → paid (funds HELD in escrow)
                         ↓
              ┌──────────┴──────────┐
              ↓                      ↓
     Farmer confirms          Buyer confirms
     delivery                receipt
     POST /deliver           POST /receive
              ↓                      ↓
              └──────────┬──────────┘
                         ↓
                   BOTH confirmed?
                    YES → completed
                    (funds RELEASED to farmer)
```

#### Key Rules:
- After M-Pesa payment succeeds → order = `paid` (funds **held in platform**)
- **Farmer** must confirm they delivered: `POST /api/orders/[id]/deliver`
- **Buyer** must confirm they received: `POST /api/orders/[id]/receive`
- **Only when BOTH confirm** → order = `completed` → funds released to farmer
- Either can confirm first — the system waits for the other
- Cancelling/rejecting a `paid` order triggers refund notification + inventory restore
- Admin can force-complete via `POST /api/orders/[id]/complete`

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/db/types.ts` | Added `paid` to OrderStatus, added `paid_at`, `delivered_at`, `received_at` |
| `src/lib/supabase/types.ts` | Added `paid` to enum, added new columns to orders |
| `src/app/api/orders/[id]/deliver/route.ts` | **NEW** — Farmer confirms delivery |
| `src/app/api/orders/[id]/receive/route.ts` | **NEW** — Buyer confirms receipt |
| `src/app/api/orders/[id]/complete/route.ts` | Updated — now admin-only for paid orders; redirects to escrow flow |
| `src/app/api/orders/[id]/cancel/route.ts` | Updated — handles paid orders (refund + inventory restore) |
| `src/app/api/orders/[id]/reject/route.ts` | Updated — handles paid orders (refund + inventory restore) |
| `src/app/api/payments/callback/route.ts` | Updated — payment sets order to `paid` (escrow), not `completed` |
| `supabase/migrations/new_features.sql` | Updated — added `paid` enum, `paid_at`, `delivered_at`, `received_at` columns |

---

## New API Endpoints

### `POST /api/orders/[id]/deliver` (Farmer confirms delivery)
```
Headers: x-csrf-token
Body: (none required)
Response: { success: true, data: { message, status, awaiting? } }
```

### `POST /api/orders/[id]/receive` (Buyer confirms receipt)
```
Headers: x-csrf-token
Body: (none required)
Response: { success: true, data: { message, status, awaiting? } }
```

---

## Database Migration (Required)

Run **`supabase/migrations/new_features.sql`** in Supabase SQL Editor. This adds:
- `paid` to `order_status` enum
- `paid_at`, `delivered_at`, `received_at` columns to `orders`
- Indexes for performance
