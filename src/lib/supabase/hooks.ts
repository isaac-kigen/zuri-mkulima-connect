"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "./client";
import type { Database } from "./types";

type Table = keyof Database["public"]["Tables"];
type Row<T extends Table> = Database["public"]["Tables"][T]["Row"];

/**
 * Generic hook to fetch all rows from a table.
 * Re-fetches when filters change.
 */
export function useSupabaseQuery<T extends Table>(
  table: T,
  opts?: {
    column?: string;
    value?: string;
    limit?: number;
    orderBy?: string;
    ascending?: boolean;
  }
) {
  const supabase = createClient();
  const [data, setData] = useState<Row<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from(table).select("*");

    if (opts?.column && opts?.value) {
      query = query.eq(opts.column, opts.value);
    }
    if (opts?.orderBy) {
      query = query.order(opts.orderBy, {
        ascending: opts.ascending ?? false,
      });
    }
    if (opts?.limit) {
      query = query.limit(opts.limit);
    }

    const { data, error: err } = await query;

    if (err) setError(err.message);
    else setData((data as Row<T>[]) ?? []);

    setLoading(false);
  }, [supabase, table, opts?.column, opts?.value, opts?.limit, opts?.orderBy, opts?.ascending]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Hook for real-time subscriptions on a table.
 */
export function useSupabaseRealtime<T extends Table>(
  table: T,
  callback: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: Row<T> | null;
    old: Row<T> | null;
  }) => void
) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          callback({
            eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            new: payload.new as Row<T> | null,
            old: payload.old as Row<T> | null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, table, callback]);
}
