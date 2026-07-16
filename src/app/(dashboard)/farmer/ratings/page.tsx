"use client";

import { Typography, Card, List, Rate, Spin, Empty } from "antd";
import { StarOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Rating as RatingType, FarmerStats } from "@/lib/db/types";
import RoleGuard from "@/components/shared/RoleGuard";
import { useAuth } from "@/context/AuthContext";

const { Title, Text } = Typography;

export default function FarmerRatings() {
  const { profile } = useAuth();
  const [ratings, setRatings] = useState<RatingType[]>([]);
  const [stats, setStats] = useState<FarmerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/ratings?farmer_id=${profile.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRatings(d.data.ratings || []);
          setStats(d.data.stats);
        }
        setLoading(false);
      });
  }, [profile]);

  return (
    <RoleGuard role="farmer">
      <div className="ratings-page slide-up">
        <Title level={2} style={{ fontWeight: 700 }}>
          <StarOutlined /> My Ratings & Reviews
        </Title>

        {/* Stats Card */}
        <Card className="stats-card">
          {loading ? (
            <Spin />
          ) : stats ? (
            <div className="stats-row">
              <div className="stat-item">
                <Text type="secondary">Average Rating</Text>
                <div className="stat-value">
                  <Rate disabled value={Math.round(stats.avg_rating || 0)} allowHalf style={{ fontSize: 16 }} />
                  <Text strong style={{ fontSize: 20, marginLeft: 8 }}>
                    {(stats.avg_rating || 0).toFixed(1)}
                  </Text>
                </div>
              </div>
              <div className="stat-item">
                <Text type="secondary">Total Reviews</Text>
                <Text strong style={{ fontSize: 20 }}>{stats.total_ratings}</Text>
              </div>
              <div className="stat-item">
                <Text type="secondary">Orders Completed</Text>
                <Text strong style={{ fontSize: 20 }}>{stats.total_orders}</Text>
              </div>
            </div>
          ) : (
            <Empty description="No stats available" />
          )}
        </Card>

        {/* Reviews List */}
        <Card title="Reviews" className="reviews-card">
          {loading ? (
            <Spin />
          ) : ratings.length === 0 ? (
            <Empty description="No ratings yet" />
          ) : (
            <List
              dataSource={ratings}
              renderItem={(r: RatingType) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <span>
                        <Rate disabled value={r.rating} style={{ fontSize: 14 }} />
                        <Text style={{ marginLeft: 8, fontSize: 13 }}>
                          by {r.buyer?.full_name || "Anonymous"}
                        </Text>
                      </span>
                    }
                    description={r.review || "No review text"}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </Text>
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>

      <style jsx>{`
        .ratings-page { max-width: 680px; }
        .stats-card {
          border-radius: 14px !important;
          margin-bottom: 14px;
        }
        .stats-row {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .stat-value {
          display: flex;
          align-items: center;
        }
        .reviews-card {
          border-radius: 14px !important;
        }
      `}</style>
    </RoleGuard>
  );
}
