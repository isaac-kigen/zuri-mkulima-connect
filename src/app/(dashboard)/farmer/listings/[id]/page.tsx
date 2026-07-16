"use client";

import { Typography, Card, Space, Button, Tag, Descriptions } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Listing } from "@/lib/db/types";
import RoleGuard from "@/components/shared/RoleGuard";
import Loading from "@/components/shared/Loading";
import ErrorDisplay from "@/components/shared/ErrorDisplay";

const { Title } = Typography;

export default function ListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/marketplace/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setListing(d.data);
        else setError(d.error);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <Loading />;
  if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;
  if (!listing) return <ErrorDisplay message="Listing not found" />;

  const statusColor = listing.status === "active" ? "green" : listing.status === "inactive" ? "orange" : "red";

  return (
    <RoleGuard role="farmer">
      <div className="detail-page slide-up">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ marginBottom: 12 }}>
          Back to Listings
        </Button>

        <Title level={2} style={{ fontWeight: 700 }}>{listing.title}</Title>

        <Card className="detail-card">
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="Status">
              <Tag color={statusColor}>{listing.status?.toUpperCase()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Category">{listing.category}</Descriptions.Item>
            <Descriptions.Item label="Price">
              <strong>KES {listing.price_kes?.toLocaleString()}</strong> / {listing.unit}
            </Descriptions.Item>
            <Descriptions.Item label="Available">
              {listing.quantity_available} {listing.unit}
            </Descriptions.Item>
            <Descriptions.Item label="Location">
              {listing.location_county}{listing.location_ward ? `, ${listing.location_ward}` : ""}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(listing.created_at).toLocaleDateString()}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {listing.description || "No description"}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      <style jsx>{`
        .detail-page { max-width: 720px; }
        .detail-card { border-radius: 14px !important; }
      `}</style>
    </RoleGuard>
  );
}
