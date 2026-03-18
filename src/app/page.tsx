import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getListings } from "@/lib/services";
import { formatKes } from "@/lib/utils";

export default async function Home() {
  const user = await getCurrentUser();
  let listings = [] as Awaited<ReturnType<typeof getListings>>;
  let listingsError: string | null = null;

  try {
    listings = (await getListings({ sort: "latest" })).slice(0, 6);
  } catch (error) {
    if (error instanceof AppError) {
      listingsError = error.message;
    } else {
      throw error;
    }
  }

  return (
    <div className="space-y-10 sm:space-y-14">
      <section className="glass-panel hero-grid relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.55),transparent_35%),linear-gradient(135deg,rgba(28,122,92,0.1),transparent_55%),linear-gradient(210deg,rgba(255,143,61,0.14),transparent_48%)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="max-w-3xl space-y-6">
            <Badge className="border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]">
              Kenya&apos;s modern produce trading layer
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                Move fresh produce with faster trust, cleaner payments, and better visibility.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
                Zuri Mkulima Connect gives farmers a premium storefront, buyers a clearer procurement flow, and both sides a real Daraja-backed payment trail built for reliable day-to-day trade.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={user ? "/dashboard" : "/register"}>
                <Button size="lg" className="min-w-40">
                  {user ? "Open Dashboard" : "Start Trading"}
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button variant="outline" size="lg" className="min-w-40">
                  Explore Marketplace
                </Button>
              </Link>
            </div>
            <div className="grid gap-3 text-sm text-[var(--muted-foreground)] sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4">
                <p className="text-2xl font-semibold text-[var(--foreground)]">24/7</p>
                <p>Order creation and callback-aware payment tracking.</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4">
                <p className="text-2xl font-semibold text-[var(--foreground)]">Live</p>
                <p>Daraja STK push and callback observability for every transaction.</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4">
                <p className="text-2xl font-semibold text-[var(--foreground)]">Mobile</p>
                <p>Designed for fast workflows on field devices and buyer phones.</p>
              </div>
            </div>
          </div>

          <div className="relative min-h-[420px]">
            <div className="animate-float absolute right-0 top-0 w-full max-w-md rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/90 p-5 shadow-[0_25px_90px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Farm visibility</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Listings, pricing, and quantity in one glance.</p>
                </div>
                <Badge variant="secondary">Farmer view</Badge>
              </div>
              <div className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">Grade A Tomatoes</p>
                    <p className="text-sm text-[var(--muted-foreground)]">Nakuru · 320 kg ready</p>
                  </div>
                  <p className="text-xl font-semibold">{formatKes(95)}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-[var(--primary)]">Fresh harvest</span>
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-medium">Verified seller</span>
                </div>
              </div>
            </div>

            <div className="animate-float-delay absolute bottom-0 left-0 w-full max-w-sm rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/90 p-5 shadow-[0_25px_90px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Buyer checkout</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Clear payment state from initiation to callback.</p>
                </div>
                <Badge className="bg-[var(--primary)] text-white">Daraja</Badge>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-[var(--surface-muted)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">STK push sent</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Awaiting phone confirmation</p>
                  </div>
                  <span className="animate-pulse-soft h-3 w-3 rounded-full bg-[var(--accent)]" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] p-3">
                    <p className="text-xs text-[var(--muted-foreground)]">Order flow</p>
                    <p className="mt-1 text-sm font-semibold">Approve, pay, fulfill</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] p-3">
                    <p className="text-xs text-[var(--muted-foreground)]">Ops visibility</p>
                    <p className="mt-1 text-sm font-semibold">Recent logs in admin</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>For Farmers</CardTitle>
            <CardDescription>List produce beautifully, manage inventory, and watch order flow without spreadsheets.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>For Buyers</CardTitle>
            <CardDescription>Search by product, county, and price, then move from discovery to payment in a tighter workflow.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>For Operations</CardTitle>
            <CardDescription>Admin reports, payment logs, and audit trails help teams understand what happened fast.</CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Featured Listings</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Active products from verified farmers.
            </p>
          </div>
          <Link href="/marketplace" className="text-sm font-medium text-[var(--primary)] hover:underline">
            View all listings
          </Link>
        </div>

        {listingsError && <Alert variant="warning">{listingsError}</Alert>}

        {listings.length === 0 ? (
          <Card className="glass-panel">
            <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
              No active listings yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Card key={listing.id} className="glass-panel h-full">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{listing.productName}</CardTitle>
                    <Badge variant="secondary">{listing.unit}</Badge>
                  </div>
                  <CardDescription>{listing.location}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Farmer: {listing.farmer.fullName}
                  </p>
                  <p className="text-2xl font-semibold">{formatKes(listing.priceKes)}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">Available: {listing.quantity} {listing.unit}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="glass-panel rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_10%,transparent),color-mix(in_srgb,var(--accent)_10%,transparent))] p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">Built for daily trade</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">A marketplace that feels trustworthy before, during, and after payment.</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
              From listing creation to payment callback logs, the experience now stays clearer for both users and administrators.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={user ? "/orders" : "/register"}>
              <Button size="lg">{user ? "View Orders" : "Create Account"}</Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" size="lg">See Live Listings</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
