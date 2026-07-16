"use client";

import { Typography, Table, Button, Space, Tag, message, Input, Modal, Popconfirm, Card, List, Spin } from "antd";
import { useEffect, useState, useRef, useCallback } from "react";
import { Order } from "@/lib/db/types";
import RoleGuard from "@/components/shared/RoleGuard";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import OrderTimeline from "@/components/orders/OrderTimeline";
import { useRouter } from "next/navigation";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title, Text } = Typography;

export default function BuyerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState<{ open: boolean; order: Order | null }>({ open: false, order: null });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentState, setPaymentState] = useState<"idle" | "pending" | "awaiting" | "success" | "failed">("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentAttempts, setPaymentAttempts] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const pollingRef = useRef<number | null>(null);
  const router = useRouter();

  const handleCancel = async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify({ reason: "Cancelled by buyer" }),
    });
    const data = await res.json();
    if (data.success) {
      message.success("Order cancelled");
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)));
    } else {
      message.error(data.error);
    }
  };

  const loadOrders = useCallback(async () => {
    const r = await fetch("/api/orders");
    const d = await r.json();
    setOrders(d.data || []);
    const activeOrder = payModal.order ? d.data?.find((o: Order) => o.id === payModal.order?.id) : null;
    if (activeOrder) {
      const failedCount = activeOrder.payment_failed_count || 0;
      setPaymentAttempts(failedCount);
      setRemainingAttempts(Math.max(0, 3 - failedCount));
    }
  }, [payModal.order]);

  useEffect(() => {
    loadOrders().finally(() => setLoading(false));
  }, [loadOrders]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = (id: string) => {
    stopPolling();
    setPaymentId(id);
    setPaymentState("pending");
    setPaymentMessage("Waiting for the M-Pesa prompt on your phone...");
    pollingRef.current = window.setInterval(async () => {
      try {
        const res = await fetch("/api/payments/query", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
          body: JSON.stringify({ payment_id: id }),
        });
        const data = await res.json();
        if (data.success && (data.data?.status === "completed" || data.data?.status === "paid")) {
          stopPolling();
          setPaymentState("success");
          setPaymentMessage(`Payment confirmed! Receipt: ${data.data.mpesa_receipt_number || "N/A"}`);
          await loadOrders();
          return;
        }
        if (data.success && data.data?.status === "failed") {
          stopPolling();
          setPaymentState("failed");
          setPaymentMessage(data.data.message || "Payment was not completed.");
          await loadOrders();
          return;
        }
        setPaymentState("awaiting");
        setPaymentMessage(data.data?.message || "Please confirm the prompt on your phone.");
      } catch {
        setPaymentState("awaiting");
        setPaymentMessage("Still waiting for confirmation from M-Pesa...");
      }
    }, 2000);
  };

  const handlePay = async () => {
    if (!payModal.order) return;
    setPaying(true);
    setPaymentState("pending");
    setPaymentMessage("Initiating M-Pesa payment...");
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
        body: JSON.stringify({ order_id: payModal.order.id, phone_number: phoneNumber }),
      });
      const data = await res.json();
      if (data.success && data.data?.payment?.id) {
        setPaymentId(data.data.payment.id);
        startPolling(data.data.payment.id);
        setPaymentState("awaiting");
        setPaymentMessage("Check your phone and enter your PIN to complete the payment.");
      } else {
        setPaymentState("failed");
        setPaymentMessage(data.error || "Payment failed");
      }
    } catch {
      setPaymentState("failed");
      setPaymentMessage("Payment initiation failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  const handleRetry = async () => {
    if (!payModal.order) return;
    setPaymentState("pending");
    setPaymentMessage("Retrying M-Pesa payment...");
    await handlePay();
  };

  const handleCheckPayment = async (paymentId: string) => {
    message.loading({ content: "Checking payment status...", key: "check-pay" });
    try {
      const res = await fetch("/api/payments/query", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
        body: JSON.stringify({ payment_id: paymentId }),
      });
      const data = await res.json();
      if (data.success && (data.data?.status === "completed" || data.data?.status === "paid")) {
        message.success({ content: "✅ Payment confirmed!", key: "check-pay" });
      } else if (data.success && data.data?.status === "failed") {
        message.warning({ content: "❌ " + (data.data?.message || "Payment failed"), key: "check-pay" });
      } else {
        message.info({ content: "⏳ Payment still pending. Try again or check your phone.", key: "check-pay" });
      }
      // Reload orders
      const r = await fetch("/api/orders");
      const d = await r.json();
      setOrders(d.data || []);
    } catch {
      message.error({ content: "Could not check payment status.", key: "check-pay" });
    }
  };

  const columns = [
    {
      title: "Order",
      dataIndex: "id",
      key: "id",
      responsive: ["md" as const],
      render: (id: string) => <Text code>{id.slice(0, 8)}...</Text>,
    },
    {
      title: "Product",
      key: "product",
      render: (_: any, r: Order) => (
        <Text strong style={{ fontSize: 13 }}>{r.listing?.title || "N/A"}</Text>
      ),
    },
    {
      title: "Farmer",
      key: "farmer",
      responsive: ["sm" as const],
      render: (_: any, r: Order) => r.farmer?.full_name || "N/A",
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
        if (r.payment?.status === "completed") return <Tag color="green">Paid</Tag>;
        if (r.payment?.status === "pending") return (
          <Space size={4}>
            <Tag color="gold">Pending</Tag>
            <Button size="small" type="link" onClick={() => handleCheckPayment(r.payment!.id)}>
              Check
            </Button>
          </Space>
        );
        if (r.payment?.status === "failed") return <Tag color="red">Failed</Tag>;
        if (r.status === "accepted") return <Tag color="blue">Pay Now</Tag>;
        return <Text type="secondary">—</Text>;
      },
    },
    {
      title: "",
      key: "actions",
      render: (_: any, r: Order) => (
        <Space size="small">
          {r.status === "accepted" && !r.payment?.status && (
            <Button type="primary" size="small" onClick={() => setPayModal({ open: true, order: r })}>
              Pay
            </Button>
          )}
          {["pending", "accepted"].includes(r.status) && (
            <Popconfirm title="Cancel order?" onConfirm={() => handleCancel(r.id)}>
              <Button size="small" danger>Cancel</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <RoleGuard role="buyer">
      <div className="orders-page slide-up">
        <Title level={2} style={{ fontWeight: 700 }}>📋 My Orders</Title>

        {/* Mobile: Card list */}
        <div className="hide-desktop">
          {loading ? (
            <Card><SkeletonList /></Card>
          ) : orders.length === 0 ? (
            <Card>
              <div style={{ textAlign: "center", padding: 24 }}>
                <Text type="secondary">No orders yet. Start shopping!</Text>
                <br />
                <Button type="primary" onClick={() => router.push("/buyer/marketplace")} style={{ marginTop: 12 }}>
                  Browse Marketplace
                </Button>
              </div>
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
                      {order.quantity} {order.listing?.unit || ""} · KES {order.total_amount_kes?.toLocaleString()}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {order.farmer?.full_name}
                    </Text>
                  </div>
                  {order.payment?.status === "completed" && (
                    <Tag color="green" style={{ marginTop: 4 }}>Paid: {order.payment.mpesa_receipt_number}</Tag>
                  )}
                  {order.payment?.status === "pending" && (
                    <div style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center" }}>
                      <Tag color="gold">Pending</Tag>
                      <Button size="small" type="link" onClick={() => handleCheckPayment(order.payment!.id)}>
                        Check Status
                      </Button>
                    </div>
                  )}
                  {order.payment?.status === "failed" && (
                    <Tag color="red" style={{ marginTop: 4 }}>Failed — Try paying again</Tag>
                  )}
                  {order.status === "accepted" && !order.payment?.status && (
                    <Button type="primary" size="small" block style={{ marginTop: 8 }}
                      onClick={() => setPayModal({ open: true, order })}>
                      Pay with M-Pesa
                    </Button>
                  )}
                  {["pending", "accepted"].includes(order.status) && (
                    <Popconfirm title="Cancel?" onConfirm={() => handleCancel(order.id)}>
                      <Button size="small" danger block style={{ marginTop: 4 }}>Cancel</Button>
                    </Popconfirm>
                  )}
                </Card>
              )}
            />
          )}
        </div>

        {/* Desktop: Table */}
        <Card className="hide-mobile">
          <Table
            dataSource={orders}
            columns={columns}
            rowKey="id"
            loading={loading}
            expandable={{
              expandedRowRender: (r) => <OrderTimeline status={r.status} />,
            }}
            pagination={{ pageSize: 10, size: "small" }}
            size="middle"
          />
        </Card>

        {/* Payment Modal */}
        <Modal
          title="📱 M-Pesa Payment"
          open={payModal.open}
          onCancel={() => {
            stopPolling();
            setPayModal({ open: false, order: null });
            setPaymentState("idle");
            setPaymentMessage("");
            setPaymentId(null);
            setPhoneNumber("");
          }}
          footer={null}
          centered
          width={460}
        >
          {payModal.order && (
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <div>
                <Text type="secondary">Amount</Text>
                <br />
                <Text strong style={{ fontSize: 20, color: "#1a7a1a" }}>
                  KES {payModal.order.total_amount_kes?.toLocaleString()}
                </Text>
              </div>
              <div>
                <Text type="secondary">Product</Text>
                <br />
                <Text>{payModal.order.listing?.title}</Text>
              </div>

              {paymentState === "idle" && (
                <>
                  <Input
                    placeholder="M-Pesa phone number (07xx xxx xxx)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    size="large"
                    prefix="📱"
                  />
                  <Button type="primary" block loading={paying} onClick={handlePay}>
                    Pay Now
                  </Button>
                </>
              )}

              {(paymentState === "pending" || paymentState === "awaiting") && (
                <Card size="small" style={{ width: "100%", background: "#fafafa" }}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Spin size="small" />
                      <Text strong>{paymentState === "pending" ? "Initiating payment..." : "Waiting for your M-Pesa confirmation"}</Text>
                    </div>
                    <Text type="secondary">{paymentMessage}</Text>
                  </Space>
                </Card>
              )}

              {paymentState === "success" && (
                <Card size="small" style={{ width: "100%", background: "#f6ffed", borderColor: "#b7eb8f" }}>
                  <Space direction="vertical">
                    <Text strong style={{ color: "#237804" }}>✅ Payment completed</Text>
                    <Text type="secondary">{paymentMessage}</Text>
                    <Button type="primary" onClick={() => setPayModal({ open: false, order: null })}>Close</Button>
                  </Space>
                </Card>
              )}

              {paymentState === "failed" && (
                <Card size="small" style={{ width: "100%", background: "#fff2f0", borderColor: "#ffccc7" }}>
                  <Space direction="vertical">
                    <Text strong style={{ color: "#cf1322" }}>Payment not completed</Text>
                    <Text type="secondary">{paymentMessage}</Text>
                    <Text type="secondary">{remainingAttempts > 0 ? `${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining before this order is cancelled.` : "This order has reached the maximum failed-payment limit and will be cancelled."}</Text>
                    <Button type="primary" danger onClick={handleRetry}>Retry Payment</Button>
                  </Space>
                </Card>
              )}
            </Space>
          )}
        </Modal>
      </div>

      <style jsx>{`
        .orders-page {
          max-width: 1000px;
          animation: slideUp 300ms ease forwards;
        }

        .order-mobile-card {
          border-radius: var(--radius-lg) !important;
          margin-bottom: 12px !important;
          border: 1px solid var(--color-border) !important;
          background: var(--color-surface) !important;
          transition: all var(--transition) !important;
        }

        .order-mobile-card:hover {
          box-shadow: var(--shadow-sm) !important;
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
          gap: 4px;
          margin-top: 8px;
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
