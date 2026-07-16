"use client";

import { Typography, Card, List, Tag, Button, Space, Empty } from "antd";
import { BellOutlined, CheckCircleOutlined } from "@ant-design/icons";
import RoleGuard from "@/components/shared/RoleGuard";
import { useNotifications } from "@/context/NotificationContext";
import Loading from "@/components/shared/Loading";
import { Notification } from "@/lib/db/types";

const { Title, Text } = Typography;

const typeColors: Record<string, string> = {
  order_new: "blue", order_accepted: "green", order_rejected: "red",
  order_cancelled: "orange", payment_completed: "green", payment_failed: "red",
  complaint_new: "red", complaint_updated: "blue", account_suspended: "red",
  account_reactivated: "green", payment_initiated: "gold", payment_received: "green",
  new_rating: "purple", listing_archived: "orange", listing_new: "geekblue",
  new_user: "cyan", complaint_against_you: "volcano",
};

export default function BuyerNotifications() {
  const { notifications, loading, markAsRead, markAllAsRead, refresh } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <RoleGuard role="buyer">
      <div className="notif-page slide-up">
        <div className="notif-header">
          <Title level={2} style={{ fontWeight: 700, margin: 0 }}>
            <BellOutlined /> Notifications
            {unreadCount > 0 && (
              <Tag color="red" style={{ marginLeft: 8, fontWeight: 600 }}>{unreadCount} new</Tag>
            )}
          </Title>
          <Space>
            <Button onClick={markAllAsRead} disabled={unreadCount === 0} icon={<CheckCircleOutlined />}>
              Mark All Read
            </Button>
            <Button onClick={refresh}>Refresh</Button>
          </Space>
        </div>

        <Card className="notif-card">
          {loading ? <Loading /> : notifications.length === 0 ? (
            <Empty description="No notifications yet" />
          ) : (
            <List
              dataSource={notifications}
              renderItem={(n: Notification) => (
                <List.Item
                  className={`notif-item ${!n.is_read ? "unread" : ""}`}
                  actions={[
                    !n.is_read && (
                      <Button size="small" key="read" onClick={() => markAsRead(n.id)}>
                        Mark Read
                      </Button>
                    ),
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space size={4}>
                        <Tag color={typeColors[n.notification_type] || "default"}>
                          {n.notification_type?.replace(/_/g, " ")}
                        </Tag>
                        <Text strong={!n.is_read}>{n.title}</Text>
                      </Space>
                    }
                    description={
                      <div>
                        <Text type="secondary" style={{ fontSize: 13 }}>{n.message}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {new Date(n.created_at).toLocaleString()}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>

      <style jsx>{`
        .notif-page { max-width: 720px; }
        .notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }
        .notif-card { border-radius: 14px !important; }
        .notif-item {
          padding: 10px 14px !important;
          border-radius: 10px !important;
          margin-bottom: 4px;
          transition: background 150ms ease;
        }
        .notif-item.unread {
          background: #f0f7ff;
          border-left: 3px solid #1a7a1a;
        }
        .notif-item:hover {
          background: #f8faf8;
        }
      `}</style>
    </RoleGuard>
  );
}
