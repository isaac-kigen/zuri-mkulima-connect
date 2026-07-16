"use client";

import { Typography, Card } from "antd";
import { AuditOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { AuditLogEntry } from "@/lib/db/types";
import RoleGuard from "@/components/shared/RoleGuard";
import AuditLogTable from "@/components/admin/AuditLogTable";
import Loading from "@/components/shared/Loading";

const { Title } = Typography;

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit-log")
      .then((r) => r.json())
      .then((d) => { setLogs(d.data || []); setLoading(false); });
  }, []);

  return (
    <RoleGuard role="admin">
      <div className="admin-page slide-up">
        <Title level={2} style={{ fontWeight: 700 }}><AuditOutlined /> Audit Log</Title>
        <Card className="content-card">
          {loading ? <Loading /> : <AuditLogTable logs={logs} />}
        </Card>
      </div>
      <style jsx>{`
        .admin-page { max-width: 1100px; }
        .content-card { border-radius: 14px !important; }
      `}</style>
    </RoleGuard>
  );
}
