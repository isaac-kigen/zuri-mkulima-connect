import { redirect } from "next/navigation";

import {
  createListingAction,
  deleteListingAction,
  setListingStatusAction,
  updateListingAction,
} from "@/app/actions";
import { FeedbackBanner } from "@/components/feedback-banner";
import { ListingStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/auth";
import { getAllListingsForAdmin, getFarmerListings } from "@/lib/services";
import { formatKes, formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ListingsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "buyer") {
    redirect("/dashboard?error=Only farmers or admins can manage listings.");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;

  const listings =
    user.role === "admin"
      ? await getAllListingsForAdmin(user.id)
      : await getFarmerListings(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Listing Management</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Create, edit, and control listing visibility for the marketplace.
        </p>
      </div>

      <FeedbackBanner error={error} success={success} />

      {user.role === "farmer" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create New Listing</CardTitle>
            <CardDescription>Add produce with clear pricing, quantity, and location.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createListingAction} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="productName">Product Name</Label>
                <Input id="productName" name="productName" required placeholder="Tomatoes" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" placeholder="Vegetables" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" required placeholder="Nakuru, Molo" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" min="1" step="any" required placeholder="200" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="unit">Unit</Label>
                <Input id="unit" name="unit" required placeholder="kg" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="priceKes">Price (KES)</Label>
                <Input id="priceKes" name="priceKes" type="number" min="1" step="any" required placeholder="95" />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="imageUrls">Image URL(s), comma-separated (optional)</Label>
                <Input
                  id="imageUrls"
                  name="imageUrls"
                  placeholder="https://.../image1.jpg, https://.../image2.jpg"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Fresh harvest, grade A" />
              </div>

              <div className="sm:col-span-2">
                <Button type="submit" className="w-full sm:w-auto">Create Listing</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            {user.role === "admin" ? "All Listings" : "My Listings"}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">Total: {listings.length}</p>
        </div>

        {listings.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
              No listings available.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {listings.map((listing) => (
              <Card key={listing.id}>
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg">{listing.productName}</CardTitle>
                    <ListingStatusBadge status={listing.status} />
                  </div>
                  <CardDescription>
                    Last updated {formatDate(listing.updatedAt)} · {listing.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm">
                    <p>
                      <strong>Price:</strong> {formatKes(listing.priceKes)}
                    </p>
                    <p>
                      <strong>Quantity:</strong> {listing.quantity} {listing.unit}
                    </p>
                  </div>

                  <form action={updateListingAction} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="listingId" value={listing.id} />

                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`productName-${listing.id}`}>Product Name</Label>
                      <Input id={`productName-${listing.id}`} name="productName" defaultValue={listing.productName} required />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`category-${listing.id}`}>Category</Label>
                      <Input id={`category-${listing.id}`} name="category" defaultValue={listing.category ?? ""} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`location-${listing.id}`}>Location</Label>
                      <Input id={`location-${listing.id}`} name="location" defaultValue={listing.location} required />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`quantity-${listing.id}`}>Quantity</Label>
                      <Input id={`quantity-${listing.id}`} name="quantity" type="number" min="1" step="any" defaultValue={listing.quantity} required />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`unit-${listing.id}`}>Unit</Label>
                      <Input id={`unit-${listing.id}`} name="unit" defaultValue={listing.unit} required />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`price-${listing.id}`}>Price (KES)</Label>
                      <Input id={`price-${listing.id}`} name="priceKes" type="number" min="1" step="any" defaultValue={listing.priceKes} required />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`status-${listing.id}`}>Status</Label>
                      <Select id={`status-${listing.id}`} name="status" defaultValue={listing.status}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="archived">Archived</option>
                      </Select>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`description-${listing.id}`}>Description</Label>
                      <Textarea id={`description-${listing.id}`} name="description" defaultValue={listing.description ?? ""} />
                    </div>

                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <Button type="submit">Save Changes</Button>
                    </div>
                  </form>

                  <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                    <form action={setListingStatusAction}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={listing.status === "active" ? "inactive" : "active"}
                      />
                      <Button type="submit" variant="outline" size="sm">
                        {listing.status === "active" ? "Set Inactive" : "Set Active"}
                      </Button>
                    </form>

                    <form action={deleteListingAction}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <input type="hidden" name="reason" value="Owner moderation" />
                      <Button type="submit" variant="destructive" size="sm">
                        Archive Listing
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
