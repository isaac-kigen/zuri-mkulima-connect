import type { Metadata } from "next";
import "./globals.css";

import { ActionFeedbackToast } from "@/components/action-feedback-toast";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Zuri Mkulima Connect",
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
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ActionFeedbackToast />
          <AppShell user={user}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
