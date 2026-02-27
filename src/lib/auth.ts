import type { Session } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { AppError, assertOrThrow } from "@/lib/errors";
import { createSupabaseAnonClient, createSupabaseServiceClient } from "@/lib/supabase";
import type { PublicUser, Role } from "@/lib/types";
import { cleanText } from "@/lib/utils";

export const ACCESS_TOKEN_COOKIE = "mk_access_token";
export const REFRESH_TOKEN_COOKIE = "mk_refresh_token";

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  phone: string | null;
  county: string | null;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
};

export interface AuthSessionPayload {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface AuthLoginResult {
  user: PublicUser;
  session: AuthSessionPayload;
}

function toPublicUser(profile: ProfileRow): PublicUser {
  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: profile.role,
    phone: profile.phone,
    county: profile.county,
    isSuspended: profile.is_suspended,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function normalizeRole(value: unknown): Role {
  const role = typeof value === "string" ? value.trim().toLowerCase() : value;
  if (role === "admin" || role === "farmer" || role === "buyer") {
    return role;
  }
  if (role === "producer") {
    return "farmer";
  }
  if (role === "customer") {
    return "buyer";
  }

  return "buyer";
}

function normalizePhone(value: string | null | undefined) {
  const raw = cleanText(value ?? "").replace(/\s+/g, "");
  if (!raw) {
    return null;
  }

  // Convert common local formats to 2547XXXXXXXX
  const normalized =
    raw.startsWith("+254") ? `254${raw.slice(4)}` :
      raw.startsWith("07") ? `254${raw.slice(1)}` :
        raw;

  if (/^2547\d{8}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

function normalizeCounty(value: string | null | undefined) {
  const county = cleanText(value ?? "");
  return county || null;
}

function normalizeDisplayName(value: string | null | undefined, email: string) {
  const fallback = email.split("@")[0] || "user";
  const name = cleanText(value ?? "") || fallback;
  return name.slice(0, 120);
}

function normalizeEmail(value: string | null | undefined) {
  const email = cleanText(value ?? "").toLowerCase();
  if (/^\S+@\S+\.\S+$/.test(email)) {
    return email;
  }
  return null;
}

async function provisionMissingProfile(input: {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  role?: unknown;
  phone?: string | null;
  county?: string | null;
}) {
  const email = cleanText(input.email ?? "").toLowerCase();
  const normalizedEmail = normalizeEmail(email);
  assertOrThrow(normalizedEmail, "Email is required to provision profile.", {
    status: 500,
    code: "PROFILE_PROVISION_ERROR",
  });

  const fullName = normalizeDisplayName(input.fullName, normalizedEmail);
  const role = normalizeRole(input.role);
  const phone = normalizePhone(input.phone);
  const county = normalizeCounty(input.county);

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: input.userId,
        full_name: fullName,
        email: normalizedEmail,
        role,
        phone,
        county,
      },
      { onConflict: "id" },
    );

  if (error) {
    console.error("Profile provision failed", {
      message: error.message,
      code: error.code,
      hint: error.hint,
      details: error.details,
      userId: input.userId,
      email,
    });
    throw new AppError("Failed to provision missing user profile.", {
      status: 500,
      code: "PROFILE_PROVISION_ERROR",
      details: {
        message: error.message,
        code: error.code,
        hint: error.hint,
        raw: error.details,
      },
    });
  }
}

function extractSessionPayload(session: Session): AuthSessionPayload {
  assertOrThrow(session.access_token && session.refresh_token, "Invalid Supabase auth session.", {
    status: 401,
    code: "INVALID_SESSION",
  });

  const expiresAt = session.expires_at
    ? new Date(session.expires_at * 1000).toISOString()
    : new Date(Date.now() + 1000 * 60 * 60).toISOString();

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt,
  };
}

async function getProfileById(id: string): Promise<PublicUser | null> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, phone, county, is_suspended, created_at, updated_at")
    .eq("id", id)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new AppError("Failed to load user profile.", {
      status: 500,
      code: "SUPABASE_QUERY_ERROR",
      details: { message: error.message },
    });
  }

  return data ? toPublicUser(data) : null;
}

async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  return {
    accessToken,
    refreshToken,
  };
}

