"use client";

import { Row, Col, Empty } from "antd";
import { Listing } from "@/lib/db/types";
import ListingCard from "./ListingCard";
import Loading from "@/components/shared/Loading";

export default function ListingGrid({
  listings,
  loading,
  viewMode = "buyer",
}: {
  listings: Listing[];
  loading: boolean;
  viewMode?: "buyer" | "farmer" | "admin";
}) {
  if (loading) return <Loading text="Loading listings..." />;
  if (!listings.length) return (
    <div style={{ padding: "40px 0" }}>
      <Empty description="No listings found" />
    </div>
  );

  return (
    <Row gutter={[10, 10]}>
      {listings.map((listing) => (
        <Col key={listing.id} xs={12} sm={12} md={8} lg={6}>
          <ListingCard listing={listing} viewMode={viewMode} />
        </Col>
      ))}
    </Row>
  );
}
