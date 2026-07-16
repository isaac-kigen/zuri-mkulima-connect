"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Form,
  Input,
  Button,
  Select,
  Typography,
  Card,
  message,
  Space,
} from "antd";
import {
  UserAddOutlined,
  MailOutlined,
  LockOutlined,
  AppleOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/lib/auth";
import type { UserType } from "@/types";

const { Title, Text } = Typography;

interface SignupFields {
  name: string;
  email: string;
  password: string;
  confirm: string;
  type: UserType;
}

const userTypeOptions: { value: UserType; label: string; icon: React.ReactNode }[] = [
  { value: "farmer", label: "Farmer — I grow & sell produce", icon: <AppleOutlined /> },
  { value: "buyer", label: "Buyer — I purchase produce", icon: <ShoppingCartOutlined /> },
  { value: "admin", label: "Admin — I manage the platform", icon: <TeamOutlined /> },
];

export default function SignupPage() {
  const { signup, isLoading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm<SignupFields>();

  const handleSubmit = async (values: SignupFields) => {
    try {
      await signup(values.name, values.email, values.password, values.type);
      message.success(`Welcome, ${values.name}!`);
      router.push("/dashboard");
    } catch {
      message.error("Signup failed. Please try again.");
    }
  };

  return (
    <div className="signup-container">
      <Card className="signup-card">
        <div className="signup-header">
          <UserAddOutlined className="signup-icon" />
          <Title level={3} className="signup-title">
            Create your account
          </Title>
          <Text type="secondary">Join Zuri Mkulima Connect today</Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ type: "farmer" }}
          requiredMark={false}
        >
          <Form.Item
            name="name"
            rules={[{ required: true, message: "Please enter your name" }]}
          >
            <Input
              prefix={<UserAddOutlined />}
              placeholder="Full name"
              size="large"
            />
          </Form.Item>

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
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "Please enter a password" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirm"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) return Promise.resolve();
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm password"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="type"
            rules={[{ required: true, message: "Select your role" }]}
          >
            <Select size="large" options={userTypeOptions} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={isLoading}
            >
              Create Account
            </Button>
          </Form.Item>
        </Form>

        <div className="signup-footer">
          <Text type="secondary">
            Already have an account?{" "}
            <Link href="/signin" className="signup-link">
              Sign in
            </Link>
          </Text>
        </div>
      </Card>

      <style jsx>{`
        .signup-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-bg), var(--color-primary-50));
          padding: 16px;
        }

        .signup-card {
          width: 100%;
          max-width: 440px;
          border: 1px solid var(--color-border) !important;
          border-radius: var(--radius-xl) !important;
          box-shadow: var(--shadow-md) !important;
          background: var(--color-surface) !important;
        }

        .signup-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .signup-icon {
          font-size: 40px;
          color: var(--color-primary);
          display: block;
        }

        .signup-title {
          margin-top: 12px !important;
          margin-bottom: 4px !important;
          font-weight: 700;
          color: var(--color-text) !important;
        }

        .signup-footer {
          text-align: center;
        }

        .signup-link {
          color: var(--color-primary) !important;
          font-weight: 600;
          transition: color var(--transition);
        }

        .signup-link:hover {
          color: var(--color-primary-light) !important;
        }
      `}</style>
    </div>
  );
}
