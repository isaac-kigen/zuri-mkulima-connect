"use client";

import { Typography, Card, Tag, Button, Space, InputNumber, List, Rate, message, Divider } from "antd";
import { ShoppingCartOutlined, EnvironmentOutlined, UserOutlined, StarFilled, ThunderboltOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

function isSupabaseImageUrl(url: string) {
  return /supabase\.co\/storage/.test(url);
}
import { useEffect, useState } from "react";
import { Listing, FarmerStats, Rating as RatingType } from "@/lib/db/types";
import RoleGuard from "@/components/shared/RoleGuard";
import Loading from "@/components/shared/Loading";
import ErrorDisplay from "@/components/shared/ErrorDisplay";
import RatingForm from "@/components/ratings/RatingForm";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getCsrfToken } from "@/lib/utils/csrf";

const { Title, Text, Paragraph } = Typography;

export default function ListingDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [stats, setStats] = useState<FarmerStats | null>(null);
  const [ratings, setRatings] = useState<RatingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  useEffect(() => {
    async function loadListing() {
      try {
        const res = await fetch(`/api/marketplace/${id}`);
        const d = await res.json();
        if (!d.success) {
          setError(d.error || "Failed to load listing");
          setLoading(false);
          return;
        }
        setListing(d.data);

        try {
          const statsRes = await fetch(`/api/ratings?farmer_id=${d.data.farmer_id}`);
          const statsData = await statsRes.json();
          if (statsData?.success) {
            setStats(statsData.data.stats);
            setRatings(statsData.data.ratings || []);
          }
        } catch {}
      } catch {
        setError("Failed to load listing");
      }
      setLoading(false);
    }
    loadListing();
  }, [id]);

  const handlePlaceOrder = async () => {
    if (!listing) return;
    if (listing.quantity_available <= 0) {
      message.error("This item is no longer available.");
      return;
    }
    if (quantity > listing.quantity_available) {
      message.error(`Only ${listing.quantity_available} ${listing.unit} available.`);
      return;
    }

    setPlacing(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify({ listing_id: id, quantity }),
    });
    const data = await res.json();
    setPlacing(false);
    if (data.success) {
      message.success("🎉 Order placed! Proceed to payment.");
      router.push("/buyer/orders");
    } else {
      message.error(data.error || "Failed to place order");
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorDisplay message={error} />;
  if (!listing) return <ErrorDisplay message="Listing not found" />;

  const totalPrice = (listing.price_kes || 0) * quantity;

  return (
    <RoleGuard role="buyer">
      <div className="listing-detail slide-up">
        {/* Back */}
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ marginBottom: 12 }}>
          Back
        </Button>

        {/* Main card */}
        <Card className="detail-main-card">
          <div className="detail-layout">
            {/* Gallery */}
            <div className="detail-gallery">
              {listing.photos?.[0] ? (
                <div className="detail-main-image-wrap">
                  {isSupabaseImageUrl(listing.photos[0]) ? (
                    <Image src={listing.photos[0]} alt={listing.title} fill className="detail-main-image" unoptimized />
                  ) : (
                    <Image
                      src={listing.photos[0]}
                      alt={listing.title}
                      fill
                      className="detail-main-image"
                      sizes="(max-width: 640px) 100vw, 300px"
                    />
                  )}
                </div>
              ) : (
                <div className="detail-image-placeholder">
                  <span style={{ fontSize: 48 }}>📦</span>
                </div>
              )}
              {listing.photos && listing.photos.length > 1 && (
                <div className="detail-thumb-row">
                  {listing.photos.slice(0, 4).map((p, i) => (
                    isSupabaseImageUrl(p) ? (
                      <Image key={i} src={p} alt="" width={56} height={56} className="detail-thumb" unoptimized />
                    ) : (
                      <Image key={i} src={p} alt="" width={56} height={56} className="detail-thumb" />
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="detail-info">
              <Tag color={listing.status === "active" ? "green" : "red"} style={{ fontWeight: 600 }}>
                {listing.status?.toUpperCase()}
              </Tag>
              <Title level={2} style={{ marginTop: 8, fontWeight: 700 }}>
                {listing.title}
              </Title>

              <Title level={3} style={{ color: "#1a7a1a", margin: 0, fontWeight: 700 }}>
                KES {listing.price_kes?.toLocaleString()}
                <Text type="secondary" style={{ fontSize: 16, fontWeight: 400 }}>
                  {" "}/ {listing.unit}
                </Text>
              </Title>

              <Divider style={{ margin: "12px 0" }} />

              <Space direction="vertical" size="small">
                <div className="detail-meta-row">
                  <EnvironmentOutlined style={{ color: "#8a9a8a" }} />
                  <Text>{listing.location_county}{listing.location_ward ? `, ${listing.location_ward}` : ""}</Text>
                </div>
                <div className="detail-meta-row">
                  <UserOutlined style={{ color: "#8a9a8a" }} />
                  <Text>{listing.farmer?.full_name || "Unknown farmer"}</Text>
                </div>
                <div className="detail-meta-row">
                  <StarFilled style={{ color: "#faad14" }} />
                  <Text>
                    {stats?.avg_rating?.toFixed(1) || "N/A"} ({stats?.total_ratings || 0} ratings) · {stats?.total_orders || 0} orders
                  </Text>
                </div>
                <Tag color="green" style={{ fontSize: 13, padding: "4px 10px" }}>
                  Stock: {listing.quantity_available} {listing.unit}
                </Tag>
              </Space>
            </div>
          </div>
        </Card>

        {/* Description */}
        <Card title="📝 Description" className="detail-section-card">
          <Paragraph style={{ whiteSpace: "pre-wrap", margin: 0 }}>{listing.description}</Paragraph>
        </Card>

        {/* Place Order */}
        <Card title="🛒 Place Order" className="detail-section-card">
          <div className="order-row">
            <div className="order-qty">
              <Text style={{ fontSize: 13, color: "#5a6e5a" }}>Quantity ({listing.unit})</Text>
              <InputNumber
                min={1}
                max={listing.quantity_available}
                value={quantity}
                onChange={(v) => setQuantity(v || 1)}
                size="large"
                style={{ width: 100 }}
              />
            </div>
            <div className="order-total">
              <Text style={{ fontSize: 13, color: "#5a6e5a" }}>Total</Text>
              <Text strong style={{ fontSize: 20, color: "#1a7a1a" }}>
                KES {totalPrice.toLocaleString()}
              </Text>
            </div>
            <Space>
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={handlePlaceOrder}
                loading={placing}
                disabled={listing.quantity_available <= 0 || quantity > listing.quantity_available}
              >
                Order Now
              </Button>
              <Button
                size="large"
                icon={<ShoppingCartOutlined />}
                onClick={() => {
                  if (listing.quantity_available <= 0) {
                    message.error("This item is out of stock.");
                    return;
                  }
                  if (quantity > listing.quantity_available) {
                    message.error(`Only ${listing.quantity_available} ${listing.unit} available.`);
                    return;
                  }
                  addItem(listing.id, quantity);
                }}
                disabled={listing.quantity_available <= 0 || quantity > listing.quantity_available}
              >
                Add to Cart
              </Button>
            </Space>
          </div>
        </Card>

        {/* Ratings */}
        <Card
          title={`⭐ Ratings — ${listing.farmer?.full_name || "Farmer"}`}
          className="detail-section-card"
        >
          {ratings.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20 }}>
              <Text type="secondary">No ratings yet. Be the first!</Text>
            </div>
          ) : (
            <List
              dataSource={ratings.slice(0, 10)}
              renderItem={(r: RatingType) => (
                <List.Item>
                  <List.Item.Meta
                    title={<Rate disabled value={r.rating} style={{ fontSize: 14 }} />}
                    description={r.review || "No review"}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </Text>
                </List.Item>
              )}
            />
          )}
          <Button
            style={{ marginTop: 8 }}
            onClick={() => setShowRating(!showRating)}
            type={showRating ? "default" : "primary"}
            ghost
          >
            {showRating ? "Cancel" : "⭐ Rate this Farmer"}
          </Button>
          {showRating && (
            <div style={{ marginTop: 16, padding: 16, background: "#f8faf8", borderRadius: 10 }}>
              <RatingForm farmerId={listing.farmer_id} onRated={() => setShowRating(false)} />
            </div>
          )}
        </Card>
      </div>

      <style jsx>{`
        .listing-detail {
          max-width: 800px;
        }
        .detail-main-card,
        .detail-section-card {
          border-radius: 14px !important;
          margin-bottom: 14px;
        }
        .detail-layout {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        @media (min-width: 640px) {
          .detail-layout {
            flex-direction: row;
          }
        }
        .detail-gallery {
          flex-shrink: 0;
          width: 100%;
        }
        @media (min-width: 640px) {
          .detail-gallery {
            width: 300px;
          }
        }
        .detail-main-image-wrap {
          position: relative;
          width: 100%;
          height: 220px;
        }
        @media (min-width: 640px) {
          .detail-main-image-wrap {
            height: 240px;
          }
        }
        .detail-main-image {
          object-fit: cover;
          border-radius: 10px;
        }
        .detail-image-placeholder {
          width: 100%;
          height: 220px;
          background: #f0f4f0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .detail-thumb-row {
          display: flex;
          gap: 6px;
          margin-top: 6px;
        }
        .detail-thumb {
          width: 56px;
          height: 56px;
          object-fit: cover;
          border-radius: 6px;
          cursor: pointer;
          border: 2px solid transparent;
          transition: border-color 150ms ease;
        }
        .detail-thumb:hover {
          border-color: #1a7a1a;
        }
        .detail-info {
          flex: 1;
        }
        .detail-meta-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
        }
        .order-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
        }
        .order-qty,
        .order-total {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
      `}</style>
    </RoleGuard>
  );
}
