"use client";

import { Typography, Row, Col, Card, Space, Button, Spin } from "antd";
import {
  ShopOutlined,
  DollarOutlined,
  SafetyOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  StarFilled,
  EnvironmentOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Listing } from "@/lib/db/types";
import ListingGrid from "@/components/marketplace/ListingGrid";
import ListingFilters from "@/components/marketplace/ListingFilters";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const { Title, Paragraph } = Typography;

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState<Listing[]>([]);
  const { user } = useAuth();
  const router = useRouter();

  const fetchListings = async (filters: any = {}) => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, String(v)); });
    params.set("limit", "12");
    const res = await fetch(`/api/marketplace?${params}`);
    const data = await res.json();
    setListings(data.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchListings();
  }, []);

  return (
    <div className="fade-in">
      {/* ============ HERO SECTION ============ */}
      <section className="hero-section">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-badge">
            <ThunderboltOutlined /> Kenya&apos;s #1 Agri-Marketplace
          </div>
          <Title level={1} className="hero-title">
            Connecting Farmers<br />
            <span className="hero-highlight">Directly to Buyers</span>
          </Title>
          <Paragraph className="hero-subtitle">
            Fresh produce from verified Kenyan farmers, delivered with trust.
            Powered by <strong>M-Pesa</strong> for instant, secure payments.
          </Paragraph>
          <Space size="small" wrap className="hero-actions">
            {!user && (
              <>
                <Button type="primary" size="large" onClick={() => router.push("/register")}>
                  Get Started Free <ArrowRightOutlined />
                </Button>
                <Button size="large" onClick={() => router.push("/login")}>
                  I have an account
                </Button>
              </>
            )}
            {user && (
              <Button type="primary" size="large" onClick={() => router.push(`/${user.app_metadata?.role || "buyer"}/dashboard`)}>
                Go to Dashboard <ArrowRightOutlined />
              </Button>
            )}
          </Space>

          {/* Stats row */}
          <Row gutter={[16, 12]} className="hero-stats" justify="center">
            <Col xs={8} sm={8} md={4}>
              <div className="hero-stat">
                <span className="hero-stat-number">500+</span>
                <span className="hero-stat-label">Farmers</span>
              </div>
            </Col>
            <Col xs={8} sm={8} md={4}>
              <div className="hero-stat">
                <span className="hero-stat-number">2,000+</span>
                <span className="hero-stat-label">Listings</span>
              </div>
            </Col>
            <Col xs={8} sm={8} md={4}>
              <div className="hero-stat">
                <span className="hero-stat-number">10K+</span>
                <span className="hero-stat-label">Orders</span>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* ============ FEATURE CARDS ============ */}
      <section style={{ padding: "12px 0 32px" }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8}>
            <Card className="feature-card">
              <div className="feature-icon fresh">
                <ShopOutlined />
              </div>
              <Title level={4} className="feature-title">Fresh Produce</Title>
              <Paragraph type="secondary" className="feature-desc">
                Buy farm-fresh produce directly from verified Kenyan farmers. No middlemen, better prices.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card className="feature-card">
              <div className="feature-icon pay">
                <DollarOutlined />
              </div>
              <Title level={4} className="feature-title">M-Pesa Payments</Title>
              <Paragraph type="secondary" className="feature-desc">
                Pay securely with M-Pesa. Instant confirmation, no hidden fees, trusted by millions of Kenyans.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Card className="feature-card">
              <div className="feature-icon trust">
                <SafetyOutlined />
              </div>
              <Title level={4} className="feature-title">Verified Farmers</Title>
              <Paragraph type="secondary" className="feature-desc">
                Every farmer is verified with ratings and reviews. Buy with confidence from trusted sellers.
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </section>

      {/* ============ MARKETPLACE ============ */}
      <section>
        <div className="section-header">
          <Title level={3} className="section-heading">
            <ShopOutlined /> Latest Marketplace Listings
          </Title>
          {!user && (
            <Button type="link" onClick={() => router.push("/register")}>
              View All <ArrowRightOutlined />
            </Button>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <ListingFilters onFilter={fetchListings} />
        </div>

        <ListingGrid listings={listings} loading={loading} viewMode="buyer" />
      </section>

      {/* ============ CTA ============ */}
      {!user && (
        <section className="cta-section">
          <Card className="cta-card">
            <Title level={3} style={{ color: "#fff", marginBottom: 8 }}>
              Ready to Get Started?
            </Title>
            <Paragraph style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, marginBottom: 20 }}>
              Join thousands of Kenyan farmers and buyers already trading on Zuri Mkulima Connect.
            </Paragraph>
            <Button
              type="primary"
              size="large"
              onClick={() => router.push("/register")}
              style={{
                background: "#fff",
                color: "#1a7a1a",
                borderColor: "#fff",
                fontWeight: 600,
              }}
            >
              Create Free Account <ArrowRightOutlined />
            </Button>
          </Card>
        </section>
      )}

      {/* Inline styles */}
      <style jsx>{`
        /* HERO */
        .hero-section {
          position: relative;
          padding: 28px 0 24px;
          text-align: center;
          overflow: hidden;
          margin: -12px -12px 0;
          border-radius: 0 0 20px 20px;
          background: linear-gradient(135deg, #e8f5e8 0%, #f0faf0 30%, #e6f0e6 100%);
        }
        @media (min-width: 480px) {
          .hero-section {
            padding: 40px 0 32px;
          }
        }
        @media (min-width: 768px) {
          .hero-section {
            padding: 56px 0 40px;
            margin: -24px -24px 0;
            border-radius: 0 0 32px 32px;
          }
        }
        @media (min-width: 1024px) {
          .hero-section {
            padding: 72px 0 48px;
          }
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 20% 50%, rgba(26,122,26,0.06) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 30%, rgba(26,122,26,0.04) 0%, transparent 50%);
          pointer-events: none;
        }
        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 640px;
          margin: 0 auto;
          padding: 0 16px;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(26,122,26,0.1);
          color: #1a7a1a;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        @media (min-width: 480px) {
          .hero-badge {
            font-size: 12px;
            padding: 6px 14px;
          }
        }
        @media (min-width: 768px) {
          .hero-badge {
            font-size: 13px;
            padding: 8px 18px;
            margin-bottom: 16px;
          }
        }
        .hero-title {
          font-size: 22px !important;
          font-weight: 800 !important;
          line-height: 1.2 !important;
          color: #1a2e1a !important;
          margin-bottom: 10px !important;
        }
        @media (min-width: 480px) {
          .hero-title {
            font-size: 28px !important;
          }
        }
        @media (min-width: 768px) {
          .hero-title {
            font-size: 38px !important;
            margin-bottom: 12px !important;
          }
        }
        @media (min-width: 1024px) {
          .hero-title {
            font-size: 42px !important;
          }
        }
        .hero-highlight {
          color: #1a7a1a;
          position: relative;
        }
        .hero-subtitle {
          font-size: 13px !important;
          color: #5a6e5a !important;
          max-width: 480px;
          margin: 0 auto 16px !important;
          line-height: 1.5 !important;
        }
        @media (min-width: 480px) {
          .hero-subtitle {
            font-size: 14px !important;
            margin-bottom: 20px !important;
          }
        }
        @media (min-width: 768px) {
          .hero-subtitle {
            font-size: 16px !important;
            margin-bottom: 28px !important;
            line-height: 1.6 !important;
          }
        }
        .hero-actions {
          margin-bottom: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }
        @media (min-width: 768px) {
          .hero-actions {
            margin-bottom: 24px;
          }
        }
        .hero-stats {
          justify-content: center;
          max-width: 420px;
          margin: 0 auto;
        }
        .hero-stat {
          text-align: center;
        }
        .hero-stat-number {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #1a7a1a;
        }
        @media (min-width: 480px) {
          .hero-stat-number {
            font-size: 20px;
          }
        }
        @media (min-width: 768px) {
          .hero-stat-number {
            font-size: 24px;
          }
        }
        .hero-stat-label {
          font-size: 10px;
          color: #8a9a8a;
          font-weight: 500;
        }
        @media (min-width: 480px) {
          .hero-stat-label {
            font-size: 11px;
          }
        }

        /* FEATURE CARDS */
        .feature-card {
          text-align: center;
          padding: 4px;
          border: 1px solid #e2e8e0;
          height: 100%;
        }
        @media (min-width: 768px) {
          .feature-card {
            padding: 8px;
          }
        }
        .feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin: 0 auto 10px;
        }
        @media (min-width: 480px) {
          .feature-icon {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            font-size: 22px;
          }
        }
        @media (min-width: 768px) {
          .feature-icon {
            margin-bottom: 12px;
          }
        }
        .feature-icon.fresh {
          background: #e6f4e6;
          color: #1a7a1a;
        }
        .feature-icon.pay {
          background: #e8f0fe;
          color: #2563eb;
        }
        .feature-icon.trust {
          background: #fef3e2;
          color: #d97706;
        }
        .feature-title {
          font-size: 14px !important;
          font-weight: 600 !important;
          margin-bottom: 4px !important;
        }
        @media (min-width: 768px) {
          .feature-title {
            font-size: 15px !important;
          }
        }
        .feature-desc {
          font-size: 12px !important;
          line-height: 1.5 !important;
        }
        @media (min-width: 480px) {
          .feature-desc {
            font-size: 13px !important;
          }
        }

        /* SECTION HEADER */
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        @media (min-width: 768px) {
          .section-header {
            margin-bottom: 16px;
          }
        }

        /* CTA */
        .cta-section {
          padding: 24px 0 36px;
        }
        @media (min-width: 480px) {
          .cta-section {
            padding: 28px 0 40px;
          }
        }
        @media (min-width: 768px) {
          .cta-section {
            padding: 40px 0 48px;
          }
        }
        .cta-card {
          background: linear-gradient(135deg, #1a7a1a, #2e9e2e) !important;
          text-align: center;
          border: none !important;
          border-radius: 14px !important;
          padding: 8px;
        }
        @media (min-width: 480px) {
          .cta-card {
            border-radius: 16px !important;
          }
        }
        @media (min-width: 768px) {
          .cta-card {
            border-radius: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
