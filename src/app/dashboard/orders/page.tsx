"use client";

import { Typography, Card } from "antd";

const { Title } = Typography;

export default function OrdersPage() {
  return (
    <Card>
      <Title level={4}>Orders</Title>
      <p>View and manage your orders here.</p>
    </Card>
  );
}
