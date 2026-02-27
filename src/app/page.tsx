import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { AppError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/auth";
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
    <div className="space-y-8 sm:space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(135deg,#f6fff3_0%,#fff4df_100%)] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <Badge>Digital Produce Marketplace</Badge>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Fair trade from farm to buyer, built for mobile-first access.
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] sm:text-base">
              Mkulima Connect helps farmers list produce, buyers place verified orders, and both parties complete secure payment workflows.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={user ? "/dashboard" : "/register"}>
                <Button size="lg">{user ? "Open Dashboard" : "Get Started"}</Button>
              </Link>
              <Link href="/marketplace">
                <Button variant="outline" size="lg">
                  Browse Produce
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid w-full max-w-md gap-3">
            <Card className="bg-[var(--surface)]/90">
              <CardHeader>
                <CardTitle>For Farmers</CardTitle>
                <CardDescription>Create listings, manage orders, and receive confirmed payments.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-[var(--surface)]/90">
              <CardHeader>
                <CardTitle>For Buyers</CardTitle>
                <CardDescription>Search by product, location, and price then order directly.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
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

        {listingsError && (
          <Alert variant="warning">
            {listingsError}
          </Alert>
        )}

        {listings.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
              No active listings yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Card key={listing.id} className="h-full">
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
    </div>
  );
}
