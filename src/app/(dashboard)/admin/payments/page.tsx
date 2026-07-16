"use client";

import { Typography, Card, Table, Tag } from "antd";
import { DollarOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Payment } from "@/lib/db/types";
import RoleGuard from "@/components/shared/RoleGuard";
import Loading from "@/components/shared/Loading";

const { Title } = Typography;

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payments/initiate")
      .then((r) => r.json())
      .then((d) => { setPayments(d.data || []); setLoading(false); });
  }, []);

  const columns = [
    { title: "Time", dataIndex: "created_at", key: "time",
      render: (d: string) => new Date(d).toLocaleString(), responsive: ["md" as const] },
    { title: "Amount (KES)", dataIndex: "amount_kes", key: "amount",
      render: (v: number) => <strong>{v?.toLocaleString()}</strong> },
    { title: "Phone", dataIndex: "phone_number", key: "phone", responsive: ["sm" as const] },
    { title: "M-Pesa Receipt", dataIndex: "mpesa_receipt_number", key: "receipt",
      render: (v: string) => v || <span style={{ color: "#8a9a8a" }}>—</span> },
    {
      title: "Status", dataIndex: "status", key: "status",
      render: (s: string) => (
        <Tag color={s === "completed" ? "green" : s === "pending" ? "gold" : "red"}>
          {s?.toUpperCase()}
        </Tag>
      ),
    },
    { title: "Payer", key: "payer", render: (_: any, r: any) => r.payer?.full_name || r.payer_id, responsive: ["sm" as const] },
  ];

  return (
    <RoleGuard role="admin">
      <div className="admin-page slide-up">
        <Title level={2} style={{ fontWeight: 700 }}><DollarOutlined /> All Payments</Title>
        <Card className="content-card">
          {loading ? <Loading /> : (
            <Table dataSource={payments} columns={columns} rowKey="id"
              pagination={{ pageSize: 15, size: "small" }} size="small" scroll={{ x: 700 }} />
          )}
        </Card>
      </div>
      <style jsx>{`
        .admin-page { max-width: 1100px; }
        .content-card { border-radius: 14px !important; }
      `}</style>
    </RoleGuard>
  );
}
