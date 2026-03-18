import { redirect } from "next/navigation";

import { updateProfileAction } from "@/app/actions";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { FeedbackBanner } from "@/components/feedback-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProfilePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Manage your account information and contact details.
        </p>
      </div>

      <FeedbackBanner error={error} success={success} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{user.fullName}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
            <Badge variant="secondary" className="capitalize">
              {user.role}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={updateProfileAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" defaultValue={user.fullName} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={user.phone ?? ""} placeholder="2547XXXXXXXX" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="county">County</Label>
              <Input id="county" name="county" defaultValue={user.county ?? ""} placeholder="Nairobi" />
            </div>

            <ActionSubmitButton pendingText="Saving profile..." pendingDescription="Updating your account details.">
              Save profile
            </ActionSubmitButton>
          </form>

          <div className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs text-[var(--muted-foreground)]">
            <p>Member since: {formatDate(user.createdAt)}</p>
            <p>Last update: {formatDate(user.updatedAt)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
