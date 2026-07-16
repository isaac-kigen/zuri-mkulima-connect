"use client";

import { Table, Tag, Button, Space, Popconfirm, message } from "antd";
import { Profile } from "@/lib/db/types";
import { useState } from "react";
import { getCsrfToken } from "@/lib/utils/csrf";

export default function UserTable({ users, onRefresh }: { users: Profile[]; onRefresh: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSuspend = async (userId: string) => {
    setLoading(userId);
    const res = await fetch(`/api/admin/users/${userId}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify({ reason: "Suspended by admin" }),
    });
    const data = await res.json();
    setLoading(null);
    if (data.success) { message.success("User suspended"); onRefresh(); }
    else message.error(data.error);
  };

  const handleReactivate = async (userId: string) => {
    setLoading(userId);
    const res = await fetch(`/api/admin/users/${userId}/reactivate`, {
      method: "POST",
      headers: { "x-csrf-token": getCsrfToken() },
    });
    const data = await res.json();
    setLoading(null);
    if (data.success) { message.success("User reactivated"); onRefresh(); }
    else message.error(data.error);
  };

  const columns = [
    { title: "Name", dataIndex: "full_name", key: "name" },
    { title: "Role", dataIndex: "role", key: "role", render: (r: string) => <Tag color={r === "admin" ? "red" : r === "farmer" ? "green" : "blue"}>{r}</Tag> },
    { title: "Phone", dataIndex: "phone", key: "phone" },
    { title: "County", dataIndex: "county", key: "county" },
    {
      title: "Status", dataIndex: "is_suspended", key: "status",
      render: (s: boolean) => s ? <Tag color="red">Suspended</Tag> : <Tag color="green">Active</Tag>,
    },
    { title: "Joined", dataIndex: "created_at", key: "joined", render: (d: string) => new Date(d).toLocaleDateString() },
    {
      title: "Actions", key: "actions",
      render: (_: any, record: Profile) => (
        <Space>
          {record.role !== "admin" && (
            record.is_suspended ? (
              <Button size="small" type="primary" loading={loading === record.id} onClick={() => handleReactivate(record.id)}>
                Reactivate
              </Button>
            ) : (
              <Popconfirm title="Suspend this user?" onConfirm={() => handleSuspend(record.id)}>
                <Button size="small" danger loading={loading === record.id}>Suspend</Button>
              </Popconfirm>
            )
          )}
        </Space>
      ),
    },
  ];

  return <Table dataSource={users} columns={columns} rowKey="id" />;
}
