"use client";

import React from "react";
import { Menu, Button } from "antd";
import {
  ShopOutlined,
  ShoppingCartOutlined,
  DashboardOutlined,
  PlusOutlined,
  OrderedListOutlined,
  StarOutlined,
  WarningOutlined,
  TeamOutlined,
  BarChartOutlined,
  AuditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useRouter, usePathname } from "next/navigation";

export default function DashboardSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { profile, isAdmin, isFarmer, isBuyer } = useAuth();
  const { items: cartItems } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  /* ---- Menu groups per role ---- */
  const farmerItems = [
    { key: "/farmer/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    {
      key: "listings-group",
      icon: <ShopOutlined />,
      label: "Listings",
      children: [
        { key: "/farmer/listings", label: "My Listings" },
        { key: "/farmer/listings/new", icon: <PlusOutlined />, label: "Add New" },
      ],
    },
    { key: "/farmer/orders", icon: <OrderedListOutlined />, label: "Orders" },
    { key: "/farmer/ratings", icon: <StarOutlined />, label: "Ratings" },
    { key: "/farmer/vetting", icon: <WarningOutlined />, label: "Vetting" },
  ];

  const buyerItems = [
    { key: "/buyer/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/buyer/marketplace", icon: <ShopOutlined />, label: "Marketplace" },
    { key: "/buyer/orders", icon: <OrderedListOutlined />, label: "My Orders" },
    {
      key: "/buyer/cart",
      icon: <ShoppingCartOutlined />,
      label: `Cart${cartItems.length ? ` (${cartItems.length})` : ""}`,
    },
  ];

  const adminItems = [
    { key: "/admin/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/admin/users", icon: <TeamOutlined />, label: "Users" },
    { key: "/admin/listings", icon: <ShopOutlined />, label: "Listings" },
    { key: "/admin/orders", icon: <OrderedListOutlined />, label: "Orders" },
    { key: "/admin/payments", icon: <BarChartOutlined />, label: "Payments" },
    { key: "/admin/vetting", icon: <WarningOutlined />, label: "Vetting" },
    { key: "/admin/complaints", icon: <WarningOutlined />, label: "Complaints" },
    { key: "/admin/reports", icon: <BarChartOutlined />, label: "Reports" },
    { key: "/admin/audit-log", icon: <AuditOutlined />, label: "Audit Log" },
  ];

  const menuItems = isAdmin ? adminItems : isFarmer ? farmerItems : buyerItems;

  // Convert to Ant Design Menu items format
  const antMenuItems = menuItems.map((item: any) => {
    if (item.children) {
      return {
        key: item.key,
        icon: item.icon,
        label: item.label,
        children: item.children.map((child: any) => ({
          key: child.key,
          icon: child.icon || null,
          label: child.label,
        })),
      };
    }
    return {
      key: item.key,
      icon: item.icon,
      label: item.label,
    };
  });

  // Extras that appear below the main nav
  const bottomItems = [
    { key: `/${profile?.role}/profile`, icon: <TeamOutlined />, label: "Profile" },
    { key: `/${profile?.role}/complaints`, icon: <WarningOutlined />, label: "Complaints" },
  ];

  return (
    <aside className="dashboard-sidebar">
      {/* Collapse toggle */}
      <div className="sidebar-toggle-wrap">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          className="sidebar-toggle-btn"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        />
      </div>

      {/* Main navigation */}
      <nav className="sidebar-nav">
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          defaultOpenKeys={menuItems.filter((i: any) => i.children).map((i: any) => i.key)}
          items={antMenuItems}
          inlineCollapsed={collapsed}
          style={{ border: "none", background: "transparent" }}
          onClick={({ key }) => router.push(key)}
        />
      </nav>

      {/* Bottom quick links */}
      <div className="sidebar-bottom">
        <Menu
          mode="inline"
          selectedKeys={[]}
          items={bottomItems}
          inlineCollapsed={collapsed}
          style={{ border: "none", background: "transparent" }}
          onClick={({ key }) => router.push(key)}
        />
      </div>

      <style jsx>{`
        .dashboard-sidebar {
          width: ${collapsed ? "80px" : "240px"};
          height: 100vh;
          position: sticky;
          top: 0;
          background: #fff;
          border-right: 1px solid var(--color-border, #e2e8e0);
          display: flex;
          flex-direction: column;
          transition: width 200ms ease;
          overflow: hidden;
          z-index: 50;
        }

        .sidebar-toggle-wrap {
          padding: 12px 8px 4px;
          display: flex;
          justify-content: ${collapsed ? "center" : "flex-end"};
        }

        .sidebar-toggle-btn {
          color: #8a9a8a;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 150ms ease;
        }
        .sidebar-toggle-btn:hover {
          background: #e6f4e6 !important;
          color: #1a7a1a !important;
        }

        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 4px 0;
        }

        .sidebar-bottom {
          border-top: 1px solid #e2e8e0;
          padding: 4px 0;
        }

        /* Scrollbar styling */
        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-nav::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
      `}</style>
    </aside>
  );
}
