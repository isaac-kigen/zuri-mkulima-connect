"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Notification } from "@/lib/db/types";
import { useAuth } from "./AuthContext";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refresh: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  /** Stabilize the Supabase client so it doesn't change on every render */
  const supabase = useMemo(() => createClient(), []);
  const refreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.warn("Notifications refresh error:", error.message);
      }
      setNotifications((data as Notification[]) || []);
    } catch (err) {
      console.warn("Notifications refresh exception:", err);
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user) {
      refresh();
      const interval = setInterval(refresh, 30_000);
      return () => clearInterval(interval);
    }
  }, [user, refresh]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllAsRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user?.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
