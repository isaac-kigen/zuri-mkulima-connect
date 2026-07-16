"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout, Menu, Button, Typography, Space, Avatar, Dropdown } from "antd";
import {
  DashboardOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  LogoutOutlined,
  UserOutlined,
  AppleOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/lib/auth";
import type { UserType } from "@/types";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuMap: Record<UserType, { key: string; icon: React.ReactNode; label: string }[]> = {
  farmer: [
    { key: "/dashboard", icon: <DashboardOutlined />, label: "Overview" },
    { key: "/dashboard/produce", icon: <ShopOutlined />, label: "My Produce" },
    { key: "/dashboard/orders", icon: <ShoppingCartOutlined />, label: "Orders" },
  ],
  buyer: [
    { key: "/dashboard", icon: <DashboardOutlined />, label: "Overview" },
    { key: "/dashboard/market", icon: <ShopOutlined />, label: "Marketplace" },
    { key: "/dashboard/orders", icon: <ShoppingCartOutlined />, label: "My Orders" },
  ],
  admin: [
    { key: "/dashboard", icon: <DashboardOutlined />, label: "Overview" },
    { key: "/dashboard/users", icon: <TeamOutlined />, label: "Users" },
    { key: "/dashboard/transactions", icon: <ShoppingCartOutlined />, label: "Transactions" },
  ],
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, signout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/signin");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) return null;

  const menuItems = menuMap[user.type];

  const userMenu = {
    items: [
      { key: "profile", label: "Profile", icon: <UserOutlined /> },
      { type: "divider" as const },
      {
        key: "logout",
        label: "Sign Out",
        icon: <LogoutOutlined />,
        danger: true,
      },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === "logout") {
        signout();
        router.push("/");
      }
    },
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        breakpoint="lg"
        collapsedWidth={64}
        style={{ background: "#fff" }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <AppleOutlined style={{ fontSize: 24, color: "#16a34a" }} />
          <Text
            strong
            style={{
              marginLeft: 8,
              fontSize: 16,
              color: "#16a34a",
              whiteSpace: "nowrap",
            }}
          >
            Zuri Mkulima
          </Text>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[]}
          defaultSelectedKeys={["/dashboard"]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />

        {/* Role badge */}
        <div style={{ position: "absolute", bottom: 80, left: 0, right: 0, textAlign: "center" }}>
          <Text
            type="secondary"
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {user.type}
          </Text>
        </div>
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Space>
            <Text type="secondary">{user.email}</Text>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Avatar
                style={{ backgroundColor: "#16a34a", cursor: "pointer" }}
                icon={<UserOutlined />}
              />
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: 24, background: "#f5f5f5" }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
