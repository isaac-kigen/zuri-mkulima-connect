"use client";

import { Typography, Card, Table } from "antd";
import { BarChartOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import RoleGuard from "@/components/shared/RoleGuard";
import AdminStatsCards from "@/components/admin/StatsCards";
import Loading from "@/components/shared/Loading";

const { Title } = Typography;

export default function AdminReports() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reports")
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.data); setLoading(false); });
  }, []);

  return (
    <RoleGuard role="admin">
      <div className="admin-page slide-up">
        <Title level={2} style={{ fontWeight: 700 }}><BarChartOutlined /> Platform Reports</Title>

        {loading ? <Loading /> : (
          <>
            <AdminStatsCards stats={stats} />

            <Card title="📊 Sales by Farmer" className="section-card">
              <Table
                dataSource={stats?.sales_by_farmer || []}
                rowKey="farmer_id"
                columns={[
                  { title: "Farmer", dataIndex: "farmer_name", key: "farmer" },
                  { title: "Total Sales (KES)", dataIndex: "total", key: "total",
                    render: (v: number) => <strong>{v?.toLocaleString()}</strong> },
                ]}
                pagination={false}
                size="small"
              />
            </Card>

            <Card title="💳 Recent Payments" className="section-card">
              <Table
                dataSource={stats?.recent_payments || []}
                rowKey="id"
                columns={[
                  { title: "Time", dataIndex: "created_at", key: "time",
                    render: (d: string) => new Date(d).toLocaleString(), responsive: ["md" as const] },
                  { title: "Amount", dataIndex: "amount_kes", key: "amount",
                    render: (v: number) => <strong>KES {v?.toLocaleString()}</strong> },
                  { title: "Receipt", dataIndex: "mpesa_receipt_number", key: "receipt" },
                  { title: "Status", dataIndex: "status", key: "status" },
                  { title: "Payer", key: "payer",
                    render: (_: any, r: any) => r.payer?.full_name || "N/A", responsive: ["sm" as const] },
                ]}
                pagination={false}
                size="small"
              />
            </Card>
          </>
        )}
      </div>
      <style jsx>{`
        .admin-page { max-width: 1100px; }
        .section-card { border-radius: 14px !important; margin-top: 14px; }
      `}</style>
    </RoleGuard>
  );
}
