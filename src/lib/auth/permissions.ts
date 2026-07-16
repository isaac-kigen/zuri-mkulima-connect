// ============================================================
// Zuri Mkulima Connect - Permission Matrix
// Maps every action to allowed roles
// ============================================================

import { UserRole } from "@/lib/db/types";

type Action = string;

const permissions: Record<Action, UserRole[]> = {
  // Marketplace
  "marketplace:browse": ["farmer", "buyer", "admin"],
  "marketplace:filter": ["farmer", "buyer", "admin"],
  "marketplace:sort": ["farmer", "buyer", "admin"],
  "marketplace:view": ["farmer", "buyer", "admin"],
  "marketplace:create": ["farmer", "admin"],
  "marketplace:edit_own": ["farmer"],
  "marketplace:edit_any": ["admin"],
  "marketplace:status_own": ["farmer"],
  "marketplace:status_any": ["admin"],
  "marketplace:archive_own": ["farmer"],
  "marketplace:archive_any": ["admin"],
  "marketplace:upload_photos": ["farmer", "admin"],
  "marketplace:view_own_inactive": ["farmer"],
  "marketplace:view_all_status": ["admin"],

  // Orders
  "orders:place": ["buyer"],
  "orders:view_own_buyer": ["buyer"],
  "orders:view_own_farmer": ["farmer"],
  "orders:view_all": ["admin"],
  "orders:accept": ["farmer", "admin"],
  "orders:reject": ["farmer", "admin"],
  "orders:cancel": ["buyer", "admin"],
  "orders:view_details": ["farmer", "buyer", "admin"],

  // Payments
  "payments:initiate": ["buyer"],
  "payments:view_own": ["farmer", "buyer"],
  "payments:view_all": ["admin"],
  "payments:callback": [],

  // Profile
  "profile:register": ["farmer", "buyer"],
  "profile:login": ["farmer", "buyer", "admin"],
  "profile:view_own": ["farmer", "buyer", "admin"],
  "profile:edit_own": ["farmer", "buyer", "admin"],
  "profile:reset_password": ["farmer", "buyer", "admin"],

  // Dashboard
  "dashboard:view": ["farmer", "buyer", "admin"],

  // Notifications
  "notifications:view": ["farmer", "buyer", "admin"],
  "notifications:mark_read": ["farmer", "buyer", "admin"],

  // Ratings
  "ratings:create": ["buyer"],
  "ratings:view_own": ["farmer"],
  "ratings:view_stats": ["farmer", "buyer", "admin"],

  // Cart
  "cart:add": ["buyer"],
  "cart:view": ["buyer"],
  "cart:update": ["buyer"],
  "cart:remove": ["buyer"],

  // Complaints
  "complaints:file": ["farmer", "buyer"],
  "complaints:view_own": ["farmer", "buyer"],
  "complaints:view_all": ["admin"],
  "complaints:respond": ["admin"],
  "complaints:resolve": ["admin"],

  // Admin
  "admin:dashboard": ["admin"],
  "admin:view_users": ["admin"],
  "admin:suspend_user": ["admin"],
  "admin:reactivate_user": ["admin"],
  "admin:reports": ["admin"],
  "admin:audit_log": ["admin"],
  "admin:moderate_listings": ["admin"],
  "admin:moderate_orders": ["admin"],

  // Reports
  "reports:sales": ["admin"],
  "reports:platform_summary": ["admin"],
  "reports:payments": ["admin"],
  "reports:own_stats": ["farmer"],

  // System
  "system:health": ["farmer", "buyer", "admin"],
};

/**
 * Check if a role can perform an action.
 */
export function can(role: UserRole, action: Action): boolean {
  const allowed = permissions[action];
  if (!allowed) return false;
  return allowed.includes(role);
}

/**
 * Assert that a role can perform an action. Throws if not.
 */
export function assertCan(role: UserRole, action: Action): void {
  if (!can(role, action)) {
    throw new Error(`Permission denied: ${action}`);
  }
}

export { permissions };
