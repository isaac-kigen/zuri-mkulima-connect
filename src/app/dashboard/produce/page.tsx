"use client";

import { Typography, Card } from "antd";

const { Title } = Typography;

export default function ProducePage() {
  return (
    <Card>
      <Title level={4}>My Produce</Title>
      <p>Manage your produce listings here.</p>
    </Card>
  );
}
