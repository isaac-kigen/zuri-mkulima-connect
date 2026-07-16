"use client";

import { Table, Tag } from "antd";
import { AuditLogEntry } from "@/lib/db/types";

export default function AuditLogTable({ logs }: { logs: AuditLogEntry[] }) {
  const columns = [
    {
      title: "Time", dataIndex: "created_at", key: "time",
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: "Actor", dataIndex: ["actor", "full_name"], key: "actor",
      render: (_: any, record: AuditLogEntry) => record.actor?.full_name || "System",
    },
    {
      title: "Role", dataIndex: ["actor", "role"], key: "actor_role",
      render: (_: any, record: AuditLogEntry) => record.actor ? <Tag>{record.actor.role}</Tag> : "-",
    },
    { title: "Action", dataIndex: "action", key: "action" },
    { title: "Entity", dataIndex: "entity_type", key: "entity" },
    {
      title: "Entity ID", dataIndex: "entity_id", key: "entity_id",
      render: (id: string) => id ? id.slice(0, 8) + "..." : "-",
    },
    {
      title: "IP", dataIndex: "ip_address", key: "ip",
      render: (ip: string) => ip || "-",
    },
  ];

  return <Table dataSource={logs} columns={columns} rowKey="id" />;
}
