"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Form,
  Input,
  Button,
  Typography,
  Card,
  message,
} from "antd";
import {
  LoginOutlined,
  MailOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title, Text } = Typography;

interface SigninFields {
  email: string;
  password: string;
}

export default function SigninPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (values: SigninFields) => {
    setLoading(true);
    try {
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
        message.success("Signed in successfully!");
        const role = data.data.profile?.role || "buyer";
        router.push(`/${role}/dashboard`);
      } else {
        message.error(data.error || "Invalid email or password.");
      }
    } catch {
      setLoading(false);
      message.error("An unexpected error occurred.");
    }
  };

  return (
    <div className="signin-container">
      <Card className="signin-card">
        <div className="signin-header">
          <span className="signin-logo">🌿</span>
          <Title level={3} className="signin-title">
            Welcome back
          </Title>
          <Text type="secondary">Sign in to your Zuri Mkulima Connect account</Text>
        </div>

        <Form
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Email address"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please enter your password" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div className="signin-footer">
          <Text type="secondary">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="signin-link">
              Sign up
            </Link>
          </Text>
        </div>
      </Card>

      <style jsx>{`
        .signin-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-primary-50), var(--color-bg));
          padding: 16px;
        }

        .signin-card {
          width: 100%;
          max-width: 400px;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-xl) !important;
          box-shadow: var(--shadow-md) !important;
          background: var(--color-surface) !important;
        }

        .signin-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .signin-logo {
          font-size: 40px;
          display: block;
        }

        .signin-title {
          margin-top: 12px !important;
          margin-bottom: 4px !important;
          font-weight: 700;
          color: var(--color-text) !important;
        }

        .signin-footer {
          text-align: center;
        }

        .signin-link {
          color: var(--color-primary) !important;
          font-weight: 600;
          transition: color var(--transition);
        }

        .signin-link:hover {
          color: var(--color-primary-light) !important;
        }
      `}</style>
    </div>
  );
}
