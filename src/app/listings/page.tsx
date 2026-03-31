import { redirect } from "next/navigation";

import {
  createListingAction,
  deleteListingAction,
  setListingStatusAction,
  updateListingAction,
} from "@/app/actions";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { FeedbackBanner } from "@/components/feedback-banner";
import { ListingStatusBadge } from "@/components/status-badge";
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
                <Label htmlFor="photos">Photos (optional)</Label>
                <Input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Upload JPEG, PNG, or WEBP images up to 10MB each.
                </p>
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
                <ActionSubmitButton className="w-full sm:w-auto" pendingText="Publishing listing..." pendingDescription="Saving product details and making your listing available.">
                  Create Listing
                </ActionSubmitButton>
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
                  {listing.photos.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {listing.photos.map((photo, index) => (
                        <div key={photo.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.publicUrl}
                            alt={`${listing.productName} photo ${index + 1}`}
                            className="h-40 w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

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
                      <Label htmlFor={`photos-${listing.id}`}>Add More Photos (optional)</Label>
                      <Input
                        id={`photos-${listing.id}`}
                        name="photos"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                      />
                      <p className="text-xs text-[var(--muted-foreground)]">
                        New uploads are added to the existing gallery.
                      </p>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`imageUrls-${listing.id}`}>Add Image URL(s), comma-separated (optional)</Label>
                      <Input
                        id={`imageUrls-${listing.id}`}
                        name="imageUrls"
                        placeholder="https://.../image1.jpg, https://.../image2.jpg"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`description-${listing.id}`}>Description</Label>
                      <Textarea id={`description-${listing.id}`} name="description" defaultValue={listing.description ?? ""} />
                    </div>

                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <ActionSubmitButton pendingText="Saving changes..." pendingDescription="Updating your listing details.">
                        Save Changes
                      </ActionSubmitButton>
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
                      <ActionSubmitButton variant="outline" size="sm" pendingText="Updating status..." pendingDescription="Changing listing visibility.">
                        {listing.status === "active" ? "Set Inactive" : "Set Active"}
                      </ActionSubmitButton>
                    </form>

                    <form action={deleteListingAction}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <input type="hidden" name="reason" value="Owner moderation" />
                      <ActionSubmitButton variant="destructive" size="sm" pendingText="Archiving..." pendingDescription="Removing this listing from active trading.">
                        Archive Listing
                      </ActionSubmitButton>
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
