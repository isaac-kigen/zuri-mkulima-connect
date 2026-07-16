"use client";

import { Typography, Card } from "antd";

const { Title } = Typography;

export default function MarketPage() {
  return (
    <Card>
      <Title level={4}>Marketplace</Title>
      <p>Browse available produce from farmers.</p>
    </Card>
  );
}
