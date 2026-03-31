import Link from "next/link";

import { placeOrderAction } from "@/app/actions";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { FeedbackBanner } from "@/components/feedback-banner";
import { ListingStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getCurrentUser } from "@/lib/auth";
import { getListings } from "@/lib/services";
import { formatKes } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();

  const search = getParam(params, "search");
  const location = getParam(params, "location");
  const minPrice = getParam(params, "minPrice");
  const maxPrice = getParam(params, "maxPrice");
  const sort = getParam(params, "sort");
  const pageParam = Number(getParam(params, "page") || "1");
  const pageSizeParam = Number(getParam(params, "pageSize") || "12");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0
    ? Math.min(36, Math.floor(pageSizeParam))
    : 12;
  const error = getParam(params, "error");
  const success = getParam(params, "success");

  const listings = await getListings({
    search,
    location,
    minPrice,
    maxPrice,
    sort,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    includeInactiveForFarmerId: user?.role === "farmer" ? user.id : undefined,
  });
  const hasPrevPage = page > 1;
  const hasNextPage = listings.length === pageSize;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Marketplace</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Browse active produce listings, filter by location and price, then place orders.
          </p>
        </div>
        {user?.role === "farmer" && (
          <Link href="/listings">
            <Button>Create Listing</Button>
          </Link>
        )}
      </div>

      <FeedbackBanner error={error || undefined} success={success || undefined} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" method="get">
            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <Input id="search" name="search" defaultValue={search} placeholder="Tomatoes, potatoes, onions..." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={location} placeholder="County / town" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="minPrice">Min Price (KES)</Label>
              <Input id="minPrice" name="minPrice" type="number" min="0" defaultValue={minPrice} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxPrice">Max Price (KES)</Label>
              <Input id="maxPrice" name="maxPrice" type="number" min="0" defaultValue={maxPrice} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sort">Sort</Label>
              <Select id="sort" name="sort" defaultValue={sort || "latest"}>
                <option value="latest">Latest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </Select>
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
              <input type="hidden" name="pageSize" value={String(pageSize)} />
              <Button type="submit">Apply Filters</Button>
              <Link href="/marketplace">
                <Button variant="outline" type="button">
                  Reset
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
            No listings match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => {
            const canOrder = user?.role === "buyer";

            return (
              <Card key={listing.id} className="flex h-full flex-col">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{listing.productName}</CardTitle>
                    <ListingStatusBadge status={listing.status} />
                  </div>
                  <CardDescription>
                    {listing.location} · Farmer: {listing.farmer.fullName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  {listing.photos[0] ? (
                    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={listing.photos[0].publicUrl}
                        alt={listing.productName}
                        className="h-48 w-full object-cover"
                      />
                    </div>
                  ) : null}
                  {listing.category && (
                    <Badge variant="secondary" className="capitalize">
                      {listing.category}
                    </Badge>
                  )}
                  <p className="text-sm text-[var(--muted-foreground)]">{listing.description ?? "No description provided."}</p>
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-muted)] p-3">
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Price</p>
                      <p className="text-sm font-semibold">{formatKes(listing.priceKes)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Available</p>
                      <p className="text-sm font-semibold">{listing.quantity} {listing.unit}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto flex-col items-stretch">
                  {canOrder ? (
                    <form action={placeOrderAction} className="space-y-2">
                      <input type="hidden" name="listingId" value={listing.id} />
                      <div className="space-y-1">
                        <Label htmlFor={`quantity-${listing.id}`}>Order Quantity ({listing.unit})</Label>
                        <Input
                          id={`quantity-${listing.id}`}
                          name="quantity"
                          type="number"
                          min="1"
                          max={Math.max(1, Math.floor(listing.quantity))}
                          defaultValue="1"
                          required
                        />
                      </div>
                      <ActionSubmitButton className="w-full" pendingText="Placing order..." pendingDescription="Checking stock and creating your order.">
                        Place Order
                      </ActionSubmitButton>
                    </form>
                  ) : user?.role === "farmer" ? (
                    <p className="text-sm text-[var(--muted-foreground)]">Switch to buyer account to place orders.</p>
                  ) : (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">Login</Link> as buyer to place orders.
                    </p>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          Page {page}
        </p>
        <div className="flex gap-2">
          {hasPrevPage ? (
            <Link
              href={`/marketplace?search=${encodeURIComponent(search)}&location=${encodeURIComponent(location)}&minPrice=${encodeURIComponent(minPrice)}&maxPrice=${encodeURIComponent(maxPrice)}&sort=${encodeURIComponent(sort)}&pageSize=${pageSize}&page=${page - 1}`}
            >
              <Button variant="outline" type="button">Previous</Button>
            </Link>
          ) : (
            <Button variant="outline" type="button" disabled>Previous</Button>
          )}
          {hasNextPage ? (
            <Link
              href={`/marketplace?search=${encodeURIComponent(search)}&location=${encodeURIComponent(location)}&minPrice=${encodeURIComponent(minPrice)}&maxPrice=${encodeURIComponent(maxPrice)}&sort=${encodeURIComponent(sort)}&pageSize=${pageSize}&page=${page + 1}`}
            >
              <Button type="button">Next</Button>
            </Link>
          ) : (
            <Button type="button" disabled>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
