"use client";

import React from "react";
import { Badge } from "antd";
import {
  HomeOutlined,
  ShopOutlined,
  OrderedListOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  PlusCircleOutlined,
  DashboardOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useRouter, usePathname } from "next/navigation";

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  badge?: number;
}

export default function MobileBottomNav() {
  const { user, isAdmin, isFarmer, isBuyer } = useAuth();
  const { items: cartItems } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  const isActive = (path: string) => pathname.startsWith(path);

  const buyerNav: NavItem[] = [
    { key: "/buyer/dashboard", icon: <HomeOutlined />, label: "Home", path: "/buyer/dashboard" },
    { key: "/buyer/marketplace", icon: <ShopOutlined />, label: "Shop", path: "/buyer/marketplace" },
    { key: "/buyer/cart", icon: <ShoppingCartOutlined />, label: "Cart", path: "/buyer/cart", badge: cartItems.length },
    { key: "/buyer/orders", icon: <OrderedListOutlined />, label: "Orders", path: "/buyer/orders" },
    { key: "/buyer/profile", icon: <UserOutlined />, label: "Profile", path: "/buyer/profile" },
  ];

  const farmerNav: NavItem[] = [
    { key: "/farmer/dashboard", icon: <HomeOutlined />, label: "Home", path: "/farmer/dashboard" },
    { key: "/farmer/listings", icon: <ShopOutlined />, label: "Listings", path: "/farmer/listings" },
    { key: "/farmer/listings/new", icon: <PlusCircleOutlined />, label: "New", path: "/farmer/listings/new" },
    { key: "/farmer/orders", icon: <OrderedListOutlined />, label: "Orders", path: "/farmer/orders" },
    { key: "/farmer/profile", icon: <UserOutlined />, label: "Profile", path: "/farmer/profile" },
  ];

  const adminNav: NavItem[] = [
    { key: "/admin/dashboard", icon: <DashboardOutlined />, label: "Dashboard", path: "/admin/dashboard" },
    { key: "/admin/users", icon: <TeamOutlined />, label: "Users", path: "/admin/users" },
    { key: "/admin/listings", icon: <ShopOutlined />, label: "Listings", path: "/admin/listings" },
    { key: "/admin/orders", icon: <OrderedListOutlined />, label: "Orders", path: "/admin/orders" },
    { key: "/admin/reports", icon: <DashboardOutlined />, label: "Reports", path: "/admin/reports" },
  ];

  const items: NavItem[] = isAdmin ? adminNav : isFarmer ? farmerNav : buyerNav;

  return (
    <>
      <nav className="mobile-bottom-nav">
        {items.map((item) => (
          <button
            key={item.key}
            className={`bottom-nav-item ${isActive(item.path) ? "active" : ""}`}
            onClick={() => router.push(item.path)}
            aria-label={item.label}
          >
            <span className="bottom-nav-icon">
              {item.badge ? (
                <Badge count={item.badge} size="small" offset={[4, -2]}>
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Inline styles — scoped to this component */}
      <style jsx>{`
        .mobile-bottom-nav {
          display: flex;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 99;
          background: #fff;
          border-top: 1px solid #e2e8e0;
          height: 60px;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
        }

        @media (min-width: 768px) {
          .mobile-bottom-nav {
            display: none;
          }
        }

        .bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          background: none;
          border: none;
          cursor: pointer;
          color: #8a9a8a;
          font-size: 10px;
          font-weight: 500;
          font-family: inherit;
          padding: 4px 2px;
          transition: all 150ms ease;
          -webkit-tap-highlight-color: transparent;
          position: relative;
        }
        .bottom-nav-item:active {
          transform: scale(0.92);
        }
        .bottom-nav-item.active {
          color: #1a7a1a;
        }
        .bottom-nav-item.active::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 3px;
          background: #1a7a1a;
          border-radius: 0 0 4px 4px;
        }

        .bottom-nav-icon {
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 24px;
        }

        .bottom-nav-label {
          font-size: 10px;
          line-height: 1;
        }
      `}</style>
    </>
  );
}
