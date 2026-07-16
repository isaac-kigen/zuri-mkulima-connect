"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, UserRole } from "@/lib/db/types";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  isFarmer: boolean;
  isBuyer: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Called by login/register pages to immediately set profile from API response */
  setProfileFromLogin: (profileData: Profile) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  role: null,
  isAdmin: false,
  isFarmer: false,
  isBuyer: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  setProfileFromLogin: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  /** Stabilize the Supabase client so it doesn't change on every render */
  const supabase = useMemo(() => createClient(), []);
  const profileRef = useRef<Profile | null>(null);
  /** Track whether initial session check has completed */
  const initializedRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (data) {
        setProfile(data as Profile);
        profileRef.current = data as Profile;
      } else if (error) {
        console.warn("fetchProfile error:", error.message);
      }
    } catch (err) {
      console.warn("fetchProfile exception:", err);
    }
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    /** Timer used to debounce SIGNED_OUT → SIGNED_IN during token refresh */
    let signOutTimer: ReturnType<typeof setTimeout> | undefined;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      const u = session?.user || null;
      setUser(u);
      if (u) {
        await fetchProfile(u.id);
      }
      if (!cancelled) {
        setLoading(false);
        initializedRef.current = true;
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user || null;

      // During token refresh, Supabase may fire SIGNED_OUT then immediately
      // SIGNED_IN.  If we clear the profile on that transient SIGNED_OUT,
      // RoleGuard will show a never‑ending spinner.  Only clear the profile
      // when the user explicitly signs out (or the session is irrecoverable).
      if (event === "SIGNED_OUT") {
        // Clear any previous timer
        if (signOutTimer) clearTimeout(signOutTimer);
        // Delay clearing to allow a subsequent SIGNED_IN to cancel it
        signOutTimer = setTimeout(() => {
          if (cancelled) return;
          setUser(null);
          setProfile(null);
          profileRef.current = null;
        }, 400);
        return;
      }

      // Cancel any pending SIGNED_OUT timer — this is a real auth event
      if (signOutTimer) {
        clearTimeout(signOutTimer);
        signOutTimer = undefined;
      }

      setUser(u);
      if (u) {
        // Await is intentionally not used here to keep the callback synchronous,
        // but the profile ref guard in RoleGuard / downstream components will
        // re‑render once fetchProfile completes.
        fetchProfile(u.id);
      }
    });

    return () => {
      cancelled = true;
      if (signOutTimer) clearTimeout(signOutTimer);
      listener.subscription.unsubscribe();
    };
    // Run only once on mount — supabase client is now stable via useMemo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    profileRef.current = null;
  };

  const refreshProfile = async () => {
    // First check if we have profile from setProfileFromLogin
    if (profileRef.current) {
      setProfile(profileRef.current);
    }
    // Force a fresh session read so we pick up cookies set by server-side login
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user || user;
    if (currentUser) {
      await fetchProfile(currentUser.id);
      if (!user) setUser(currentUser);
    }
  };

  /** Directly set profile from API response — bypasses async fetchProfile */
  const setProfileFromLogin = (profileData: Profile) => {
    profileRef.current = profileData;
    setProfile(profileData);
  };

  const role = profile?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        role,
        isAdmin: role === "admin",
        isFarmer: role === "farmer",
        isBuyer: role === "buyer",
        signOut,
        refreshProfile,
        setProfileFromLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
