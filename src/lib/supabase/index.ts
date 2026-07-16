// ── Supabase Clients ─────────────────────────────────────────────────────────
export { createClient as createBrowserClient } from "./client";
export { createClient as createServerClient } from "./server";
export { updateSession } from "./middleware";

// ── Hooks ────────────────────────────────────────────────────────────────────
export { useSupabaseQuery, useSupabaseRealtime } from "./hooks";

// ── Types ────────────────────────────────────────────────────────────────────
export type { Database } from "./types";
