"use client";

import React from "react";
import { ConfigProvider, App as AntApp } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/shared/Navbar";
import MobileBottomNav from "@/components/shared/MobileBottomNav";

const themeConfig = {
  token: {
    // Brand colours
    colorPrimary: "#1a7a1a",
    colorSuccess: "#16a34a",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    colorInfo: "#0284c7",
    colorTextBase: "#1a2e1a",
    colorTextSecondary: "#5a6e5a",
    colorBgBase: "#ffffff",
    colorBorder: "#e5ebe5",

    // Font
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,

    // Border radius
    borderRadius: 10,
    borderRadiusLG: 12,
    borderRadiusXL: 16,

    // Shadows
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    boxShadowSecondary: "0 10px 15px rgba(0,0,0,0.06)",

    // Control heights (buttons, inputs, etc.)
    controlHeight: 38,
    controlHeightLG: 44,
    padding: 16,
    paddingLG: 24,
  },
  components: {
    Layout: {
      headerBg: "#ffffff",
      headerHeight: 56,
      headerPadding: "0 16px",
      bodyBg: "#f5f7f5",
      footerBg: "#f5f7f5",
    },
    Button: {
      fontWeight: 600,
      paddingInline: 16,
      paddingBlock: 4,
      borderRadius: 12,
    },
    Card: {
      borderRadius: 16,
      padding: 16,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    },
    Menu: {
      itemBorderRadius: 8,
      itemMarginInline: 2,
    },
    Tag: {
      borderRadiusSM: 9999,
    },
    Input: {
      borderRadius: 12,
    },
    Select: {
      borderRadius: 12,
    },
    Table: {
      headerBg: "#fafbfa",
      borderColor: "#e5ebe5",
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Badge: {
      boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    },
  },
};

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider theme={themeConfig}>
        <AntApp>
          <AuthProvider>
            <NotificationProvider>
              <CartProvider>
                <div className="app-root" style={{ background: "var(--color-bg)" }}>
                  <Navbar />
                  <main className="site-content">{children}</main>
                  <MobileBottomNav />
                </div>
              </CartProvider>
            </NotificationProvider>
          </AuthProvider>
        </AntApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}