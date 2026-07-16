"use client";

import { Typography, Card, Table, Tag, Space, Button, Popconfirm, message, Select } from "antd";
import { useEffect, useState } from "react";
import { Listing } from "@/lib/db/types";
import RoleGuard from "@/components/shared/RoleGuard";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title } = Typography;

export default function AdminListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = () => {
    setLoading(true);
    fetch("/api/marketplace?limit=100&status=active&role=admin")
      .then((r) => r.json())
      .then((d) => { setListings(d.data || []); setLoading(false); });
  };

  useEffect(() => { fetchListings(); }, []);

  const handleArchive = async (id: string, reason: string) => {
    const res = await fetch(`/api/marketplace/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (data.success) { message.success("Listing archived"); fetchListings(); }
    else message.error(data.error);
  };

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/marketplace/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) { message.success("Status updated"); fetchListings(); }
    else message.error(data.error);
  };

  const columns = [
    { title: "Title", dataIndex: "title", key: "title", ellipsis: true },
    { title: "Farmer", key: "farmer", render: (_: any, r: any) => r.farmer?.full_name || r.farmer_id, responsive: ["sm" as const] },
    { title: "Price", dataIndex: "price_kes", key: "price", render: (v: number) => <strong>KES {v?.toLocaleString()}</strong> },
    { title: "Category", dataIndex: "category", key: "category", responsive: ["md" as const] },
    { title: "County", dataIndex: "location_county", key: "county", responsive: ["md" as const] },
    {
      title: "Status", dataIndex: "status", key: "status",
      render: (s: string) => <Tag color={s === "active" ? "green" : s === "inactive" ? "orange" : "red"}>{s}</Tag>,
    },
    {
      title: "", key: "actions",
      render: (_: any, r: Listing) => (
        <Space size="small">
          <Select
            size="small"
            value={r.status}
            onChange={(v) => handleStatusChange(r.id, v)}
            style={{ width: 100 }}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <Popconfirm title="Archive?" onConfirm={() => handleArchive(r.id, "Admin action")}>
            <Button size="small" danger>Archive</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <RoleGuard role="admin">
      <div className="admin-page slide-up">
        <Title level={2} style={{ fontWeight: 700 }}>📦 Manage Listings</Title>
        <Card className="content-card">
          <Table dataSource={listings} columns={columns} rowKey="id" loading={loading}
            pagination={{ pageSize: 15, size: "small" }} size="small" scroll={{ x: 700 }} />
        </Card>
      </div>
      <style jsx>{`
        .admin-page { max-width: 1100px; }
        .content-card { border-radius: 14px !important; }
      `}</style>
    </RoleGuard>
  );
}
