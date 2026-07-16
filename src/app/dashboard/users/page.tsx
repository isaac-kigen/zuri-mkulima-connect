"use client";

import { Typography, Card } from "antd";

const { Title } = Typography;

export default function UsersPage() {
  return (
    <Card>
      <Title level={4}>User Management</Title>
      <p>Manage platform users here.</p>
    </Card>
  );
}
