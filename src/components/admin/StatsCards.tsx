"use client";

import { Row, Col, Card, Statistic } from "antd";
import {
  TeamOutlined, ShopOutlined, OrderedListOutlined, DollarOutlined,
  WarningOutlined, CheckCircleOutlined,
} from "@ant-design/icons";

export default function AdminStatsCards({ stats }: { stats: any }) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} sm={8} md={4}>
        <Card><Statistic title="Total Users" value={stats?.total_users || 0} prefix={<TeamOutlined />} /></Card>
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Card><Statistic title="Farmers" value={stats?.farmers || 0} prefix={<TeamOutlined />} /></Card>
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Card><Statistic title="Buyers" value={stats?.buyers || 0} prefix={<TeamOutlined />} /></Card>
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Card><Statistic title="Listings" value={stats?.total_listings || 0} prefix={<ShopOutlined />} /></Card>
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Card><Statistic title="Orders" value={stats?.total_orders || 0} prefix={<OrderedListOutlined />} /></Card>
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Card><Statistic title="Revenue (KES)" value={stats?.total_revenue || 0} prefix={<DollarOutlined />} /></Card>
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Card><Statistic title="Pending Orders" value={stats?.pending_orders || 0} prefix={<WarningOutlined />} /></Card>
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Card><Statistic title="Completed" value={stats?.completed_orders || 0} prefix={<CheckCircleOutlined />} /></Card>
      </Col>
      <Col xs={12} sm={8} md={4}>
        <Card><Statistic title="Open Complaints" value={stats?.open_complaints || 0} prefix={<WarningOutlined />} /></Card>
      </Col>
    </Row>
  );
}
