"use client";

import { Card, Tag, Typography, Tooltip } from "antd";
import {
  EnvironmentOutlined,
  UserOutlined,
  StarFilled,
  CheckCircleFilled,
  CalendarOutlined,
} from "@ant-design/icons";
import Image from "next/image";
import { Listing } from "@/lib/db/types";
import { useRouter } from "next/navigation";

function isSupabaseImageUrl(url: string) {
  return /supabase\.co\/storage/.test(url);
}

const { Text, Title } = Typography;

export default function ListingCard({
  listing,
  viewMode = "buyer",
}: {
  listing: Listing;
  viewMode?: "buyer" | "farmer" | "admin";
}) {
  const router = useRouter();
  const photoUrl = listing.photos?.[0];

  const statusColors: Record<string, string> = {
    active: "green",
    inactive: "orange",
    archived: "red",
  };

  const detailPath =
    viewMode === "admin"
      ? `/admin/listings/${listing.id}`
      : viewMode === "farmer"
      ? `/farmer/listings/${listing.id}`
      : `/buyer/marketplace/${listing.id}`;

  const stats = listing.farmer_stats;

  return (
    <Card
      hoverable
      className="listing-card"
      onClick={() => router.push(detailPath)}
      cover={
        photoUrl ? (
          <div className="listing-image-wrap">
            {isSupabaseImageUrl(photoUrl) ? (
              <Image
                alt={listing.title}
                src={photoUrl}
                fill
                className="listing-image"
                unoptimized
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            ) : (
              <Image
                alt={listing.title}
                src={photoUrl}
                fill
                className="listing-image"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            )}
            <Tag color={statusColors[listing.status]} className="listing-status-tag">
              {listing.status}
            </Tag>
          </div>
        ) : (
          <div className="listing-image-placeholder">
            <ShopIcon />
            <Tag color={statusColors[listing.status]} className="listing-status-tag">
              {listing.status}
            </Tag>
          </div>
        )
      }
      bodyStyle={{ padding: 12 }}
    >
      <div className="listing-card-body">
        {/* Title */}
        <Title level={5} className="listing-title" ellipsis={{ rows: 1, tooltip: listing.title }}>
          {listing.title}
        </Title>

        {/* Price */}
        <Text strong className="listing-price">
          KES {listing.price_kes?.toLocaleString()}
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            {" "}/ {listing.unit}
          </Text>
        </Text>

        {/* Location */}
        <div className="listing-meta">
          <EnvironmentOutlined style={{ color: "#8a9a8a", fontSize: 12 }} />
          <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
            {listing.location_county}
            {listing.location_ward ? `, ${listing.location_ward}` : ""}
          </Text>
        </div>

        {/* Farmer with brief stats */}
        {listing.farmer && (
          <div className="listing-meta">
            <UserOutlined style={{ color: "#8a9a8a", fontSize: 12 }} />
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              {listing.farmer.full_name}
            </Text>
            {listing.farmer.vetting_status === "approved" && (
              <Tooltip title="Verified Farmer">
                <CheckCircleFilled style={{ color: "#1a7a1a", fontSize: 11, marginLeft: 2 }} />
              </Tooltip>
            )}
          </div>
        )}

        {/* Brief farmer stats row — concise numbers */}
        {stats && (
          <div className="listing-farmer-stats">
            {stats.avg_rating > 0 && (
              <Tooltip title={`Average Rating: ${stats.avg_rating} / 5`}>
                <span className="listing-stat-badge">
                  <StarFilled style={{ color: "#faad14", fontSize: 10 }} />
                  <span>{stats.avg_rating}</span>
                </span>
              </Tooltip>
            )}
            <Tooltip title={`${stats.completed_sales} completed sales`}>
              <span className="listing-stat-badge">
                <span>📦 {stats.completed_sales}</span>
              </span>
            </Tooltip>
            {stats.total_ratings > 0 && (
              <Tooltip title={`${stats.total_ratings} ratings`}>
                <span className="listing-stat-badge">
                  <span>💬 {stats.total_ratings}</span>
                </span>
              </Tooltip>
            )}
          </div>
        )}

        {/* Stock */}
        <Text type="secondary" style={{ fontSize: 11 }}>
          {listing.quantity_available > 0
            ? `${listing.quantity_available} ${listing.unit} available`
            : "Out of stock"}
        </Text>
      </div>

      <style jsx>{`
        .listing-card {
          border-radius: var(--radius-xl) !important;
          transition: all var(--transition) !important;
          height: 100%;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--color-border) !important;
          overflow: hidden;
          background: var(--color-surface) !important;
        }

        .listing-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg) !important;
          border-color: var(--color-primary-50) !important;
        }

        .listing-image-wrap {
          position: relative;
          height: 140px;
          overflow: hidden;
          background: var(--color-bg);
        }

        @media (min-width: 480px) {
          .listing-image-wrap {
            height: 160px;
          }
        }

        @media (min-width: 768px) {
          .listing-image-wrap {
            height: 180px;
          }
        }

        .listing-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--transition) !important;
        }

        .listing-card:hover .listing-image {
          transform: scale(1.05);
        }

        .listing-image-placeholder {
          height: 140px;
          background: linear-gradient(135deg, var(--color-bg-alt), var(--color-primary-50));
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        @media (min-width: 480px) {
          .listing-image-placeholder {
            height: 160px;
          }
        }

        @media (min-width: 768px) {
          .listing-image-placeholder {
            height: 180px;
          }
        }

        .listing-status-tag {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 1;
          font-weight: 600 !important;
          text-transform: capitalize;
          border-radius: var(--radius-full) !important;
          font-size: 11px !important;
          padding: 2px 8px !important;
        }

        .listing-card-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          padding: 12px;
        }

        @media (min-width: 768px) {
          .listing-card-body {
            padding: 14px;
          }
        }

        .listing-title {
          margin: 0 !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          line-height: 1.3 !important;
          color: var(--color-text) !important;
        }

        .listing-price {
          font-size: 16px !important;
          color: var(--color-primary) !important;
          font-weight: 700 !important;
          margin-top: 2px !important;
        }

        .listing-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px !important;
          color: var(--color-text-muted) !important;
        }

        .listing-farmer-stats {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .listing-stat-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          color: var(--color-text-secondary) !important;
          background: var(--color-primary-50) !important;
          padding: 3px 8px;
          border-radius: var(--radius-full) !important;
          font-weight: 600 !important;
          white-space: nowrap;
        }
      `}</style>
    </Card>
  );
}

/* Small component for placeholder */
function ShopIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b0c0b0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}
