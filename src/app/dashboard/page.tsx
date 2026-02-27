import Link from "next/link";
import { redirect } from "next/navigation";

import { FeedbackBanner } from "@/components/feedback-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardSnapshot, getNotificationsForUser } from "@/lib/services";
import { formatKes, formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function DashboardActionLinks({ role }: { role: string }) {
  if (role === "farmer") {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href="/listings">
          <Button>Manage Listings</Button>
        </Link>
        <Link href="/orders">
          <Button variant="outline">Review Orders</Button>
        </Link>
      </div>
    );
  }

  if (role === "buyer") {
    return (
      <div className="flex flex-wrap gap-2">
        <Link href="/marketplace">
          <Button>Browse Listings</Button>
        </Link>
        <Link href="/orders">
          <Button variant="outline">Track Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/admin">
        <Button>Open Admin Panel</Button>
      </Link>
      <Link href="/marketplace">
        <Button variant="outline">View Marketplace</Button>
      </Link>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;

  const [snapshot, notifications] = await Promise.all([
    getDashboardSnapshot({ userId: user.id, role: user.role }),
    getNotificationsForUser(user.id),
  ]);

  return (
    <div className="space-y-6">
      <FeedbackBanner error={error} success={success} />

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">Signed in as</p>
            <h1 className="text-2xl font-semibold tracking-tight">{user.fullName}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Badge variant="secondary">{user.role}</Badge>
              {user.county && <span className="text-[var(--muted-foreground)]">{user.county}</span>}
            </div>
          </div>
          <DashboardActionLinks role={user.role} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardDescription>Active Listings</CardDescription>
            <CardTitle>{snapshot.activeListings}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending Orders</CardDescription>
            <CardTitle>{snapshot.pendingOrders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Completed Orders</CardDescription>
            <CardTitle>{snapshot.completedOrders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle>{formatKes(snapshot.totalRevenueKes)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Unread Notifications</CardDescription>
            <CardTitle>{snapshot.unreadNotifications}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Recent Notifications</h2>
          <Link href="/notifications" className="text-sm text-[var(--primary)] hover:underline">
            View all
          </Link>
        </div>

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
              No notifications yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {notifications.slice(0, 5).map((item) => (
              <Card key={item.id}>
                <CardHeader className="gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    {!item.isRead && <Badge variant="warning">New</Badge>}
                  </div>
                  <CardDescription>{item.message}</CardDescription>
                  <p className="text-xs text-[var(--muted-foreground)]">{formatDate(item.createdAt)}</p>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
