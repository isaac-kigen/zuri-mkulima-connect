"use client";

import { Typography, Card, List, Tag, Button, Modal, Input, Space, message, Empty } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Complaint } from "@/lib/db/types";
import RoleGuard from "@/components/shared/RoleGuard";
import Loading from "@/components/shared/Loading";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title, Text } = Typography;

const statusColors: Record<string, string> = { open: "red", in_progress: "blue", resolved: "green", closed: "default" };

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondModal, setRespondModal] = useState<{ open: boolean; complaint: Complaint | null }>({ open: false, complaint: null });
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComplaints = () => {
    setLoading(true);
    fetch("/api/complaints")
      .then((r) => r.json())
      .then((d) => { setComplaints(d.data || []); setLoading(false); });
  };

  useEffect(() => { fetchComplaints(); }, []);

  const handleRespond = async () => {
    if (!respondModal.complaint) return;
    setSubmitting(true);
    const res = await fetch(`/api/complaints/${respondModal.complaint.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify({ admin_response: response, status: "in_progress" }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.success) { message.success("Response sent"); setRespondModal({ open: false, complaint: null }); fetchComplaints(); }
    else message.error(data.error);
  };

  const handleResolve = async (id: string) => {
    const res = await fetch(`/api/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify({ status: "resolved" }),
    });
    const data = await res.json();
    if (data.success) { message.success("Complaint resolved"); fetchComplaints(); }
    else message.error(data.error);
  };

  return (
    <RoleGuard role="admin">
      <div className="admin-page slide-up">
        <Title level={2} style={{ fontWeight: 700 }}>
          <WarningOutlined /> Manage Complaints
        </Title>
        <Card className="content-card">
          {loading ? <Loading /> : complaints.length === 0 ? (
            <Empty description="No complaints" />
          ) : (
            <List
              dataSource={complaints}
              renderItem={(c: Complaint) => (
                <div className="complaint-item">
                  <div className="complaint-header">
                    <Space size={4} wrap>
                      <Tag color={statusColors[c.status]}>{c.status?.replace("_", " ")}</Tag>
                      <Text strong>{c.subject}</Text>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      by {c.filed_by_user?.full_name || "Unknown"} ({c.filed_by_user?.role})
                    </Text>
                  </div>
                  <Text style={{ display: "block", margin: "6px 0" }}>{c.description}</Text>
                  {c.admin_response && (
                    <div className="response-bubble">
                      <strong>Response:</strong> {c.admin_response}
                    </div>
                  )}
                  <div className="complaint-footer">
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(c.created_at).toLocaleString()}
                    </Text>
                    {c.status !== "closed" && c.status !== "resolved" && (
                      <Space size="small">
                        <Button size="small" onClick={() => { setRespondModal({ open: true, complaint: c }); setResponse(c.admin_response || ""); }}>
                          Respond
                        </Button>
                        <Button size="small" type="primary" onClick={() => handleResolve(c.id)}>Resolve</Button>
                      </Space>
                    )}
                  </div>
                </div>
              )}
            />
          )}
        </Card>

        <Modal
          title="Respond to Complaint"
          open={respondModal.open}
          onCancel={() => setRespondModal({ open: false, complaint: null })}
          onOk={handleRespond}
          confirmLoading={submitting}
          centered
        >
          <Input.TextArea rows={4} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Write admin response..." />
        </Modal>
      </div>

      <style jsx>{`
        .admin-page { max-width: 800px; }
        .content-card { border-radius: 14px !important; }
        .complaint-item {
          padding: 14px;
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
          margin: 6px 0;
          font-size: 13px;
        }
        .complaint-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
        }
      `}</style>
    </RoleGuard>
  );
}
