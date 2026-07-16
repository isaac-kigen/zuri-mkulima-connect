"use client";

import { Card, Col, Row, Statistic, Typography, Table, Tag, Space } from "antd";
import {
  ShopOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  RiseOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/lib/auth";
import type { UserType } from "@/types";

const { Title, Text } = Typography;

/* -------------------------------------------------------------------------- */
/*  Shared / Farmer Dashboard                                                 */
/* -------------------------------------------------------------------------- */

function FarmerDashboard() {
  return (
    <>
      <Title level={4} style={{ marginBottom: 24 }}>
        Farmer Dashboard
      </Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Listings"
              value={12}
              prefix={<ShopOutlined style={{ color: "#16a34a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Orders Today"
              value={8}
              prefix={<ShoppingCartOutlined style={{ color: "#16a34a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Revenue (MTD)"
              value={245_000}
              prefix={<DollarOutlined style={{ color: "#16a34a" }} />}
              suffix="TZS"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Rating"
              value={4.8}
              prefix={<RiseOutlined style={{ color: "#16a34a" }} />}
              suffix="/5"
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Orders" style={{ marginTop: 24 }}>
        <Table
          dataSource={[
            { key: "1", produce: "Tomatoes", buyer: "Jane", qty: "50 kg", total: "125,000 TZS", status: "pending" },
            { key: "2", produce: "Maize", buyer: "Bob", qty: "200 kg", total: "400,000 TZS", status: "delivered" },
            { key: "3", produce: "Mangoes", buyer: "Alice", qty: "30 kg", total: "60,000 TZS", status: "pending" },
          ]}
          columns={[
            { title: "Produce", dataIndex: "produce", key: "produce" },
            { title: "Buyer", dataIndex: "buyer", key: "buyer" },
            { title: "Qty", dataIndex: "qty", key: "qty" },
            { title: "Total", dataIndex: "total", key: "total" },
            {
              title: "Status",
              dataIndex: "status",
              key: "status",
              render: (s: string) => (
                <Tag
                  icon={s === "delivered" ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                  color={s === "delivered" ? "green" : "orange"}
                >
                  {s}
                </Tag>
              ),
            },
          ]}
          pagination={false}
          size="small"
        />
      </Card>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Buyer Dashboard                                                           */
/* -------------------------------------------------------------------------- */

function BuyerDashboard() {
  return (
    <>
      <Title level={4} style={{ marginBottom: 24 }}>
        Buyer Dashboard
      </Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Available Produce"
              value={147}
              prefix={<ShopOutlined style={{ color: "#16a34a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Orders Placed"
              value={23}
              prefix={<ShoppingCartOutlined style={{ color: "#16a34a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Spent (MTD)"
              value={1_200_000}
              prefix={<DollarOutlined style={{ color: "#16a34a" }} />}
              suffix="TZS"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Saved vs Market"
              value={18}
              prefix={<RiseOutlined style={{ color: "#16a34a" }} />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Card title="Market Highlights" style={{ marginTop: 24 }}>
        <Table
          dataSource={[
            { key: "1", produce: "Avocados", farmer: "Peter", price: "3,000/kg", stock: "200 kg" },
            { key: "2", produce: "Rice", farmer: "Grace", price: "2,500/kg", stock: "500 kg" },
            { key: "3", produce: "Bananas", farmer: "John", price: "1,500/kg", stock: "150 kg" },
            { key: "4", produce: "Onions", farmer: "Mary", price: "2,800/kg", stock: "80 kg" },
          ]}
          columns={[
            { title: "Produce", dataIndex: "produce", key: "produce" },
            { title: "Farmer", dataIndex: "farmer", key: "farmer" },
            { title: "Price", dataIndex: "price", key: "price" },
            { title: "Stock", dataIndex: "stock", key: "stock" },
          ]}
          pagination={false}
          size="small"
        />
      </Card>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Admin Dashboard                                                           */
/* -------------------------------------------------------------------------- */

function AdminDashboard() {
  return (
    <>
      <Title level={4} style={{ marginBottom: 24 }}>
        Admin Dashboard
      </Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Farmers"
              value={342}
              prefix={<TeamOutlined style={{ color: "#16a34a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Buyers"
              value={1_205}
              prefix={<TeamOutlined style={{ color: "#16a34a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Transactions Today"
              value={89}
              prefix={<ShoppingCartOutlined style={{ color: "#16a34a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Platform Revenue"
              value={5_600_000}
              prefix={<DollarOutlined style={{ color: "#16a34a" }} />}
              suffix="TZS"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Recent Signups">
            <Table
              dataSource={[
                { key: "1", name: "Peter M.", type: "farmer", date: "2 min ago" },
                { key: "2", name: "Jane K.", type: "buyer", date: "15 min ago" },
                { key: "3", name: "Bob L.", type: "farmer", date: "1 hr ago" },
                { key: "4", name: "Alice N.", type: "buyer", date: "2 hr ago" },
              ]}
              columns={[
                { title: "Name", dataIndex: "name", key: "name" },
                {
                  title: "Role",
                  dataIndex: "type",
                  key: "type",
                  render: (t: string) => (
                    <Tag color={t === "farmer" ? "green" : "blue"}>{t}</Tag>
                  ),
                },
                { title: "Joined", dataIndex: "date", key: "date" },
              ]}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Pending Verifications">
            <Table
              dataSource={[
                { key: "1", name: "New Farmer Co-op", type: "farmer", submitted: "Today" },
                { key: "2", name: "City Grocers Ltd", type: "buyer", submitted: "Yesterday" },
              ]}
              columns={[
                { title: "Name", dataIndex: "name", key: "name" },
                {
                  title: "Role",
                  dataIndex: "type",
                  key: "type",
                  render: (t: string) => (
                    <Tag color={t === "farmer" ? "green" : "blue"}>{t}</Tag>
                  ),
                },
                { title: "Submitted", dataIndex: "submitted", key: "submitted" },
              ]}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Router                                                                    */
/* -------------------------------------------------------------------------- */

const dashboards: Record<UserType, () => React.ReactNode> = {
  farmer: FarmerDashboard,
  buyer: BuyerDashboard,
  admin: AdminDashboard,
};

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const Dashboard = dashboards[user.type];

  return <Dashboard />;
}
