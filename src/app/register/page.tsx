import Link from "next/link";
import { redirect } from "next/navigation";

import { registerAction } from "@/app/actions";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { FeedbackBanner } from "@/components/feedback-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getCurrentUser } from "@/lib/auth";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;

  return (
    <div className="mx-auto max-w-xl py-8 sm:py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Start trading produce directly with verified users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FeedbackBanner error={error} success={success} />

          <form action={registerAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" name="fullName" required placeholder="Jane Doe" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="name@example.com" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required placeholder="Use 8+ chars with uppercase, lowercase and number" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select id="role" name="role" defaultValue="buyer" required>
                  <option value="buyer">Buyer</option>
                  <option value="farmer">Farmer</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" name="phone" placeholder="2547XXXXXXXX" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="county">County (optional)</Label>
                <Input id="county" name="county" placeholder="Nakuru" />
              </div>
            </div>

            <ActionSubmitButton className="w-full" pendingText="Creating account..." pendingDescription="Setting up your profile and securing your access.">
              Create account
            </ActionSubmitButton>
          </form>

          <p className="text-sm text-[var(--muted-foreground)]">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
