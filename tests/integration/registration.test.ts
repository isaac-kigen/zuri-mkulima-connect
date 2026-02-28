import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { registerUser } from "@/lib/services";
import { createSupabaseServiceClient } from "@/lib/supabase";

describe("Registration Flow - Profile Creation", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "SecurePass123";
  let userId: string;

  afterEach(async () => {
    // Cleanup: Delete test user and profile
    if (userId) {
      const supabase = createSupabaseServiceClient();
      
      // Delete from auth.users (which should cascade to profiles)
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) {
        console.warn("Cleanup warning: Could not delete auth user:", error.message);
      }
    }
  });

  it("should create a user account and profile entry on registration", async () => {
    const result = await registerUser({
      fullName: "Test User",
      email: testEmail,
      password: testPassword,
      role: "buyer",
      phone: "2547123456789",
      county: "Nakuru",
    });

    // Verify user was returned
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(testEmail);
    expect(result.user.fullName).toBe("Test User");
    expect(result.user.role).toBe("buyer");
    expect(result.user.phone).toBe("2547123456789");
    expect(result.user.county).toBe("Nakuru");

    userId = result.user.id;

    // Verify session was created
    expect(result.session).toBeDefined();
    expect(result.session.accessToken).toBeDefined();
    expect(result.session.refreshToken).toBeDefined();
  });

  it("should create a farmer profile with correct role", async () => {
    const farmerEmail = `farmer-${Date.now()}@example.com`;
    
    const result = await registerUser({
      fullName: "Farmer John",
      email: farmerEmail,
      password: testPassword,
      role: "farmer",
      county: "Kiambu",
    });

    userId = result.user.id;

    expect(result.user.role).toBe("farmer");
    expect(result.user.fullName).toBe("Farmer John");
    expect(result.user.email).toBe(farmerEmail);

    // Verify the profile exists in the database
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.role).toBe("farmer");
    expect(data.full_name).toBe("Farmer John");
  });

  it("should handle registration with optional fields", async () => {
    const minimalEmail = `minimal-${Date.now()}@example.com`;
    
    const result = await registerUser({
      fullName: "Minimal User",
      email: minimalEmail,
      password: testPassword,
      role: "buyer",
      // No phone or county provided
    });

    userId = result.user.id;

    expect(result.user.fullName).toBe("Minimal User");
    expect(result.user.phone).toBeNull();
    expect(result.user.county).toBeNull();
  });

  it("should create unique profile per registration", async () => {
    const user1Email = `unique1-${Date.now()}@example.com`;
    const user2Email = `unique2-${Date.now() + 1}@example.com`;
    
    const result1 = await registerUser({
      fullName: "User One",
      email: user1Email,
      password: testPassword,
      role: "buyer",
    });

    const result2 = await registerUser({
      fullName: "User Two",
      email: user2Email,
      password: testPassword,
      role: "farmer",
    });

    userId = result1.user.id;

    expect(result1.user.id).not.toBe(result2.user.id);
    expect(result1.user.email).not.toBe(result2.user.email);

    // Verify both profiles exist
    const supabase = createSupabaseServiceClient();
    
    const { data: profile1 } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", result1.user.id)
      .single();

    const { data: profile2 } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", result2.user.id)
      .single();

    expect(profile1).toBeDefined();
    expect(profile2).toBeDefined();
  });

  it("should reject duplicate email registration", async () => {
    const duplicateEmail = `duplicate-${Date.now()}@example.com`;
    
    // First registration
    const result1 = await registerUser({
      fullName: "First User",
      email: duplicateEmail,
      password: testPassword,
      role: "buyer",
    });

    userId = result1.user.id;

    // Try to register with same email
    expect(
      registerUser({
        fullName: "Second User",
        email: duplicateEmail,
        password: "DifferentPass123",
        role: "farmer",
      })
    ).rejects.toThrow();
  });

  it("should reject weak passwords", async () => {
    expect(
      registerUser({
        fullName: "Test User",
        email: `weak-${Date.now()}@example.com`,
        password: "weak",
        role: "buyer",
      })
    ).rejects.toThrow();
  });

  it("should reject invalid email format", async () => {
    expect(
      registerUser({
        fullName: "Test User",
        email: "invalid-email",
        password: testPassword,
        role: "buyer",
      })
    ).rejects.toThrow();
  });

  it("should reject invalid role", async () => {
    expect(
      registerUser({
        fullName: "Test User",
        email: `invalid-role-${Date.now()}@example.com`,
        password: testPassword,
        role: "admin" as any, // Admin role should not be allowed in registration
      })
    ).rejects.toThrow();
  });
});
