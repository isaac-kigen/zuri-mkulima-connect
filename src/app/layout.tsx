import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import RootLayoutClient from "@/components/shared/RootLayoutClient";
import "antd/dist/reset.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1a7a1a",
};

export const metadata: Metadata = {
  title: "Zuri Mkulima Connect — Connecting Farmers to Markets",
  description: "Kenya's premier agricultural marketplace connecting farmers directly to buyers with M-Pesa payments. Fresh produce, direct from farmers.",
  keywords: ["agriculture", "Kenya", "farmers", "marketplace", "M-Pesa", "fresh produce", "buy produce", "sell produce"],
  authors: [{ name: "Zuri Mkulima Connect" }],
  openGraph: {
    title: "Zuri Mkulima Connect — Connecting Farmers to Markets",
    description: "Kenya's premier agricultural marketplace connecting farmers directly to buyers.",
    type: "website",
    locale: "en_KE",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}