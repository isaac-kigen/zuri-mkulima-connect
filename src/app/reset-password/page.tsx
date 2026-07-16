"use client";

import { Form, Input, Button, Card, Typography, message } from "antd";
import { MailOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useState } from "react";
import Link from "next/link";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title, Text } = Typography;

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (values: { email: string }) => {
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
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
      setSent(true);
      message.success("Password reset email sent!");
    } else {
      message.error(data.error || "Failed to send reset email");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card-wrapper">
        <div className="auth-brand">
          <span className="auth-logo">🔐</span>
          <Title level={2} className="auth-title">Reset Password</Title>
          <Text type="secondary">We&apos;ll send you a reset link</Text>
        </div>

        <Card className="auth-card">
          {sent ? (
            <div style={{ textAlign: "center", padding: 16 }}>
              <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>📧</span>
              <Text>Check your email for reset instructions.</Text>
              <br />
              <Link href="/login" style={{ marginTop: 12, display: "inline-block" }}>
                <ArrowLeftOutlined /> Back to Login
              </Link>
            </div>
          ) : (
            <Form onFinish={handleReset} layout="vertical" size="large" requiredMark={false}>
              <Form.Item name="email" rules={[{ required: true, type: "email", message: "Enter your email" }]}>
                <Input prefix={<MailOutlined style={{ color: "#8a9a8a" }} />} placeholder="Your email address" autoFocus />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 44, fontWeight: 600 }}>
                  Send Reset Link
                </Button>
              </Form.Item>
              <div style={{ textAlign: "center" }}>
                <Link href="/login"><ArrowLeftOutlined /> Back to Login</Link>
              </div>
            </Form>
          )}
        </Card>
      </div>

      <style jsx>{`
        .auth-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 100px);
          padding: 16px;
        }
        .auth-card-wrapper { width: 100%; max-width: 400px; }
        .auth-brand { text-align: center; margin-bottom: 20px; }
        .auth-logo { font-size: 40px; display: block; margin-bottom: 8px; }
        .auth-title { margin-bottom: 4px !important; font-weight: 700 !important; font-size: 22px !important; }
        .auth-card { border-radius: 16px !important; box-shadow: 0 4px 20px rgba(0,0,0,0.06) !important; }
      `}</style>
    </div>
  );
}
