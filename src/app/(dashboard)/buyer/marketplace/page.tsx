"use client";

import { Typography, Pagination } from "antd";
import { ShopOutlined } from "@ant-design/icons";
import { useEffect, useState, useCallback } from "react";
import { Listing, ListingFilters } from "@/lib/db/types";
import RoleGuard from "@/components/shared/RoleGuard";
import ListingGrid from "@/components/marketplace/ListingGrid";
import ListingFiltersComponent from "@/components/marketplace/ListingFilters";

const { Title } = Typography;

export default function BuyerMarketplace() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, total_pages: 0 });
  const [filters, setFilters] = useState<ListingFilters>({ sort: "latest" });

  const fetchListings = useCallback(async (f: ListingFilters = {}, page = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries({ ...f, page, limit: 12 }).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });
    const res = await fetch(`/api/marketplace?${params}`);
    const data = await res.json();
    setListings(data.data || []);
    if (data.pagination) setPagination(data.pagination);
    setLoading(false);
  }, []);

  useEffect(() => { fetchListings(filters); }, [fetchListings, filters]);

  const handleFilter = (f: ListingFilters) => {
    setFilters(f);
    fetchListings(f, 1);
  };

  return (
    <RoleGuard role="buyer">
      <div className="marketplace slide-up">
        <Title level={2} style={{ fontWeight: 700 }}>
          <ShopOutlined /> Marketplace
        </Title>

        <ListingFiltersComponent onFilter={handleFilter} />

        <div style={{ marginTop: 16 }}>
          <ListingGrid listings={listings} loading={loading} viewMode="buyer" />
        </div>

        {pagination.total > pagination.limit && (
          <div style={{ textAlign: "center", marginTop: 24, paddingBottom: 16 }}>
            <Pagination
              current={pagination.page}
              total={pagination.total}
              pageSize={pagination.limit}
              onChange={(page) => fetchListings(filters, page)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .marketplace { max-width: 1100px; }
      `}</style>
    </RoleGuard>
  );
}
