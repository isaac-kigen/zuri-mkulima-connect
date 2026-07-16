"use client";

import { Typography, Card, Table, Tag, Space, Button, Popconfirm, message } from "antd";
import { OrderedListOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Order } from "@/lib/db/types";
import RoleGuard from "@/components/shared/RoleGuard";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title } = Typography;

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    setLoading(true);
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => { setOrders(d.data || []); setLoading(false); });
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleAction = async (id: string, action: string) => {
    const endpoint =
      action === "cancel" ? `/api/orders/${id}/cancel` :
      action === "accept" ? `/api/orders/${id}/accept` :
      `/api/orders/${id}/reject`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify({ reason: `Admin ${action}` }),
    });
    const data = await res.json();
    if (data.success) { message.success(`Order ${action}ed`); fetchOrders(); }
    else message.error(data.error);
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", render: (id: string) => <code>{id.slice(0, 8)}...</code> },
    { title: "Product", key: "product", render: (_: any, r: Order) => r.listing?.title || "N/A", ellipsis: true },
    { title: "Buyer", key: "buyer", render: (_: any, r: Order) => r.buyer?.full_name || "N/A", responsive: ["sm" as const] },
    { title: "Farmer", key: "farmer", render: (_: any, r: Order) => r.farmer?.full_name || "N/A", responsive: ["sm" as const] },
    { title: "Total", key: "total", render: (_: any, r: Order) => <strong>KES {r.total_amount_kes?.toLocaleString()}</strong> },
    { title: "Status", dataIndex: "status", key: "status", render: (s: any) => <OrderStatusBadge status={s} /> },
    {
      title: "Payment", key: "payment", responsive: ["md" as const],
      render: (_: any, r: Order) =>
        r.payment?.mpesa_receipt_number ? <Tag color="green">Paid</Tag> :
        r.payment?.status === "pending" ? <Tag color="gold">Pending</Tag> : <span style={{ color: "#8a9a8a" }}>—</span>,
    },
    {
      title: "", key: "actions",
      render: (_: any, r: Order) => (
        <Space size="small">
          {r.status === "pending" && (
            <>
              <Button size="small" type="primary" onClick={() => handleAction(r.id, "accept")}>Accept</Button>
              <Button size="small" danger onClick={() => handleAction(r.id, "reject")}>Reject</Button>
            </>
          )}
          {["pending", "accepted"].includes(r.status) && (
            <Popconfirm title="Cancel?" onConfirm={() => handleAction(r.id, "cancel")}>
              <Button size="small" danger>Cancel</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <RoleGuard role="admin">
      <div className="admin-page slide-up">
        <Title level={2} style={{ fontWeight: 700 }}><OrderedListOutlined /> Manage Orders</Title>
        <Card className="content-card">
          <Table dataSource={orders} columns={columns} rowKey="id" loading={loading}
            pagination={{ pageSize: 15, size: "small" }} size="small" scroll={{ x: 800 }} />
        </Card>
      </div>
      <style jsx>{`
        .admin-page { max-width: 1100px; }
        .content-card { border-radius: 14px !important; }
      `}</style>
    </RoleGuard>
  );
}
