"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Alert, Button, Card, Descriptions, Form, Input, InputNumber, message, Spin, Tag, Typography } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title, Paragraph, Text } = Typography;

export default function VettingAccessPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [form] = Form.useForm();

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vetting");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Unable to load vetting status");
      const vetting = data.data || {};
      setStatus(vetting.vetting_status || null);
      setNotes(vetting.vetting_notes || null);
      setSubmittedAt(vetting.vetting_submitted_at || null);
      setReviewedAt(vetting.vetting_reviewed_at || null);
      form.setFieldsValue({
        farm_name: vetting.vetting_form?.farm_name || "",
        farm_location_county: vetting.vetting_form?.farm_location_county || profile?.county || "",
        farm_location_ward: vetting.vetting_form?.farm_location_ward || "",
        farm_size_acres: vetting.vetting_form?.farm_size_acres || undefined,
        products_grown: vetting.vetting_form?.products_grown || "",
        years_farming: vetting.vetting_form?.years_farming || undefined,
        phone_number: vetting.vetting_form?.phone_number || profile?.phone || "",
        id_number: vetting.vetting_form?.id_number || "",
        supporting_document_url: vetting.vetting_form?.supporting_document_url || "",
      });
    } catch (err: any) {
      message.error(err.message || "Unable to load vetting status");
    } finally {
      setLoading(false);
    }
  }, [form, profile?.county, profile?.phone]);

  useEffect(() => {
    loadStatus();
  }, [profile?.id, loadStatus]);

  const statusConfig = useMemo(() => {
    if (status === "approved") {
      return {
        color: "green",
        title: "Vetting approved",
        description: "Your account is now active for farming activities. You can continue to the dashboard.",
        icon: <CheckCircleOutlined />,
      };
    }
    if (status === "pending") {
      return {
        color: "gold",
        title: "Vetting under review",
        description: "Your application is being reviewed by our team. You will be notified once a decision is made.",
        icon: <ClockCircleOutlined />,
      };
    }
    if (status === "rejected") {
      return {
        color: "red",
        title: "Vetting rejected",
        description: "Your previous application was not approved. You can resubmit with updated information.",
        icon: <CloseCircleOutlined />,
      };
    }
    return {
      color: "blue",
      title: "Vetting required",
      description: "You need to complete your vetting application before you can use the farmer dashboard.",
      icon: <WarningOutlined />,
    };
  }, [status]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/vetting", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Unable to submit vetting form");
      message.success("Vetting form submitted successfully.");
      await loadStatus();
    } catch (err: any) {
      message.error(err.message || "Unable to submit vetting form");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" tip="Loading your vetting status…" />
      </div>
    );
  }

  return (
    <div className="vetting-access-page">
      <Card className="page-card">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <Title level={2} style={{ marginBottom: 6 }}>Farmer Vetting</Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Your farmer account must be approved before you can access the dashboard and create listings.
            </Paragraph>
          </div>
          <Tag color={statusConfig.color} style={{ fontSize: 14, padding: "4px 10px" }}>
            {statusConfig.title}
          </Tag>
        </div>

        <Alert
          showIcon
          type={status === "rejected" ? "error" : status === "pending" ? "warning" : status === "approved" ? "success" : "info"}
          message={statusConfig.title}
          description={statusConfig.description}
          style={{ marginTop: 16, marginBottom: 24 }}
        />

        {submittedAt || reviewedAt ? (
          <Descriptions size="small" column={{ xs: 1, md: 2 }} style={{ marginBottom: 24 }}>
            {submittedAt ? <Descriptions.Item label="Submitted">{new Date(submittedAt).toLocaleString()}</Descriptions.Item> : null}
            {reviewedAt ? <Descriptions.Item label="Reviewed">{new Date(reviewedAt).toLocaleString()}</Descriptions.Item> : null}
            {notes ? <Descriptions.Item label="Notes">{notes}</Descriptions.Item> : null}
          </Descriptions>
        ) : null}

        {status === "approved" ? (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Button type="primary" size="large" onClick={() => router.push("/farmer/dashboard")}>
              Continue to Dashboard
            </Button>
          </div>
        ) : (
          <Card title={status === "pending" ? "Your application is waiting for review" : "Complete or update your vetting application"}>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item name="farm_name" label="Farm name" rules={[{ required: true, message: "Farm name is required" }]}> 
                <Input placeholder="e.g. Green Valley Farm" />
              </Form.Item>
              <Form.Item name="farm_location_county" label="County" rules={[{ required: true, message: "County is required" }]}> 
                <Input placeholder="County" />
              </Form.Item>
              <Form.Item name="farm_location_ward" label="Ward"> 
                <Input placeholder="Ward" />
              </Form.Item>
              <Form.Item name="farm_size_acres" label="Farm size (acres)"> 
                <InputNumber min={0} style={{ width: "100%" }} placeholder="e.g. 12" />
              </Form.Item>
              <Form.Item name="products_grown" label="Products grown" rules={[{ required: true, message: "Products grown is required" }]}> 
                <Input.TextArea rows={3} placeholder="e.g. Tomatoes, Kale, Maize" />
              </Form.Item>
              <Form.Item name="years_farming" label="Years farming"> 
                <InputNumber min={0} style={{ width: "100%" }} placeholder="e.g. 5" />
              </Form.Item>
              <Form.Item name="phone_number" label="Phone number"> 
                <Input placeholder="Phone number" />
              </Form.Item>
              <Form.Item name="id_number" label="ID number"> 
                <Input placeholder="National ID / Passport" />
              </Form.Item>
              <Form.Item name="supporting_document_url" label="Supporting document URL"> 
                <Input placeholder="Link to document if available" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting} size="large">
                  {status === "pending" ? "Update application" : "Submit vetting application"}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        )}
      </Card>
    </div>
  );
}
