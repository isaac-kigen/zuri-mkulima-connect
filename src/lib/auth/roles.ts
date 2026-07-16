import { type UserRole } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Get current authenticated user's profile from Supabase.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
}

/**
 * Get the full profile + role for the current user.
 */
export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Require authentication — throw if not logged in.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Profile not found");
  if (profile.is_suspended) throw new Error("Account suspended");
  return { user, profile };
}

/**
 * Require specific role(s).
 */
export async function requireRole(...roles: UserRole[]) {
  const { user, profile } = await requireAuth();
  if (!roles.includes(profile.role)) {
    throw new Error("Insufficient permissions");
  }
  return { user, profile };
}

/**
 * Notify users — inserts notification into DB.
 * Uses the service-role client to bypass RLS (so we can insert for any user).
 */
export async function createNotification(
  supabase: any,
  userId: string,
  title: string,
  message: string,
  type: string,
  referenceId?: string
) {
  const serviceClient = createServiceClient();
  await serviceClient.from("notifications").insert({
    user_id: userId,
    title,
    message,
    notification_type: type,
    reference_id: referenceId || null,
  });
}

/**
 * Write to audit log.
 * Uses the service-role client to bypass RLS.
 */
export async function writeAuditLog(
  supabase: any,
  actorId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  details?: any,
  ipAddress?: string
) {
  const serviceClient = createServiceClient();
  await serviceClient.from("audit_log").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    details: details || null,
    ip_address: ipAddress || null,
  });
}
