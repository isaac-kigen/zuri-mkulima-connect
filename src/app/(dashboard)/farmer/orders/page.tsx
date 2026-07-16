"use client";

import { Typography, Table, Button, Space, Tag, message, Popconfirm, Card, List } from "antd";
import { useEffect, useState } from "react";
import { Order } from "@/lib/db/types";
import RoleGuard from "@/components/shared/RoleGuard";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title, Text } = Typography;

export default function FarmerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => { setOrders(d.data || []); setLoading(false); });
  }, []);

  const handleAction = async (orderId: string, action: "accept" | "reject", reason?: string) => {
    setActionLoading(orderId);
    const res = await fetch(`/api/orders/${orderId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    setActionLoading(null);
    if (data.success) {
      message.success(`Order ${action}ed`);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: action === "accept" ? "accepted" : "rejected" } : o
        )
      );
    } else {
      message.error(data.error);
    }
  };

  const columns = [
    {
      title: "Product",
      key: "product",
      render: (_: any, r: Order) => <Text strong style={{ fontSize: 13 }}>{r.listing?.title || "N/A"}</Text>,
    },
    {
      title: "Buyer",
      key: "buyer",
      responsive: ["sm" as const],
      render: (_: any, r: Order) => r.buyer?.full_name || "N/A",
    },
    {
      title: "Qty",
      key: "qty",
      responsive: ["sm" as const],
      render: (_: any, r: Order) => `${r.quantity} ${r.listing?.unit || ""}`,
    },
    {
      title: "Total",
      key: "total",
      render: (_: any, r: Order) => (
        <Text strong style={{ color: "#1a7a1a" }}>
          KES {r.total_amount_kes?.toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s: any) => <OrderStatusBadge status={s} />,
    },
    {
      title: "Payment",
      key: "payment",
      responsive: ["md" as const],
      render: (_: any, r: Order) => {
        if (r.payment?.mpesa_receipt_number) {
          return <Tag color="green">Paid: {r.payment.mpesa_receipt_number}</Tag>;
        }
        return <Text type="secondary">—</Text>;
      },
    },
    {
      title: "",
      key: "actions",
      render: (_: any, r: Order) => (
        <Space size="small">
          {r.status === "pending" && (
            <>
              <Button
                size="small"
                type="primary"
                loading={actionLoading === r.id}
                onClick={() => handleAction(r.id, "accept")}
              >
                Accept
              </Button>
              <Popconfirm
                title="Reject this order?"
                onConfirm={() => handleAction(r.id, "reject", "Rejected by farmer")}
              >
                <Button size="small" danger loading={actionLoading === r.id}>
                  Reject
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <RoleGuard role="farmer">
      <div className="orders-page slide-up">
        <Title level={2} style={{ fontWeight: 700 }}>📦 Orders on My Listings</Title>

        {/* Mobile card list */}
        <div className="hide-desktop">
          {loading ? (
            <SkeletonList />
          ) : orders.length === 0 ? (
            <Card style={{ borderRadius: 14, textAlign: "center", padding: 24 }}>
              <Text type="secondary">No orders yet. When buyers place orders, they will appear here.</Text>
            </Card>
          ) : (
            <List
              dataSource={orders}
              renderItem={(order: Order) => (
                <Card className="order-mobile-card" key={order.id}>
                  <div className="order-mobile-header">
                    <Text strong>{order.listing?.title || "N/A"}</Text>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="order-mobile-meta">
                    <Text type="secondary">
                      {order.buyer?.full_name} · {order.quantity} {order.listing?.unit}
                    </Text>
                    <Text strong style={{ color: "#1a7a1a" }}>
                      KES {order.total_amount_kes?.toLocaleString()}
                    </Text>
                  </div>
                  {order.payment?.mpesa_receipt_number && (
                    <Tag color="green" style={{ marginTop: 4 }}>Paid: {order.payment.mpesa_receipt_number}</Tag>
                  )}
                  {order.status === "pending" && (
                    <Space style={{ marginTop: 8 }} size="small">
                      <Button
                        type="primary"
                        size="small"
                        loading={actionLoading === order.id}
                        onClick={() => handleAction(order.id, "accept")}
                      >
                        Accept
                      </Button>
                      <Popconfirm
                        title="Reject?"
                        onConfirm={() => handleAction(order.id, "reject", "Rejected")}
                      >
                        <Button size="small" danger loading={actionLoading === order.id}>
                          Reject
                        </Button>
                      </Popconfirm>
                    </Space>
                  )}
                </Card>
              )}
            />
          )}
        </div>

        {/* Desktop table */}
        <Card className="hide-mobile" style={{ borderRadius: 14 }}>
          <Table
            dataSource={orders}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, size: "small" }}
            size="middle"
          />
        </Card>
      </div>

      <style jsx>{`
        .orders-page { max-width: 960px; }
        .order-mobile-card {
          border-radius: 12px !important;
          margin-bottom: 10px;
        }
        .order-mobile-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }
        .order-mobile-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 4px;
        }
      `}</style>
    </RoleGuard>
  );
}

function SkeletonList() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <Card key={i} style={{ borderRadius: 12 }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <div style={{ height: 16, width: "60%", background: "#f0f0f0", borderRadius: 4 }} />
            <div style={{ height: 12, width: "40%", background: "#f0f0f0", borderRadius: 4 }} />
          </Space>
        </Card>
      ))}
    </div>
  );
}
