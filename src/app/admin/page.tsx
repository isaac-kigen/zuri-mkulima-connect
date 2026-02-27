import { redirect } from "next/navigation";

import { archiveListingByAdminAction, suspendUserAction } from "@/app/actions";
import { FeedbackBanner } from "@/components/feedback-banner";
import { ListingStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth";
import { getAdminReports, getAllListingsForAdmin, getAllUsers } from "@/lib/services";
import { formatDate, formatKes } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard?error=Admin access required.");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;

  const [reports, users, listings] = await Promise.all([
    getAdminReports(user.id),
    getAllUsers(user.id),
    getAllListingsForAdmin(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Admin Control Panel</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Moderate users and listings, audit actions, and monitor transaction health.
        </p>
      </div>

      <FeedbackBanner error={error} success={success} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle>{reports.summary.totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active Listings</CardDescription>
            <CardTitle>{reports.summary.activeListings}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Orders</CardDescription>
            <CardTitle>{reports.summary.totalOrders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Successful Payments</CardDescription>
            <CardTitle>{reports.summary.successfulPayments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Platform Revenue</CardDescription>
            <CardTitle>{formatKes(reports.summary.platformRevenueKes)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Suspend or reactivate accounts based on policy violations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-[var(--border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{entry.fullName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{entry.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {entry.role}
                    </Badge>
                    {entry.isSuspended && <Badge variant="danger">Suspended</Badge>}
                  </div>
                </div>

                {entry.id !== user.id && (
                  <form action={suspendUserAction} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="targetUserId" value={entry.id} />
                    <input type="hidden" name="suspend" value={entry.isSuspended ? "false" : "true"} />
                    <div className="min-w-48 flex-1 space-y-1">
                      <Label htmlFor={`note-${entry.id}`}>Audit note (optional)</Label>
                      <Input id={`note-${entry.id}`} name="note" placeholder="Reason for moderation action" />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      variant={entry.isSuspended ? "outline" : "destructive"}
                    >
                      {entry.isSuspended ? "Reactivate" : "Suspend"}
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listing Moderation</CardTitle>
            <CardDescription>Archive listings that violate quality or trust rules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {listings.map((listing) => (
              <div key={listing.id} className="rounded-xl border border-[var(--border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{listing.productName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Farmer: {listing.farmer.fullName} · {listing.location}
                    </p>
                  </div>
                  <ListingStatusBadge status={listing.status} />
                </div>

                <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                  Price {formatKes(listing.priceKes)} · Qty {listing.quantity} {listing.unit}
                </div>

                {listing.status !== "archived" && (
                  <form action={archiveListingByAdminAction} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="listingId" value={listing.id} />
                    <div className="min-w-48 flex-1 space-y-1">
                      <Label htmlFor={`reason-${listing.id}`}>Reason</Label>
                      <Input id={`reason-${listing.id}`} name="reason" defaultValue="Policy violation" />
                    </div>
                    <Button type="submit" size="sm" variant="destructive">
                      Archive
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Most recent payment transactions and statuses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.recentPayments.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No payment records yet.</p>
            ) : (
              reports.recentPayments.map((payment) => (
                <div key={payment.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Order {payment.orderId.slice(0, 8)}</p>
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {formatKes(payment.amountKes)} · {formatDate(payment.updatedAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
            <CardDescription>Immutable admin action history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.recentAuditLogs.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No audit actions recorded.</p>
            ) : (
              reports.recentAuditLogs.map((item) => (
                <div key={item.id} className="rounded-xl border border-[var(--border)] p-3">
                  <p className="text-sm font-medium">{item.action}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Target: {item.targetTable} / {item.targetId.slice(0, 8)}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">{formatDate(item.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
