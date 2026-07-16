"use client";

import { Typography, List, Card, Button, Space, InputNumber, Popconfirm, message, Empty } from "antd";
import { ShoppingCartOutlined, DeleteOutlined, ShoppingOutlined, ArrowRightOutlined } from "@ant-design/icons";
import Image from "next/image";
import RoleGuard from "@/components/shared/RoleGuard";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { CartItem } from "@/lib/db/types";
import { getCsrfToken } from "@/lib/utils/csrf";

function isSupabaseImageUrl(url: string) {
  return /supabase\.co\/storage/.test(url);
}

const { Title, Text } = Typography;

export default function CartPage() {
  const { items, loading, updateQuantity, removeItem } = useCart();
  const router = useRouter();

  const total = items.reduce((sum, item) => sum + (item.listing?.price_kes || 0) * item.quantity, 0);

  const handleCheckout = async () => {
    let successCount = 0;
    for (const item of items) {
      if (!item.listing) {
        message.error(`Skipping unknown item in cart`);
        continue;
      }

      if (item.listing.status !== "active" || item.listing.quantity_available <= 0) {
        message.error(`${item.listing.title} is no longer available. Please remove it from your cart.`);
        return;
      }

      if (item.quantity <= 0 || item.quantity > item.listing.quantity_available) {
        message.error(`Only ${item.listing.quantity_available} ${item.listing.unit} available for ${item.listing.title}. Please update your cart.`);
        return;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
        body: JSON.stringify({ listing_id: item.listing_id, quantity: item.quantity }),
      });
      const data = await res.json();
      if (data.success) {
        removeItem(item.id);
        successCount += 1;
      } else {
        message.error(`Failed for ${item.listing.title}: ${data.error}`);
      }
    }

    if (successCount > 0) {
      message.success("✅ Orders placed! Go to My Orders to pay.");
      router.push("/buyer/orders");
    }
  };

  return (
    <RoleGuard role="buyer">
      <div className="cart-page slide-up">
        <Title level={2} style={{ fontWeight: 700 }}>
          <ShoppingCartOutlined /> My Cart ({items.length})
        </Title>

        {items.length === 0 ? (
          <Card className="empty-cart-card">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Your cart is empty"
            >
              <Button type="primary" size="large" onClick={() => router.push("/buyer/marketplace")}>
                Browse Marketplace <ArrowRightOutlined />
              </Button>
            </Empty>
          </Card>
        ) : (
          <>
            <List
              loading={loading}
              dataSource={items}
              renderItem={(item: CartItem) => {
                const photoUrl = item.listing?.photos?.[0];
                const itemTotal = (item.listing?.price_kes || 0) * item.quantity;
                return (
                  <Card className="cart-item-card" key={item.id}>
                    <div className="cart-item">
                      {/* Image */}
                      <div className="cart-item-img-wrap">
                        {photoUrl ? (
                          isSupabaseImageUrl(photoUrl) ? (
                            <Image src={photoUrl} alt="" width={56} height={56} className="cart-item-img" unoptimized />
                          ) : (
                            <Image src={photoUrl} alt="" width={56} height={56} className="cart-item-img" />
                          )
                        ) : (
                          <div className="cart-item-img-placeholder">📦</div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="cart-item-details">
                        <Text strong className="cart-item-title">{item.listing?.title || "Unknown"}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          KES {(item.listing?.price_kes || 0).toLocaleString()} / {item.listing?.unit}
                        </Text>
                      </div>

                      {/* Quantity */}
                      <div className="cart-item-qty">
                        <InputNumber
                          min={1}
                          max={item.listing?.quantity_available || 1}
                          value={item.quantity}
                          onChange={(v) => updateQuantity(item.id, Math.min(item.listing?.quantity_available || 1, v || 1))}
                          style={{ width: 60 }}
                          size="small"
                        />
                      </div>

                      {/* Total & Remove */}
                      <div className="cart-item-total">
                        <Text strong style={{ color: "#1a7a1a", fontSize: 14 }}>
                          KES {itemTotal.toLocaleString()}
                        </Text>
                        <Popconfirm title="Remove?" onConfirm={() => removeItem(item.id)}>
                          <Button danger type="text" icon={<DeleteOutlined />} size="small" />
                        </Popconfirm>
                      </div>
                    </div>
                  </Card>
                );
              }}
            />

            {/* Checkout */}
            <Card className="checkout-card">
              <div className="checkout-row">
                <div>
                  <Text type="secondary">Total</Text>
                  <Title level={3} style={{ margin: 0, color: "#1a7a1a" }}>
                    KES {total.toLocaleString()}
                  </Title>
                </div>
                <Space>
                  <Button onClick={() => router.push("/buyer/marketplace")}>
                    Continue Shopping
                  </Button>
                  <Button type="primary" size="large" icon={<ShoppingOutlined />} onClick={handleCheckout}>
                    Checkout All
                  </Button>
                </Space>
              </div>
            </Card>
          </>
        )}
      </div>

      <style jsx>{`
        .cart-page {
          max-width: 680px;
          animation: slideUp 300ms ease forwards;
        }

        .empty-cart-card {
          border-radius: var(--radius-xl) !important;
          text-align: center;
          padding: 32px !important;
          border: 1px solid var(--color-border) !important;
          background: var(--color-surface) !important;
        }

        .cart-item-card {
          border-radius: var(--radius-lg) !important;
          margin-bottom: 12px !important;
          border: 1px solid var(--color-border) !important;
          transition: all var(--transition) !important;
          background: var(--color-surface) !important;
        }

        .cart-item-card:hover {
          box-shadow: var(--shadow-sm) !important;
        }

        .cart-item {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 12px;
        }

        @media (min-width: 768px) {
          .cart-item {
            gap: 16px;
            padding: 14px;
          }
        }

        .cart-item-img-wrap {
          width: 60px;
          height: 60px;
          flex-shrink: 0;
          border-radius: var(--radius) !important;
          overflow: hidden;
          background: var(--color-bg);
        }

        .cart-item-img {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: var(--radius) !important;
        }

        .cart-item-img-placeholder {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, var(--color-bg-alt), var(--color-primary-50));
          border-radius: var(--radius) !important;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .cart-item-details {
          flex: 1;
          min-width: 140px;
        }

        .cart-item-title {
          display: block;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.3;
          color: var(--color-text) !important;
        }

        .cart-item-qty {
          flex-shrink: 0;
        }

        .cart-item-total {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .checkout-card {
          margin-top: 20px;
          border-radius: var(--radius-xl) !important;
          background: linear-gradient(135deg, var(--color-primary-50), var(--color-bg-alt)) !important;
          border: 1px solid var(--color-primary-100) !important;
          padding: 18px !important;
        }

        .checkout-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        @media (max-width: 480px) {
          .checkout-row {
            flex-direction: column;
            align-items: stretch;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </RoleGuard>
  );
}
