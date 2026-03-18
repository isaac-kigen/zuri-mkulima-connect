import { SiteHeader } from "@/components/site-header";
import type { PublicUser } from "@/lib/types";

export function AppShell({
  user,
  children,
}: Readonly<{ user: PublicUser | null; children: React.ReactNode }>) {
  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[var(--background)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,var(--bg-glow-1)_0%,transparent_32%),radial-gradient(circle_at_85%_18%,var(--bg-glow-2)_0%,transparent_26%),radial-gradient(circle_at_50%_100%,var(--bg-glow-3)_0%,transparent_35%)]" />
      <SiteHeader user={user} />
      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</main>
    </div>
  );
}
