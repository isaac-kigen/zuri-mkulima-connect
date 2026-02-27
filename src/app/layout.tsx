import type { Metadata } from "next";
import "./globals.css";

import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Mkulima Connect",
  description:
    "Digital marketplace connecting farmers and buyers for transparent produce trading in Kenya.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
