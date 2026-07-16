"use client";

import React, { useState } from "react";
import DashboardSidebar from "./DashboardSidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="dashboard-shell">
      {/* Sidebar — desktop only */}
      <div className="hide-mobile dashboard-sidebar-col">
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Main content area */}
      <main className="dashboard-main">
        {children}
      </main>

      <style jsx>{`
        .dashboard-shell {
          display: flex;
          min-height: calc(100vh - var(--header-height, 56px) - var(--bottom-nav-height, 60px));
        }
        @media (min-width: 768px) {
          .dashboard-shell {
            min-height: calc(100vh - var(--header-height, 56px));
          }
        }

        .dashboard-sidebar-col {
          flex-shrink: 0;
        }

        .dashboard-main {
          flex: 1;
          min-width: 0;
          padding: 16px;
          padding-bottom: calc(16px + var(--bottom-nav-height, 60px) + env(safe-area-inset-bottom, 0px));
          overflow-y: auto;
        }
        @media (min-width: 480px) {
          .dashboard-main {
            padding: 20px;
            padding-bottom: calc(20px + var(--bottom-nav-height, 60px) + env(safe-area-inset-bottom, 0px));
          }
        }
        @media (min-width: 768px) {
          .dashboard-main {
            padding: 24px;
            padding-bottom: 24px;
          }
        }
        @media (min-width: 1024px) {
          .dashboard-main {
            padding: 28px;
            padding-bottom: 28px;
          }
        }
      `}</style>
    </div>
  );
}
