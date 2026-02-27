import { AppError } from "@/lib/errors";

interface SupabaseRequestOptions {
  serviceRole?: boolean;
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) {
    throw new AppError("Supabase environment variables are missing.", {
      status: 500,
      code: "SUPABASE_CONFIG_ERROR",
    });
  }

  return { url, anon, service };
}

function buildHeaders(options?: SupabaseRequestOptions) {
  const { anon, service } = getSupabaseConfig();
  const apiKey = options?.serviceRole ? service : anon;

  if (!apiKey) {
    throw new AppError("Missing Supabase service role key.", {
      status: 500,
      code: "SUPABASE_CONFIG_ERROR",
    });
  }

  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export async function supabaseRpc<T>(
  fnName: string,
  payload: Record<string, unknown>,
  options?: SupabaseRequestOptions,
): Promise<T> {
  const { url } = getSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/rpc/${fnName}`, {
    method: "POST",
    headers: buildHeaders(options),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(`Supabase RPC failed: ${fnName}`, {
      status: response.status,
      code: "SUPABASE_RPC_ERROR",
      details: { response: text },
    });
  }

  return (await response.json()) as T;
}
