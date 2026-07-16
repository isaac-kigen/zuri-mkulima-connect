"use client";

import { Typography, Card, message } from "antd";
import RoleGuard from "@/components/shared/RoleGuard";
import ListingForm from "@/components/marketplace/ListingForm";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title } = Typography;

export default function NewListing() {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    const res = await fetch("/api/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.success) {
      message.success("🎉 Listing created successfully!");
      router.push("/farmer/listings");
    } else {
      message.error(data.error || "Failed to create listing");
    }
  };

  return (
    <RoleGuard role="farmer">
      <div className="new-listing slide-up">
        <Title level={2} style={{ fontWeight: 700 }}>📝 Create New Listing</Title>
        <Card className="form-card">
          <ListingForm onSubmit={handleCreate} loading={submitting} />
        </Card>
      </div>

      <style jsx>{`
        .new-listing { max-width: 720px; }
        .form-card { border-radius: 16px !important; }
      `}</style>
    </RoleGuard>
  );
}
