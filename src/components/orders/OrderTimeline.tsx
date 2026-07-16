"use client";

import { Steps } from "antd";
import { OrderStatus } from "@/lib/db/types";

const steps: { title: string; statuses: OrderStatus[] }[] = [
  { title: "Order Placed", statuses: ["pending", "accepted", "completed"] },
  { title: "Order Accepted", statuses: ["accepted", "completed"] },
  { title: "Payment Made", statuses: ["completed"] },
  { title: "Completed", statuses: ["completed"] },
];

export default function OrderTimeline({ status }: { status: OrderStatus }) {
  const currentStep = steps.findIndex((s) => s.statuses.includes(status));

  return (
    <Steps
      current={status === "cancelled" || status === "rejected" ? -1 : currentStep}
      status={
        status === "cancelled" ? "error" :
        status === "rejected" ? "error" :
        status === "completed" ? "finish" :
        "process"
      }
      items={steps.map((s) => ({ title: s.title }))}
      size="small"
    />
  );
}
