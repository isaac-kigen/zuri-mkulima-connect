"use client";

import { Typography, Card, List, Tag, Button, Modal, Space, Empty } from "antd";
import { WarningOutlined, PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Complaint } from "@/lib/db/types";
import RoleGuard from "@/components/shared/RoleGuard";
import ComplaintForm from "@/components/complaints/ComplaintForm";

const { Title, Text } = Typography;

const statusColors: Record<string, string> = { open: "red", in_progress: "blue", resolved: "green", closed: "default" };

export default function FarmerComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchComplaints = () => {
    setLoading(true);
    fetch("/api/complaints")
      .then((r) => r.json())
      .then((d) => { setComplaints(d.data || []); setLoading(false); });
  };

  useEffect(() => { fetchComplaints(); }, []);

  return (
    <RoleGuard role={["farmer", "buyer"]}>
      <div className="complaints-page slide-up">
        <div className="page-header">
          <Title level={2} style={{ fontWeight: 700, margin: 0 }}>
            <WarningOutlined /> My Complaints
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
            File Complaint
          </Button>
        </div>

        <Card className="content-card">
          {loading ? null : complaints.length === 0 ? (
            <Empty description="No complaints filed" />
          ) : (
            <List
              loading={loading}
              dataSource={complaints}
              renderItem={(c: Complaint) => (
                <div className="complaint-item">
                  <div className="complaint-header">
                    <Space size={4}>
                      <Text strong>{c.subject}</Text>
                      <Tag color={statusColors[c.status]}>{c.status}</Tag>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </Text>
                  </div>
                  <Text style={{ display: "block", margin: "4px 0", fontSize: 13 }}>{c.description}</Text>
                  {c.admin_response && (
                    <div className="response-bubble">
                      <strong>Admin Response:</strong> {c.admin_response}
                    </div>
                  )}
                </div>
              )}
            />
          )}
        </Card>

        <Modal title="File a Complaint" open={showForm} onCancel={() => setShowForm(false)} footer={null} centered>
          <ComplaintForm onSuccess={() => { setShowForm(false); fetchComplaints(); }} />
        </Modal>
      </div>

      <style jsx>{`
        .complaints-page { max-width: 680px; }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }
        .content-card { border-radius: 14px !important; }
        .complaint-item {
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .complaint-item:last-child { border-bottom: none; }
        .complaint-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 6px;
        }
        .response-bubble {
          background: #f6ffed;
          padding: 8px 12px;
          border-radius: 8px;
          margin-top: 6px;
          font-size: 13px;
        }
      `}</style>
    </RoleGuard>
  );
}
