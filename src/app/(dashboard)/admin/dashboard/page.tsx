"use client";

import { Typography, Row, Col, Card, Statistic, Table } from "antd";
import {
  TeamOutlined, ShopOutlined, OrderedListOutlined, DollarOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import RoleGuard from "@/components/shared/RoleGuard";
import { useAuth } from "@/context/AuthContext";

const { Title, Paragraph } = Typography;

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/reports")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStats(d.data);
          setRecentPayments(d.data.recent_payments || []);
        }
        setLoading(false);
      });
  }, []);

  const statCards = [
    { title: "Total Users", value: stats?.total_users || 0, icon: <TeamOutlined />, color: "#2563eb", bg: "#e8f0fe" },
    { title: "Active Listings", value: stats?.active_listings || 0, icon: <ShopOutlined />, color: "#1a7a1a", bg: "#e6f4e6" },
    { title: "Total Orders", value: stats?.total_orders || 0, icon: <OrderedListOutlined />, color: "#d97706", bg: "#fef3e2" },
    { title: "Revenue (KES)", value: stats?.total_revenue || 0, icon: <DollarOutlined />, color: "#16a34a", bg: "#e6f4e6", format: true },
    { title: "Pending", value: stats?.pending_orders || 0, icon: <OrderedListOutlined />, color: "#dc2626", bg: "#fef2f2" },
    { title: "Complaints", value: stats?.open_complaints || 0, icon: <WarningOutlined />, color: "#d97706", bg: "#fef3e2" },
  ];

  return (
    <RoleGuard role="admin">
      <div className="admin-dash slide-up">
        <div className="dash-header">
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
              🛡️ Admin Dashboard
            </Title>
            <Paragraph type="secondary" style={{ margin: "2px 0 0" }}>
              Welcome, {profile?.full_name}
            </Paragraph>
          </div>
        </div>

        {/* Stats */}
        <Row gutter={[10, 10]} style={{ marginBottom: 20 }}>
          {statCards.map((s, i) => (
            <Col xs={12} sm={8} md={4} key={i}>
              <Card className="stat-card" bodyStyle={{ padding: 14 }}>
                <div className="stat-card-inner">
                  <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                    {s.icon}
                  </div>
                  <Statistic
                    title={s.title}
                    value={s.format ? `KES ${(s.value || 0).toLocaleString()}` : s.value}
                    loading={loading}
                    valueStyle={{ fontSize: 16, fontWeight: 700, color: "#1a2e1a" }}
                  />
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Sales by Farmer */}
        <Card title="📊 Sales by Farmer" className="section-card">
          <Table
            loading={loading}
            dataSource={stats?.sales_by_farmer || []}
            rowKey="farmer_id"
            columns={[
              { title: "Farmer", dataIndex: "farmer_name", key: "farmer" },
              { title: "Total Sales (KES)", dataIndex: "total", key: "total",
                render: (v: number) => <strong>{v?.toLocaleString()}</strong> },
            ]}
            size="small"
            pagination={false}
          />
        </Card>

        {/* Recent Payments */}
        <Card title="💳 Recent Payments" className="section-card">
          <Table
            loading={loading}
            dataSource={recentPayments}
            rowKey="id"
            columns={[
              { title: "Time", dataIndex: "created_at", key: "time",
                render: (d: string) => new Date(d).toLocaleString(), responsive: ["md" as const] },
              { title: "Amount", dataIndex: "amount_kes", key: "amount",
                render: (v: number) => <strong>KES {v?.toLocaleString()}</strong> },
              { title: "Receipt", dataIndex: "mpesa_receipt_number", key: "receipt",
                render: (v: string) => v || <span style={{ color: "#8a9a8a" }}>—</span> },
              { title: "Status", dataIndex: "status", key: "status",
                render: (s: string) => (
                  <span style={{
                    color: s === "completed" ? "#16a34a" : "#dc2626",
                    fontWeight: 600,
                    fontSize: 12,
                  }}>
                    {s?.toUpperCase()}
                  </span>
                ) },
              { title: "Payer", key: "payer",
                render: (_: any, r: any) => r.payer?.full_name || "N/A", responsive: ["sm" as const] },
            ]}
            size="small"
          />
        </Card>
      </div>

      <style jsx>{`
        .admin-dash { max-width: 1100px; }
        .dash-header { margin-bottom: 16px; }
        .stat-card { border-radius: 12px !important; }
        .stat-card-inner { display: flex; align-items: center; gap: 10px; }
        .stat-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          flex-shrink: 0;
        }
        .section-card {
          border-radius: 14px !important;
          margin-top: 12px;
        }
      `}</style>
    </RoleGuard>
  );
}
