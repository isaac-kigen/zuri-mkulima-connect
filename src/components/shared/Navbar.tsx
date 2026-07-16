"use client";

import React, { useState } from "react";
import { Layout, Menu, Badge, Dropdown, Button, Space, Avatar, Drawer } from "antd";
import {
  ShopOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  BellOutlined,
  DashboardOutlined,
  LogoutOutlined,
  PlusOutlined,
  OrderedListOutlined,
  StarOutlined,
  WarningOutlined,
  TeamOutlined,
  BarChartOutlined,
  AuditOutlined,
  MenuOutlined,
  LoginOutlined,
  UserAddOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useCart } from "@/context/CartContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const { Header } = Layout;

export default function Navbar() {
  const { user, profile, isAdmin, isFarmer, isBuyer, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const { items: cartItems } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ---- Not logged in: guest header ---- */
  if (!user) {
    const guestDrawerItems = [
      { key: "/", icon: <HomeOutlined />, label: "Home" },
      { key: "/login", icon: <LoginOutlined />, label: "Sign In" },
      { key: "/register", icon: <UserAddOutlined />, label: "Create Account" },
    ];

    return (
      <>
        <Header className="navbar-guest">
          <Link href="/" className="navbar-brand">
            🌿 Zuri Mkulima Connect
          </Link>
          <div className="navbar-right">
            <Space size="small" className="hide-mobile">
              <Button onClick={() => router.push("/register")} size="middle">
                Register
              </Button>
              <Button type="primary" onClick={() => router.push("/login")} size="middle">
                Login
              </Button>
            </Space>
            <Button
              type="text"
              icon={<MenuOutlined style={{ fontSize: 22 }} />}
              onClick={() => setDrawerOpen(true)}
              className="hide-desktop navbar-hamburger"
              aria-label="Menu"
            />
          </div>
        </Header>

        <Drawer
          title={<span style={{ fontWeight: 700 }}>🌿 Zuri Mkulima Connect</span>}
          placement="right"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          width={280}
          styles={{ body: { padding: 0 } }}
        >
          <Menu
            mode="inline"
            selectedKeys={[pathname]}
            items={guestDrawerItems}
            style={{ border: "none" }}
            onClick={({ key }) => { router.push(key); setDrawerOpen(false); }}
          />
        </Drawer>

        {/* Guest styles – FIXED: buttons side‑by‑side */}
        <style jsx>{`
          :global(.ant-layout-header.navbar-guest),
          .navbar-guest {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--color-surface);
            border-bottom: 1px solid var(--color-border);
            min-height: var(--header-height);
            padding: 10px var(--space-lg);
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: var(--shadow-sm);
            width: 100%;
            box-sizing: border-box;
          }

          @media (min-width: 768px) {
            .navbar-guest {
              padding: 10px var(--space-2xl);
            }
          }

          .navbar-right {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1 1 auto;        /* ← grow to fill space */
            min-width: 0;
            justify-content: flex-end;
            /* flex-wrap removed – no wrapping */
          }

          .navbar-brand {
            font-weight: 700;
            font-size: 17px;
            color: var(--color-primary);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            text-decoration: none;
            flex-shrink: 0;        /* ← brand never shrinks */
            transition: color var(--transition-fast);
          }

          .navbar-brand:hover {
            color: var(--color-primary-light);
          }

          @media (min-width: 768px) {
            .navbar-brand {
              font-size: 19px;
            }
          }

          .navbar-hamburger {
            color: var(--color-text);
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-lg);
            transition: all var(--transition-fast);
          }

          .navbar-hamburger:hover {
            background: var(--color-primary-bg) !important;
            color: var(--color-primary) !important;
          }
        `}</style>
      </>
    );
  }

  /* ---- Menu items per role ---- */
  const farmerMenu = [
    { key: "/farmer/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/farmer/listings", icon: <ShopOutlined />, label: "My Listings" },
    { key: "/farmer/listings/new", icon: <PlusOutlined />, label: "New Listing" },
    { key: "/farmer/orders", icon: <OrderedListOutlined />, label: "Orders" },
    { key: "/farmer/ratings", icon: <StarOutlined />, label: "Ratings" },
  ];

  const buyerMenu = [
    { key: "/buyer/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/buyer/marketplace", icon: <ShopOutlined />, label: "Marketplace" },
    { key: "/buyer/orders", icon: <OrderedListOutlined />, label: "My Orders" },
    { key: "/buyer/cart", icon: <ShoppingCartOutlined />, label: `Cart${cartItems.length ? ` (${cartItems.length})` : ""}` },
  ];

  const adminMenu = [
    { key: "/admin/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/admin/users", icon: <TeamOutlined />, label: "Users" },
    { key: "/admin/listings", icon: <ShopOutlined />, label: "Listings" },
    { key: "/admin/orders", icon: <OrderedListOutlined />, label: "Orders" },
    { key: "/admin/payments", icon: <BarChartOutlined />, label: "Payments" },
    { key: "/admin/complaints", icon: <WarningOutlined />, label: "Complaints" },
    { key: "/admin/reports", icon: <BarChartOutlined />, label: "Reports" },
    { key: "/admin/audit-log", icon: <AuditOutlined />, label: "Audit" },
  ];

  const menuItems = isAdmin ? adminMenu : isFarmer ? farmerMenu : buyerMenu;

  /* ---- User dropdown ---- */
  const userDropdownItems = [
    { key: "profile", icon: <UserOutlined />, label: "My Profile", onClick: () => { router.push(`/${profile?.role}/profile`); setDrawerOpen(false); } },
    { key: "notifications", icon: <BellOutlined />, label: `Notifications${unreadCount ? ` (${unreadCount})` : ""}`, onClick: () => { router.push(`/${profile?.role}/notifications`); setDrawerOpen(false); } },
    { key: "complaints", icon: <WarningOutlined />, label: "My Complaints", onClick: () => { router.push(`/${profile?.role}/complaints`); setDrawerOpen(false); } },
    { type: "divider" as const },
    { key: "logout", icon: <LogoutOutlined />, label: "Sign Out", danger: true, onClick: () => { signOut().then(() => router.push("/")); setDrawerOpen(false); } },
  ];

  const drawerMenuItems = [
    ...menuItems.map((m) => ({ key: m.key, icon: m.icon, label: m.label })),
    { type: "divider" as const },
    { key: "profile", icon: <UserOutlined />, label: "My Profile" },
    { key: "notifications", icon: <BellOutlined />, label: `Notifications${unreadCount ? ` (${unreadCount})` : ""}` },
    { key: "complaints", icon: <WarningOutlined />, label: "My Complaints" },
    { type: "divider" as const },
    { key: "logout", icon: <LogoutOutlined />, label: "Sign Out", danger: true },
  ];

  return (
    <>
      <Header className="navbar-auth">
        <div className="navbar-left">
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 22 }} />}
            onClick={() => setDrawerOpen(true)}
            className="hide-desktop navbar-hamburger"
            aria-label="Menu"
          />
          <Link href="/" className="navbar-brand">
            🌿 Zuri Mkulima Connect
          </Link>
        </div>

        <div className="navbar-right">
          {isBuyer && (
            <Badge count={cartItems.length} size="small" offset={[-2, 2]}>
              <Button
                type="text"
                icon={<ShoppingCartOutlined style={{ fontSize: 20 }} />}
                onClick={() => router.push("/buyer/cart")}
                className="navbar-icon-btn"
                aria-label="Cart"
              />
            </Badge>
          )}

          <Badge count={unreadCount} size="small" offset={[-2, 2]}>
            <Button
              type="text"
              icon={<BellOutlined style={{ fontSize: 20 }} />}
              onClick={() => router.push(`/${profile?.role}/notifications`)}
              className="navbar-icon-btn"
              aria-label="Notifications"
            />
          </Badge>

          <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight" trigger={["click"]}>
            <Space className="navbar-user-btn">
              <Avatar
                src={profile?.avatar_url}
                icon={<UserOutlined />}
                style={{ backgroundColor: "#1a7a1a", cursor: "pointer" }}
                size="small"
              />
              <span className="navbar-user-name">{profile?.full_name?.split(" ")[0] || "User"}</span>
            </Space>
          </Dropdown>
        </div>
      </Header>

      <Drawer
        title={
          <Space>
            <Avatar
              src={profile?.avatar_url}
              icon={<UserOutlined />}
              style={{ backgroundColor: "#1a7a1a" }}
              size="small"
            />
            <span style={{ fontWeight: 600 }}>{profile?.full_name || `User (${profile?.role || "unknown"})`}</span>
          </Space>
        }
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={280}
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={drawerMenuItems}
          style={{ border: "none" }}
          onClick={({ key }) => {
            if (key === "profile") { router.push(`/${profile?.role}/profile`); setDrawerOpen(false); }
            else if (key === "notifications") { router.push(`/${profile?.role}/notifications`); setDrawerOpen(false); }
            else if (key === "complaints") { router.push(`/${profile?.role}/complaints`); setDrawerOpen(false); }
            else if (key === "logout") { signOut().then(() => router.push("/")); setDrawerOpen(false); }
            else { router.push(key); setDrawerOpen(false); }
          }}
        />
      </Drawer>

      {/* Authenticated styles – unchanged, already working */}
      <style jsx>{`
        :global(.ant-layout-header.navbar-auth),
        .navbar-auth {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          align-items: center;
          justify-content: space-between;
          line-height: normal;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: var(--shadow-sm);
          width: 100%;
          box-sizing: border-box;
        }

        .navbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 1 auto;
          min-width: 0;
        }

        .navbar-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          flex: 1 1 auto;
          min-width: 0;
        }

        .navbar-brand {
          font-weight: 700;
          font-size: 17px;
          color: var(--color-primary);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          flex-shrink: 0;
          transition: color var(--transition-fast);
          line-height: 1;
          height: auto;
          padding: 0;
          margin: 0;
        }

        .navbar-brand:hover {
          color: var(--color-primary-light);
        }

        @media (min-width: 768px) {
          .navbar-brand {
            font-size: 19px;
          }
        }

        .navbar-hamburger {
          color: var(--color-text);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-lg);
          transition: all var(--transition-fast);
          flex: 0 0 auto;
          line-height: 1;
          padding: 0;
          margin: 0;
        }

        .navbar-hamburger:hover {
          background: var(--color-primary-bg);
          color: var(--color-primary);
        }

        .navbar-icon-btn {
          color: var(--color-text-secondary);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-lg);
          transition: all var(--transition-fast);
          flex: 0 0 auto;
          line-height: 1;
          padding: 0;
          margin: 0;
        }

        .navbar-icon-btn:hover {
          background: var(--color-primary-bg);
          color: var(--color-primary);
        }

        .navbar-user-btn {
          cursor: pointer;
          padding: 4px 10px;
          border-radius: var(--radius-lg);
          transition: background var(--transition-fast);
          display: flex;
          align-items: center;
          gap: 6px;
          line-height: 1;
        }

        .navbar-user-btn:hover {
          background: var(--color-bg);
        }

        .navbar-user-name {
          font-weight: 600;
          font-size: 13px;
          color: var(--color-text);
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: none;
          line-height: 1;
        }

        @media (min-width: 480px) {
          .navbar-user-name {
            display: inline;
          }
        }
      `}</style>
    </>
  );
}