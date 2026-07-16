"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, List, Modal, Space, Spin, Tag, Typography, message } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from "@ant-design/icons";
import RoleGuard from "@/components/shared/RoleGuard";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title, Paragraph, Text } = Typography;

export default function AdminVettingPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vetting?status=pending");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Unable to load vetting forms");
      setItems(data.data || []);
    } catch (err: any) {
      message.error(err.message || "Unable to load vetting forms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const handleDecision = async (status: "approved" | "rejected") => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/vetting", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
        body: JSON.stringify({ form_id: selected.id, status, admin_notes: selected.admin_notes || "" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Unable to update vetting form");
      message.success(`Vetting ${status} successfully`);
      setSelected(null);
      await loadItems();
    } catch (err: any) {
      message.error(err.message || "Unable to update vetting form");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <RoleGuard role="admin">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Title level={2}>Farmer Vetting Review</Title>
        <Paragraph type="secondary">Review pending farmer applications and approve or reject them.</Paragraph>
        <Alert type="info" showIcon message="Only pending submissions appear here." style={{ marginBottom: 16 }} />

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spin size="large" /></div>
        ) : items.length === 0 ? (
          <Card>No pending vetting applications.</Card>
        ) : (
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button key="view" icon={<EyeOutlined />} onClick={() => setSelected(item)}>Review</Button>,
                ]}
              >
                <List.Item.Meta
                  title={<><Text strong>{item.farm_name}</Text> <Tag color="gold">Pending</Tag></>}
                  description={
                    <>
                      <Text>{item.farmer?.full_name || "Farmer"}</Text><br />
                      <Text type="secondary">{item.farm_location_county} • {item.products_grown}</Text>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}

        <Modal
          open={!!selected}
          onCancel={() => setSelected(null)}
          title={`Review ${selected?.farm_name || "application"}`}
          footer={null}
          width={760}
        >
          {selected ? (
            <div>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Card size="small" title="Farmer details">
                  <Paragraph><Text strong>Farmer:</Text> {selected.farmer?.full_name}</Paragraph>
                  <Paragraph><Text strong>Phone:</Text> {selected.phone_number}</Paragraph>
                  <Paragraph><Text strong>County:</Text> {selected.farm_location_county}</Paragraph>
                  <Paragraph><Text strong>Ward:</Text> {selected.farm_location_ward || "—"}</Paragraph>
                  <Paragraph><Text strong>Products:</Text> {selected.products_grown}</Paragraph>
                  <Paragraph><Text strong>Years farming:</Text> {selected.years_farming || "—"}</Paragraph>
                  <Paragraph><Text strong>Farm size:</Text> {selected.farm_size_acres ? `${selected.farm_size_acres} acres` : "—"}</Paragraph>
                  {selected.supporting_document_url ? <Paragraph><Text strong>Document:</Text> <a href={selected.supporting_document_url} target="_blank" rel="noreferrer">Open</a></Paragraph> : null}
                </Card>
                <Card size="small" title="Decision">
                  <textarea
                    style={{ width: "100%", minHeight: 96, padding: 8, borderRadius: 8, border: "1px solid #d9d9d9" }}
                    placeholder="Optional notes for the farmer"
                    value={selected.admin_notes || ""}
                    onChange={(e) => setSelected({ ...selected, admin_notes: e.target.value })}
                  />
                  <Space style={{ marginTop: 12 }}>
                    <Button type="primary" icon={<CheckCircleOutlined />} loading={actionLoading} onClick={() => handleDecision("approved")}>Approve</Button>
                    <Button danger icon={<CloseCircleOutlined />} loading={actionLoading} onClick={() => handleDecision("rejected")}>Reject</Button>
                  </Space>
                </Card>
              </Space>
            </div>
          ) : null}
        </Modal>
      </div>
    </RoleGuard>
  );
}
