"use client";

import { Statistic, Row, Col, Card } from "antd";
import { StarFilled, ShoppingCartOutlined, DollarOutlined } from "@ant-design/icons";
import { FarmerStats } from "@/lib/db/types";

export default function FarmerStatsCard({ stats, loading }: { stats: FarmerStats | null; loading: boolean }) {
  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic
            title="Average Rating"
            value={stats?.avg_rating || 0}
            precision={1}
            prefix={<StarFilled style={{ color: "#faad14" }} />}
            loading={loading}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Total Ratings"
            value={stats?.total_ratings || 0}
            loading={loading}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Completed Orders"
            value={stats?.total_orders || 0}
            prefix={<ShoppingCartOutlined />}
            loading={loading}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Total Revenue"
            value={stats?.total_revenue || 0}
            prefix={<DollarOutlined />}
            suffix="KES"
            loading={loading}
          />
        </Card>
      </Col>
    </Row>
  );
}
