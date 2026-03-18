import { redirect } from "next/navigation";

import { markNotificationReadAction } from "@/app/actions";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { FeedbackBanner } from "@/components/feedback-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getNotificationsForUser } from "@/lib/services";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;

  const notifications = await getNotificationsForUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Notifications</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Order, payment, and system updates in one feed.
        </p>
      </div>

      <FeedbackBanner error={error} success={success} />

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
            No notifications available.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {notifications.map((notification) => (
            <Card key={notification.id}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{notification.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {notification.type}
                    </Badge>
                    {!notification.isRead && <Badge variant="warning">Unread</Badge>}
                  </div>
                </div>
                <CardDescription>{notification.message}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[var(--muted-foreground)]">{formatDate(notification.createdAt)}</p>
                {!notification.isRead && (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <ActionSubmitButton size="sm" variant="outline" pendingText="Updating..." pendingDescription="Marking this notification as read.">
                      Mark as read
                    </ActionSubmitButton>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
