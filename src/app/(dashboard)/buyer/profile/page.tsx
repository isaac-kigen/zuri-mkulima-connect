"use client";

import { Typography, Card, Form, Input, Button, Select, Upload, message, Avatar, Divider } from "antd";
import { UploadOutlined, UserOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined, SaveOutlined } from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import RoleGuard from "@/components/shared/RoleGuard";
import { useState } from "react";
import type { UploadFile } from "antd/lib/upload/interface";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title, Text } = Typography;

const COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa", "Homa Bay",
  "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii",
  "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
  "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita Taveta",
  "Tana River", "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga",
  "Wajir", "West Pokot",
];

export default function BuyerProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<UploadFile | null>(null);

  const handleUpdate = async (values: any) => {
    setLoading(true);
    try {
      let avatarUrl = values.avatar_url || profile?.avatar_url;

      if (avatarFile?.originFileObj) {
        const formData = new FormData();
        formData.append("file", avatarFile.originFileObj);
        formData.append("bucket", "avatars");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "x-csrf-token": getCsrfToken() },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          avatarUrl = uploadData.data.url;
        } else {
          message.error(`Avatar upload failed: ${uploadData.error}`);
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
        body: JSON.stringify({ ...values, avatar_url: avatarUrl }),
      });
      const data = await res.json();
      if (data.success) {
        message.success("✅ Profile updated!");
        setAvatarFile(null);
        refreshProfile();
      } else {
        message.error(data.error || "Update failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard role="buyer">
      <div className="profile-page slide-up">
        <Title level={2} style={{ fontWeight: 700 }}>👤 My Profile</Title>

        <Card className="profile-card">
          <div className="avatar-section">
            <Avatar
              size={88}
              src={profile?.avatar_url}
              icon={<UserOutlined />}
              style={{
                backgroundColor: "#1a7a1a",
                fontSize: 36,
                boxShadow: "0 4px 12px rgba(26,122,26,0.2)",
              }}
            />
            <div>
              <Text strong style={{ fontSize: 18, display: "block" }}>
                {profile?.full_name || "User"}
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {profile?.role?.toUpperCase()} · {profile?.county}
              </Text>
            </div>
            <Upload
              maxCount={1}
              fileList={avatarFile ? [avatarFile] : []}
              onChange={({ fileList }) => setAvatarFile(fileList[0] || null)}
              beforeUpload={() => false}
              accept="image/jpeg,image/png,image/webp,image/gif"
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} size="small" style={{ marginTop: 4 }}>
                Change Photo
              </Button>
            </Upload>
          </div>

          <Divider style={{ margin: "16px 0" }} />

          <Form layout="vertical" initialValues={profile || {}} onFinish={handleUpdate} requiredMark={false} size="large">
            <Form.Item label="Full Name" name="full_name" rules={[{ required: true }]}>
              <Input prefix={<UserOutlined style={{ color: "#8a9a8a" }} />} placeholder="Your full name" />
            </Form.Item>
            <Form.Item label="Phone Number" name="phone" rules={[{ required: true }]}>
              <Input prefix={<PhoneOutlined style={{ color: "#8a9a8a" }} />} placeholder="07xx xxx xxx" />
            </Form.Item>
            <Form.Item label="County" name="county" rules={[{ required: true }]}>
              <Select showSearch placeholder="Select county" options={COUNTIES.map((c) => ({ value: c, label: c }))}
                suffixIcon={<EnvironmentOutlined style={{ color: "#8a9a8a" }} />} />
            </Form.Item>
            <Form.Item label="Email">
              <Input value={profile?.email || ""} disabled prefix={<MailOutlined style={{ color: "#8a9a8a" }} />} />
            </Form.Item>
            <Form.Item label="Role">
              <Input value={profile?.role?.toUpperCase() || ""} disabled />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} block style={{ height: 44, fontWeight: 600 }}>
              Update Profile
            </Button>
          </Form>
        </Card>
      </div>

      <style jsx>{`
        .profile-page { max-width: 480px; }
        .profile-card { border-radius: 16px !important; }
        .avatar-section { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
      `}</style>
    </RoleGuard>
  );
}
