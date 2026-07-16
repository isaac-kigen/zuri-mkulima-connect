"use client";

import { Typography, Card } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Profile } from "@/lib/db/types";
import RoleGuard from "@/components/shared/RoleGuard";
import UserTable from "@/components/admin/UserTable";
import Loading from "@/components/shared/Loading";

const { Title } = Typography;

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => { setUsers(d.data || []); setLoading(false); });
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <RoleGuard role="admin">
      <div className="admin-page slide-up">
        <Title level={2} style={{ fontWeight: 700 }}>
          <TeamOutlined /> Manage Users
        </Title>
        <Card className="content-card">
          {loading ? <Loading /> : <UserTable users={users} onRefresh={fetchUsers} />}
        </Card>
      </div>
      <style jsx>{`
        .admin-page { max-width: 1100px; }
        .content-card { border-radius: 14px !important; }
      `}</style>
    </RoleGuard>
  );
}
