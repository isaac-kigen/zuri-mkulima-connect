"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Result, Button, Spin } from "antd";
import { UserRole } from "@/lib/db/types";

export default function RoleGuard({ role, children }: { role: UserRole | UserRole[]; children: React.ReactNode }) {
  const { profile, loading, user, refreshProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowedRoles = Array.isArray(role) ? role : [role];
  const [redirecting, setRedirecting] = useState(false);
  const profileLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileLoadStalled, setProfileLoadStalled] = useState(false);

  useEffect(() => {
    // Only redirect if loading is done AND both user and profile are null
    // (meaning truly not authenticated)
    if (!loading && !user && !profile) {
      setRedirecting(true);
      router.push("/login");
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (!loading && user && profile?.role === "farmer" && profile.vetting_status !== "approved" && pathname !== "/farmer/vetting") {
      refreshProfile();
    }
  }, [loading, user, profile?.role, profile?.vetting_status, pathname, refreshProfile]);

  // Safety: if user is authenticated but profile hasn't loaded after 8 seconds,
  // try refreshing once, then show a retry button
  useEffect(() => {
    if (user && !profile && !loading) {
      // Try a refresh immediately (the auth state change may have cleared it transiently)
      refreshProfile();

      profileLoadTimeoutRef.current = setTimeout(() => {
        setProfileLoadStalled(true);
      }, 8000);
    } else {
      if (profileLoadTimeoutRef.current) {
        clearTimeout(profileLoadTimeoutRef.current);
        profileLoadTimeoutRef.current = null;
      }
      setProfileLoadStalled(false);
    }

    return () => {
      if (profileLoadTimeoutRef.current) {
        clearTimeout(profileLoadTimeoutRef.current);
      }
    };
  }, [user, profile, loading, refreshProfile]);

  // Still loading initial auth state
  if (loading) return null;

  // User is authenticated but profile hasn't loaded yet — show spinner
  if (user && !profile) {
    if (profileLoadStalled) {
      return (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}>
          <Result
            status="warning"
            title="Profile Not Loaded"
            subTitle="Your profile is taking longer than expected to load. This may be a temporary issue."
            extra={
              <Button
                type="primary"
                onClick={async () => {
                  setProfileLoadStalled(false);
                  await refreshProfile();
                }}
              >
                Retry
              </Button>
            }
          />
        </div>
      );
    }

    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}>
        <Spin size="large" tip="Loading your profile…" />
      </div>
    );
  }

  // Truly not authenticated, redirecting
  if (!user && !profile) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}>
        <Spin size="large" tip="Redirecting to login…" />
      </div>
    );
  }

  if (!profile) return null;

  if (!allowedRoles.includes(profile.role)) {
    return (
      <Result
        status="403"
        title="Access Denied"
        subTitle="You don't have permission to view this page."
        extra={<Button type="primary" onClick={() => router.push("/")}>Go Home</Button>}
      />
    );
  }

  if (profile.role === "farmer" && profile.vetting_status !== "approved" && pathname !== "/farmer/vetting") {
    return (
      <Result
        status="warning"
        title="Farmer vetting required"
        subTitle="Your account must be approved before you can access the farmer dashboard."
        extra={
          <Button type="primary" onClick={() => router.push("/farmer/vetting")}>
            Go to vetting page
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