export async function createSession(session: AuthSessionPayload) {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, session.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, session.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export function isPasswordStrong(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

export async function findUserByEmail(email: string) {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, phone, county, is_suspended, created_at, updated_at")
    .ilike("email", email.trim())
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new AppError("Failed to query user by email.", {
      status: 500,
      code: "SUPABASE_QUERY_ERROR",
      details: { message: error.message },
    });
  }

  return data ? toPublicUser(data) : null;
}

export async function validateCredentials(
  email: string,
  password: string,
): Promise<AuthLoginResult | null> {
  const supabase = createSupabaseAnonClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.user || !data.session) {
    return null;
  }

  const profile = await getProfileById(data.user.id);
  if (!profile) {
    const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    await provisionMissingProfile({
      userId: data.user.id,
      email: data.user.email,
      fullName: typeof meta.full_name === "string" ? meta.full_name : null,
      role: meta.role,
      phone: typeof meta.phone === "string" ? meta.phone : null,
      county: typeof meta.county === "string" ? meta.county : null,
    });
  }

  const resolvedProfile = (await getProfileById(data.user.id)) ?? null;
  if (!resolvedProfile) {
    throw new AppError("User profile not found. Complete onboarding first.", {
      status: 404,
      code: "PROFILE_NOT_FOUND",
    });
  }

  return {
    user: resolvedProfile,
    session: extractSessionPayload(data.session),
  };
}

async function refreshAuthSession(refreshToken: string): Promise<AuthSessionPayload | null> {
  const supabase = createSupabaseAnonClient();

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return null;
  }

  const payload = extractSessionPayload(data.session);
  await createSession(payload);
  return payload;
}

export async function getCurrentUser() {
  const { accessToken, refreshToken } = await getSessionFromCookies();

  if (!accessToken && !refreshToken) {
    return null;
  }

  const supabase = createSupabaseAnonClient();

  let effectiveAccessToken = accessToken;
  let userId: string | null = null;

  if (effectiveAccessToken) {
    const { data, error } = await supabase.auth.getUser(effectiveAccessToken);
    if (!error && data.user) {
      userId = data.user.id;
    }
  }

  if (!userId && refreshToken) {
    const refreshed = await refreshAuthSession(refreshToken);
    if (!refreshed) {
      await destroySession();
      return null;
    }

    effectiveAccessToken = refreshed.accessToken;
    const { data, error } = await supabase.auth.getUser(effectiveAccessToken);
    if (!error && data.user) {
      userId = data.user.id;
    }
  }

  if (!userId) {
    await destroySession();
    return null;
  }

  const user = await getProfileById(userId);
  if (!user) {
    const { data, error } = await supabase.auth.getUser(effectiveAccessToken ?? "");
    if (!error && data.user) {
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      await provisionMissingProfile({
        userId: data.user.id,
        email: data.user.email,
        fullName: typeof meta.full_name === "string" ? meta.full_name : null,
        role: meta.role,
        phone: typeof meta.phone === "string" ? meta.phone : null,
        county: typeof meta.county === "string" ? meta.county : null,
      });
      const recovered = await getProfileById(data.user.id);
      if (recovered) {
        return recovered;
      }
    }

    await destroySession();
    return null;
  }

  return user;
}

export async function requireUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError("Authentication required.", {
      status: 401,
      code: "AUTH_REQUIRED",
    });
  }

  assertOrThrow(!user.isSuspended, "Account is suspended.", {
    status: 403,
    code: "ACCOUNT_SUSPENDED",
  });

  if (roles?.length) {
    assertOrThrow(roles.includes(user.role), "Insufficient permissions.", {
      status: 403,
      code: "FORBIDDEN",
    });
  }

  return user;
}

export async function requestPasswordReset(email: string, redirectTo?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  assertOrThrow(/^\S+@\S+\.\S+$/.test(normalizedEmail), "Email is required.", {
    status: 400,
    code: "VALIDATION_ERROR",
  });

  const supabase = createSupabaseAnonClient();
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    throw new AppError("Failed to request password reset.", {
      status: 500,
      code: "AUTH_RESET_PASSWORD_ERROR",
      details: { message: error.message },
    });
  }
}
