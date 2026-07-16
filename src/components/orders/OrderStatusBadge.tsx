"use client";

import { Tag } from "antd";
import { OrderStatus } from "@/lib/db/types";

const statusConfig: Record<OrderStatus, { color: string; label: string }> = {
  pending: { color: "gold", label: "Pending" },
  accepted: { color: "blue", label: "Accepted" },
  rejected: { color: "red", label: "Rejected" },
  cancelled: { color: "default", label: "Cancelled" },
  paid: { color: "purple", label: "Paid (Escrow)" },
  completed: { color: "green", label: "Completed" },
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status] || { color: "default", label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
}
