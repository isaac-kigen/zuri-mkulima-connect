"use client";

import { Typography, Row, Col, Card, Statistic, Button, Space } from "antd";
import {
  ShopOutlined,
  OrderedListOutlined,
  BellOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import RoleGuard from "@/components/shared/RoleGuard";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const { Title, Paragraph } = Typography;

export default function BuyerDashboard() {
  const { profile } = useAuth();
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setSnapshot(d.data); setLoading(false); });
  }, []);

  const statsCards = [
    {
      title: "Pending Orders",
      value: snapshot?.pending_orders || 0,
      icon: <OrderedListOutlined />,
      color: "#d97706",
      bg: "#fef3e2",
    },
    {
      title: "Completed",
      value: snapshot?.completed_orders || 0,
      icon: <OrderedListOutlined />,
      color: "#16a34a",
      bg: "#e6f4e6",
    },
    {
      title: "Notifications",
      value: snapshot?.unread_notifications || 0,
      icon: <BellOutlined />,
      color: "#dc2626",
      bg: "#fef2f2",
    },
  ];

  return (
    <RoleGuard role="buyer">
      <div className="dashboard slide-up">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <Title level={2} className="dashboard-title">
              🛒 Welcome, {profile?.full_name?.split(" ")[0]}
            </Title>
            <Paragraph type="secondary" className="dashboard-subtitle">
              Find fresh produce from verified farmers across Kenya
            </Paragraph>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={() => router.push("/buyer/marketplace")}
            className="hide-mobile"
          >
            Browse Marketplace
          </Button>
        </div>

        {/* Stats */}
        <Row gutter={[10, 10]} className="dashboard-stats">
          {statsCards.map((stat, i) => (
            <Col xs={12} sm={8} key={i}>
              <Card className="stat-card" bodyStyle={{ padding: 14 }}>
                <div className="stat-card-inner">
                  <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div className="stat-info">
                    <Statistic
                      title={stat.title}
                      value={stat.value}
                      loading={loading}
                      valueStyle={{ fontSize: 18, fontWeight: 700, color: "#1a2e1a" }}
                    />
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Mobile Browse Button */}
        <div className="hide-desktop" style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            block
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={() => router.push("/buyer/marketplace")}
          >
            Browse Marketplace
          </Button>
        </div>

        {/* Quick Actions */}
        <Card title="⚡ Quick Actions" className="quick-actions-card">
          <Space wrap size="small" className="quick-actions-space">
            <Button type="primary" icon={<ShopOutlined />} size="large" onClick={() => router.push("/buyer/marketplace")}>
              Browse Marketplace
            </Button>
            <Button icon={<ShoppingCartOutlined />} size="large" onClick={() => router.push("/buyer/cart")}>
              View Cart
            </Button>
            <Button icon={<OrderedListOutlined />} size="large" onClick={() => router.push("/buyer/orders")}>
              My Orders
            </Button>
            <Button icon={<BellOutlined />} size="large" onClick={() => router.push("/buyer/notifications")}>
              Notifications{snapshot?.unread_notifications > 0 ? ` (${snapshot.unread_notifications})` : ""}
            </Button>
          </Space>
        </Card>
      </div>

      <style jsx>{`
        .dashboard {
          max-width: 1000px;
          animation: slideUp 300ms ease forwards;
        }

        .dashboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .dashboard-title {
          margin: 0 !important;
          font-weight: 700 !important;
          font-size: 20px !important;
          color: var(--color-text) !important;
        }

        @media (min-width: 480px) {
          .dashboard-title {
            font-size: 24px !important;
          }
        }

        @media (min-width: 768px) {
          .dashboard-title {
            font-size: 26px !important;
          }
        }

        .dashboard-subtitle {
          margin: 4px 0 0 !important;
          font-size: 13px !important;
          color: var(--color-text-secondary) !important;
        }

        @media (min-width: 768px) {
          .dashboard-subtitle {
            font-size: 14px !important;
          }
        }

        .dashboard-stats {
          margin-bottom: 24px;
        }

        .stat-card {
          border-radius: var(--radius-lg) !important;
          border: 1px solid var(--color-border) !important;
          background: var(--color-surface) !important;
          transition: all var(--transition) !important;
        }

        .stat-card:hover {
          box-shadow: var(--shadow-sm) !important;
          transform: translateY(-2px);
        }

        .stat-card-inner {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .stat-info {
          flex: 1;
          min-width: 0;
        }

        .quick-actions-card {
          border-radius: var(--radius-lg) !important;
          border: 1px solid var(--color-border) !important;
          background: var(--color-surface) !important;
          margin-top: 20px;
        }

        .quick-actions-space {
          width: 100%;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </RoleGuard>
  );
}
