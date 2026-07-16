"use client";

/**
 * Auth bridge — re-exports from the canonical @/context/AuthContext
 * with backward‑compatible API for legacy dashboard / signin / signup pages.
 */
export { AuthProvider } from "@/context/AuthContext";

import {
  useAuth as useAuthCtx,
} from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useMemo } from "react";
import type { UserType } from "@/types";

/**
 * Legacy hook — wraps the canonical useAuth() and adds the old‑style
 * `signin`, `signup`, `signout` actions and `user` shape.
 */
export function useAuth() {
  const ctx = useAuthCtx();
  /** Stabilize the Supabase client so it doesn't change on every render */
  const supabase = useMemo(() => createClient(), []);

  // Build old‑style user object
  const legacyUser = ctx.user
    ? {
        id: ctx.user.id,
        name: ctx.profile?.full_name ?? ctx.user.email ?? "",
        email: ctx.user.email ?? "",
        type: (ctx.profile?.role ?? "buyer") as UserType,
      }
    : null;

  const signin = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, [supabase]);

  const signup = useCallback(async (name: string, email: string, password: string, type: UserType) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: name,
        role: type,
      });
    }
  }, [supabase]);

  const signout = useCallback(async () => {
    await ctx.signOut();
  }, [ctx]);

  return {
    user: legacyUser,
    isAuthenticated: !!ctx.user && !ctx.loading,
    isLoading: ctx.loading,
    signin,
    signup,
    signout,
  };
}
