import { createClient } from "@supabase/supabase-js";

import { AppError } from "@/lib/errors";

function isPlaceholder(value: string) {
  return (
    value.includes("YOUR_PROJECT_REF") ||
    value.includes("YOUR_SUPABASE_") ||
    value.includes("YOUR_")
  );
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    throw new AppError("Supabase configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.", {
      status: 500,
      code: "SUPABASE_CONFIG_ERROR",
    });
  }

  if (isPlaceholder(url) || isPlaceholder(anonKey)) {
    throw new AppError(
      "Supabase environment variables are placeholders. Update .env.local with real Supabase project values.",
      {
        status: 500,
        code: "SUPABASE_CONFIG_PLACEHOLDER",
      },
    );
  }

  return { url, anonKey, serviceRoleKey };
}

export function createSupabaseAnonClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createSupabaseServiceClient() {
  const { url, serviceRoleKey } = getSupabaseEnv();

  if (!serviceRoleKey) {
    throw new AppError("SUPABASE_SERVICE_ROLE_KEY is required for server operations.", {
      status: 500,
      code: "SUPABASE_CONFIG_ERROR",
    });
  }

  if (isPlaceholder(serviceRoleKey)) {
    throw new AppError(
      "SUPABASE_SERVICE_ROLE_KEY is a placeholder. Update .env.local with your real service role key.",
      {
        status: 500,
        code: "SUPABASE_CONFIG_PLACEHOLDER",
      },
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
