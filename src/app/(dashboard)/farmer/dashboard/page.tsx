"use client";

import { Typography, Row, Col, Card, Statistic, Button, Space } from "antd";
import {
  ShopOutlined,
  OrderedListOutlined,
  DollarOutlined,
  BellOutlined,
  PlusOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import RoleGuard from "@/components/shared/RoleGuard";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const { Title, Paragraph } = Typography;

export default function FarmerDashboard() {
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
      title: "Active Listings",
      value: snapshot?.active_listings || 0,
      icon: <ShopOutlined />,
      color: "#1a7a1a",
      bg: "#e6f4e6",
    },
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
      title: "Revenue (KES)",
      value: snapshot?.total_revenue || 0,
      icon: <DollarOutlined />,
      color: "#2563eb",
      bg: "#e8f0fe",
      format: true,
    },
  ];

  return (
    <RoleGuard role="farmer">
      <div className="dashboard slide-up">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
              🌾 Welcome, {profile?.full_name?.split(" ")[0]}
            </Title>
            <Paragraph type="secondary" style={{ margin: "2px 0 0" }}>
              Here&apos;s what&apos;s happening with your farm today
            </Paragraph>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => router.push("/farmer/listings/new")}
            className="hide-mobile"
          >
            New Listing
          </Button>
        </div>

        {/* Stats */}
        <Row gutter={[10, 10]} style={{ marginBottom: 20 }}>
          {statsCards.map((stat, i) => (
            <Col xs={12} sm={6} key={i}>
              <Card className="stat-card" bodyStyle={{ padding: 14 }}>
                <div className="stat-card-inner">
                  <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div className="stat-info">
                    <Statistic
                      title={stat.title}
                      value={stat.format ? `KES ${(stat.value || 0).toLocaleString()}` : stat.value}
                      loading={loading}
                      valueStyle={{ fontSize: 18, fontWeight: 700, color: "#1a2e1a" }}
                    />
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Quick Actions */}
        <Card title="⚡ Quick Actions" className="quick-actions-card">
          <Space wrap size="small">
            <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => router.push("/farmer/listings/new")}>
              Create Listing
            </Button>
            <Button icon={<OrderedListOutlined />} size="large" onClick={() => router.push("/farmer/orders")}>
              View Orders
            </Button>
            <Button icon={<StarOutlined />} size="large" onClick={() => router.push("/farmer/ratings")}>
              My Ratings
            </Button>
            <Button icon={<BellOutlined />} size="large" onClick={() => router.push("/farmer/notifications")}>
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
