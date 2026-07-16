"use client";

import { Typography, Button, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import RoleGuard from "@/components/shared/RoleGuard";
import ListingGrid from "@/components/marketplace/ListingGrid";
import ListingFilters from "@/components/marketplace/ListingFilters";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { Listing } from "@/lib/db/types";
import { useRouter } from "next/navigation";

const { Title } = Typography;

export default function FarmerListings() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchListings = useCallback(async (filters: any = {}) => {
    if (!profile) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("farmer_id", profile.id);
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, String(v)); });
    const res = await fetch(`/api/marketplace?${params}`);
    const data = await res.json();
    setListings(data.data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  return (
    <RoleGuard role="farmer">
      <div className="listings-page slide-up">
        <div className="listings-header">
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>📦 My Listings</Title>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => router.push("/farmer/listings/new")}>
              New Listing
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <ListingFilters onFilter={fetchListings} showStatus />
        </div>

        <ListingGrid listings={listings} loading={loading} viewMode="farmer" />
      </div>

      <style jsx>{`
        .listings-page { max-width: 1100px; }
        .listings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }
      `}</style>
    </RoleGuard>
  );
}
