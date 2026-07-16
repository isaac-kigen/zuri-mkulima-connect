"use client";

import { Form, Input, Button, Select, message } from "antd";
import { useState } from "react";
import { getCsrfToken } from "@/lib/utils/csrf";

export default function ComplaintForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    setLoading(true);
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      message.success("Complaint filed");
      form.resetFields();
      onSuccess();
    } else {
      message.error(data.error || "Failed to file complaint");
    }
  };

  return (
    <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ maxWidth: 500 }}>
      <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
        <Input placeholder="Brief subject of complaint" />
      </Form.Item>
      <Form.Item name="description" label="Description" rules={[{ required: true }]}>
        <Input.TextArea rows={4} placeholder="Describe your complaint..." />
      </Form.Item>
      <Form.Item name="against_user_id" label="Against User ID (optional)">
        <Input placeholder="User ID if applicable" />
      </Form.Item>
      <Form.Item name="order_id" label="Order ID (optional)">
        <Input placeholder="Order ID if applicable" />
      </Form.Item>
      <Form.Item name="listing_id" label="Listing ID (optional)">
        <Input placeholder="Listing ID if applicable" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading}>Submit Complaint</Button>
    </Form>
  );
}
