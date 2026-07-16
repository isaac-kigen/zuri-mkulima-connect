"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { CartItem } from "@/lib/db/types";
import { useAuth } from "./AuthContext";
import { message } from "antd";
import { getCsrfToken } from "@/lib/utils/csrf";

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addItem: (listingId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({
  items: [],
  loading: false,
  addItem: async () => {},
  updateQuantity: async () => {},
  removeItem: async () => {},
  refresh: async () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isBuyer } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  /** Stabilize the Supabase client so it doesn't change on every render */
  const supabase = useMemo(() => createClient(), []);
  /** Guard to prevent concurrent refresh calls */
  const refreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user || !isBuyer) return;
    if (refreshingRef.current) return; // skip if already refreshing
    refreshingRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select("*, listing:listings(*, farmer:profiles!listings_farmer_id_fkey(id, full_name, county))")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Cart refresh error:", error.message);
      }
      setItems((data as CartItem[]) || []);
    } catch (err) {
      console.warn("Cart refresh exception:", err);
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  }, [user, isBuyer, supabase]);

  useEffect(() => {
    if (isBuyer) {
      refresh();
    }
  }, [isBuyer, refresh]);

  const addItem = async (listingId: string, quantity = 1) => {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify({ listing_id: listingId, quantity }),
    });
    const data = await res.json();
    if (data.success) {
      message.success("Added to cart");
      refresh();
    } else {
      message.error(data.error || "Failed to add");
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    const res = await fetch(`/api/cart/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify({ quantity }),
    });
    const data = await res.json();
    if (!data.success) {
      message.error(data.error || "Failed to update quantity");
    }
    refresh();
  };

  const removeItem = async (itemId: string) => {
    await fetch(`/api/cart/${itemId}`, {
      method: "DELETE",
      headers: { "x-csrf-token": getCsrfToken() },
    });
    message.success("Removed from cart");
    refresh();
  };

  return (
    <CartContext.Provider value={{ items, loading, addItem, updateQuantity, removeItem, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
