"use client";

import { Rate, Input, Button, Form, message } from "antd";
import { useState } from "react";
import { getCsrfToken } from "@/lib/utils/csrf";

interface Props {
  farmerId: string;
  orderId?: string;
  onRated: () => void;
}

export default function RatingForm({ farmerId, orderId, onRated }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({
        farmer_id: farmerId,
        order_id: orderId,
        rating: values.rating,
        review: values.review,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      message.success("Rating submitted!");
      onRated();
    } else {
      message.error(data.error || "Failed to submit rating");
    }
  };

  return (
    <Form form={form} onFinish={handleSubmit} layout="vertical">
      <Form.Item name="rating" label="Rating" rules={[{ required: true }]}>
        <Rate />
      </Form.Item>
      <Form.Item name="review" label="Review (optional)">
        <Input.TextArea rows={3} placeholder="Write your review..." />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading}>Submit Rating</Button>
    </Form>
  );
}
