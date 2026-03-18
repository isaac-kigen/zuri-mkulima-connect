import Link from "next/link";

import { ActionSubmitButton } from "@/components/action-submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PublicUser } from "@/lib/types";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
    >
      {label}
    </Link>
  );
}

export function SiteHeader({ user }: { user: PublicUser | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color:var(--surface)]/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--accent))] text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,0,0,0.18)]">
              MC
            </span>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">Zuri Mkulima Connect</p>
              <p className="text-xs text-[var(--muted-foreground)]">Market infrastructure for modern produce trade</p>
            </div>
          </Link>

          <nav className="hidden items-center md:flex">
            <NavLink href="/marketplace" label="Marketplace" />
            {user && <NavLink href="/dashboard" label="Dashboard" />}
            {user && <NavLink href="/orders" label="Orders" />}
            {user?.role === "farmer" && <NavLink href="/listings" label="My Listings" />}
            {user && <NavLink href="/notifications" label="Notifications" />}
            {user?.role === "admin" && <NavLink href="/admin" label="Admin" />}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {user.role}
              </Badge>
              <Link href="/profile" className="hidden text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] sm:block">
                {user.fullName}
              </Link>
              <form action="/logout" method="post">
                <ActionSubmitButton variant="outline" size="sm" pendingText="Signing out..." pendingDescription="Closing your active session safely.">
                  Logout
                </ActionSubmitButton>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Create account</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
