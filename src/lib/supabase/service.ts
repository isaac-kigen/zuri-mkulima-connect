import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role client that bypasses RLS.
 * Used for server-side operations like creating notifications for other users.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for service-role operations");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}
