"use client";

import { Typography, Card } from "antd";

const { Title } = Typography;

export default function TransactionsPage() {
  return (
    <Card>
      <Title level={4}>Transactions</Title>
      <p>View all platform transactions here.</p>
    </Card>
  );
}
