"use client";

import { Form, Input, Button, Card, Typography, message, Select, Space, Steps, Alert } from "antd";
import {
  MailOutlined,
  LockOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title, Text, Paragraph } = Typography;

const COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa", "Homa Bay",
  "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii",
  "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
  "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita Taveta",
  "Tana River", "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga",
  "Wajir", "West Pokot",
];

const COUNTIES_OPTIONS = COUNTIES.map((c) => ({ value: c, label: c }));

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [form] = Form.useForm();
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const [vettingSubmitted, setVettingSubmitted] = useState(false);
  const router = useRouter();

  const selectedRole = Form.useWatch("role", form);

  const handleRegister = async (values: Record<string, any>) => {
    setLoading(true);
    const res = await fetch("/api/auth/register", {
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
      message.success("Registration successful! Check your email to verify.");
      // If farmer, go to vetting step
      if (values.role === "farmer") {
        setRegisteredUserId(data.data?.user?.id);
        setStep(2); // Go to vetting info step
      } else {
        router.push("/login");
      }
    } else {
      message.error(data.error || "Registration failed");
    }
  };

  const handleVettingSubmit = async (values: Record<string, any>) => {
    setLoading(true);
    const res = await fetch("/api/vetting", {
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
      message.success("Vetting form submitted! An admin will review your application.");
      setVettingSubmitted(true);
    } else {
      message.error(data.error || "Failed to submit vetting form");
    }
  };

  const nextStep = () => {
    if (step === 0) {
      form.validateFields(["full_name", "email", "phone"]).then((values) => {
        setStepData((prev) => ({ ...prev, ...values }));
        setStep(1);
      }).catch(() => {});
    } else if (step === 1) {
      form.validateFields(["county", "role", "password"]).then((values) => {
        const allValues = { ...stepData, ...values };
        setStepData(allValues);
        handleRegister(allValues);
      }).catch(() => {});
    }
  };

  // Step 2: Vetting form for farmers
  if (step === 2) {
    return (
      <div className="auth-container">
        <div className="auth-card-wrapper" style={{ maxWidth: 520 }}>
          <div className="auth-brand">
            <span className="auth-logo">🌾</span>
            <Title level={2} className="auth-title">Farmer Verification</Title>
            <Text type="secondary">
              All farmers must be vetted before they can create listings. An admin will visit your farm to verify.
            </Text>
          </div>

          {vettingSubmitted ? (
            <Card className="auth-card" style={{ textAlign: "center", padding: 24 }}>
              <CheckCircleOutlined style={{ fontSize: 56, color: "#1a7a1a", marginBottom: 16 }} />
              <Title level={4}>Vetting Form Submitted!</Title>
              <Paragraph type="secondary">
                Your vetting application has been received. An admin will review your information and may visit your farm.
                You&apos;ll be notified once your vetting is approved.
              </Paragraph>
              <Paragraph type="secondary">
                You won&apos;t be able to create listings until your vetting is approved.
              </Paragraph>
              <Button type="primary" size="large" onClick={() => router.push("/login")} style={{ marginTop: 8 }}>
                Go to Login
              </Button>
            </Card>
          ) : (
            <Card className="auth-card">
              <Alert
                message="Vetting is mandatory for all farmers"
                description="An admin will review your details and may visit your farm before approval. You cannot create listings without approval."
                type="info"
                showIcon
                style={{ marginBottom: 16, borderRadius: 10 }}
              />

              <Form onFinish={handleVettingSubmit} layout="vertical" size="large" requiredMark={false}>
                <Form.Item name="farm_name" rules={[{ required: true, message: "Farm name is required" }]}>
                  <Input placeholder="Farm Name (e.g., Green Valley Farm)" />
                </Form.Item>

                <Space style={{ width: "100%" }} size="small">
                  <Form.Item name="farm_location_county" rules={[{ required: true, message: "Required" }]} style={{ flex: 1 }}>
                    <Select
                      showSearch
                      placeholder="Farm County"
                      options={COUNTIES_OPTIONS}
                    />
                  </Form.Item>
                  <Form.Item name="farm_location_ward" style={{ flex: 1 }}>
                    <Input placeholder="Ward / Village" />
                  </Form.Item>
                </Space>

                <Form.Item name="products_grown" rules={[{ required: true, message: "Tell us what you grow" }]}>
                  <Input.TextArea
                    placeholder="What products do you grow? (e.g., Mangoes, Maize, Tomatoes, Kale...)"
                    rows={2}
                  />
                </Form.Item>

                <Space style={{ width: "100%" }} size="small">
                  <Form.Item name="farm_size_acres" style={{ flex: 1 }}>
                    <Input type="number" placeholder="Farm size (acres)" />
                  </Form.Item>
                  <Form.Item name="years_farming" style={{ flex: 1 }}>
                    <Input type="number" placeholder="Years farming" />
                  </Form.Item>
                </Space>

                <Form.Item name="phone_number" rules={[{ required: true, message: "Phone is required" }]}>
                  <Input prefix={<PhoneOutlined style={{ color: "#8a9a8a" }} />} placeholder="Phone (07xx xxx xxx)" />
                </Form.Item>

                <Form.Item name="id_number">
                  <Input placeholder="National ID Number (optional)" />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  icon={<ArrowRightOutlined />}
                  style={{ height: 44, fontWeight: 600 }}
                >
                  Submit Vetting Form
                </Button>
              </Form>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card-wrapper">
        <div className="auth-brand">
          <span className="auth-logo">🌿</span>
          <Title level={2} className="auth-title">Create Account</Title>
          <Text type="secondary">Join Zuri Mkulima Connect in just a few steps</Text>
        </div>

        <Steps
          current={step}
          size="small"
          items={[
            { title: "About You" },
            { title: "Location & Role" },
            ...(selectedRole === "farmer" ? [{ title: "Farm Details" }] : []),
          ]}
          style={{ marginBottom: 20 }}
        />

        <Card className="auth-card">
          <Form form={form} layout="vertical" size="large" requiredMark={false}>
            {step === 0 && (
              <>
                <Form.Item name="full_name" rules={[{ required: true, message: "Full name is required" }]}>
                  <Input
                    prefix={<UserOutlined style={{ color: "#8a9a8a" }} />}
                    placeholder="Full Name"
                    autoFocus
                  />
                </Form.Item>
                <Form.Item name="email" rules={[{ required: true }, { type: "email" }]}>
                  <Input
                    prefix={<MailOutlined style={{ color: "#8a9a8a" }} />}
                    placeholder="Email address"
                    autoComplete="email"
                  />
                </Form.Item>
                <Form.Item name="phone" rules={[{ required: true, message: "Phone number is required" }]}>
                  <Input
                    prefix={<PhoneOutlined style={{ color: "#8a9a8a" }} />}
                    placeholder="Phone (07xx xxx xxx)"
                  />
                </Form.Item>
              </>
            )}

            {step === 1 && (
              <>
                <Form.Item name="county" rules={[{ required: true, message: "Select your county" }]}>
                  <Select
                    showSearch
                    placeholder="Select County"
                    options={COUNTIES_OPTIONS}
                    suffixIcon={<EnvironmentOutlined style={{ color: "#8a9a8a" }} />}
                  />
                </Form.Item>
                <Form.Item name="role" rules={[{ required: true, message: "Select your role" }]}>
                  <Select
                    placeholder="I want to..."
                    options={[
                      { value: "farmer", label: "🌾 Sell produce (Farmer)" },
                      { value: "buyer", label: "🛒 Buy produce (Buyer)" },
                    ]}
                  />
                </Form.Item>

                {selectedRole === "farmer" && (
                  <Alert
                    message="Farmers must be vetted before listing"
                    description="After registration, you'll submit your farm details for admin verification. This is mandatory."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 12, borderRadius: 10 }}
                  />
                )}

                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: "Create a password" },
                    { min: 6, message: "At least 6 characters" },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: "#8a9a8a" }} />}
                    placeholder="Password (min 6 characters)"
                    autoComplete="new-password"
                  />
                </Form.Item>
              </>
            )}

            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              {step === 1 && (
                <Button onClick={() => { setStep(0); setTimeout(() => form.setFieldsValue(stepData), 0); }} icon={<ArrowLeftOutlined />}>
                  Back
                </Button>
              )}
              <Button
                type="primary"
                onClick={nextStep}
                loading={loading}
                icon={step === 1 ? undefined : <ArrowRightOutlined />}
                style={{ marginLeft: step === 1 ? undefined : "auto", height: 44, fontWeight: 600 }}
              >
                {step === 0 ? "Continue" : "Create Account"}
              </Button>
            </Space>
          </Form>
        </Card>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/login">Already have an account? Sign in</Link>
        </div>
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
          max-width: 420px;
        }
        .auth-brand {
          text-align: center;
          margin-bottom: 20px;
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
      `}</style>
    </div>
  );
}
