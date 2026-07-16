"use client";

import { Form, Input, Button, Card, Typography, message, Space, Divider } from "antd";
import { MailOutlined, LockOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { refreshProfile, setProfileFromLogin } = useAuth();
  const router = useRouter();

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    const res = await fetch("/api/auth/login", {
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
      message.success("Welcome back! 🌿");
      // Immediately set profile from API response so RoleGuard doesn't redirect
      if (data.data.profile) {
        setProfileFromLogin(data.data.profile);
      }
      // Also refresh in background for any updates
      await refreshProfile();
      const role = data.data.profile?.role || "buyer";
      // Small delay to let React process state updates
      await new Promise((r) => setTimeout(r, 80));
      router.push(`/${role}/dashboard`);
    } else {
      message.error(data.error || "Login failed");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card-wrapper">
        {/* Branding */}
        <div className="auth-brand">
          <span className="auth-logo">🌿</span>
          <Title level={2} className="auth-title">Welcome Back</Title>
          <Text type="secondary">Sign in to your Zuri Mkulima Connect account</Text>
        </div>

        <Card className="auth-card">
          <Form onFinish={handleLogin} layout="vertical" size="large" requiredMark={false}>
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Enter a valid email address" },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: "#8a9a8a" }} />}
                placeholder="Email address"
                autoComplete="email"
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "Please enter your password" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#8a9a8a" }} />}
                placeholder="Password"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                icon={<ArrowRightOutlined />}
                style={{ height: 44, fontWeight: 600 }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <Divider plain style={{ fontSize: 12, color: "#8a9a8a" }}>
            Or
          </Divider>

          <div className="auth-links">
            <Link href="/register">Create an account</Link>
            <Link href="/reset-password">Forgot password?</Link>
          </div>
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
        .auth-card-wrapper {
          width: 100%;
          max-width: 400px;
        }
        .auth-brand {
          text-align: center;
          margin-bottom: 24px;
        }
        .auth-logo {
          font-size: 40px;
          display: block;
          margin-bottom: 8px;
        }
        .auth-title {
          margin-bottom: 4px !important;
          font-weight: 700 !important;
          font-size: 22px !important;
        }
        .auth-card {
          border-radius: 16px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06) !important;
        }
        .auth-links {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
