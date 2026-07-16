/**
 * Get the CSRF token from cookie or meta tag.
 * The middleware sets a non-httpOnly cookie and exposes the token
 * via x-csrf-token response header.
 */
export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";

  // Try meta tag first (set by layout)
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) {
    const content = meta.getAttribute("content");
    if (content) return content;
  }

  // Fallback: read from cookie
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf-token="));
  return match ? match.split("=")[1] : "";
}

/**
 * Wrapper around fetch that includes CSRF token for state-changing requests.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});

  // Add CSRF token for state-changing methods
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const token = getCsrfToken();
    if (token) {
      headers.set("x-csrf-token", token);
    }
  }

  if (!headers.has("Content-Type") && method !== "GET") {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers });
}
