import Link from "next/link";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/actions";
import { FeedbackBanner } from "@/components/feedback-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;

  return (
    <div className="mx-auto max-w-md py-8 sm:py-10">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your buyer, farmer, or admin workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FeedbackBanner error={error} success={success} />

          <form action={loginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="name@example.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required placeholder="Enter your password" />
            </div>

            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--muted-foreground)]">
            Accounts are now managed by Supabase Auth.
            <p>Create a buyer or farmer account from the registration page.</p>
            <p>Admin accounts can be promoted directly in Supabase for moderation access.</p>
          </div>

          <p className="text-sm text-[var(--muted-foreground)]">
            New here?{" "}
            <Link href="/register" className="font-medium text-[var(--primary)] hover:underline">
              Create account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
