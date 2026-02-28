#!/usr/bin/env node

/**
 * Manual registration test script
 * Usage: source .env.local && node test-registration.mjs
 * This tests the full registration flow including profile creation
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔧 Environment Check:");
console.log(`✓ SUPABASE_URL: ${SUPABASE_URL ? "✓ Set" : "✗ Not set"}`);
console.log(`✓ SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? "✓ Set" : "✗ Not set"}`);
console.log(`✓ SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? "✓ Set" : "✗ Not set"}\n`);

const testEmail = `test-${Date.now()}@example.com`;
const testPassword = "SecureTest123";

async function testRegistration() {
  console.log("📝 Test Registration Payload:");
  const payload = {
    fullName: "Test User",
    email: testEmail,
    password: testPassword,
    role: "buyer",
    phone: "2547123456789",
    county: "Nakuru",
  };
  console.log(JSON.stringify(payload, null, 2));
  console.log("\n");

  try {
    // Test 1: Register user
    console.log("1️⃣  Registering user...");
    const registerResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        data: {
          full_name: payload.fullName,
          role: payload.role,
          phone: payload.phone,
          county: payload.county,
        },
      }),
    });

    const registerData = await registerResponse.json();
    if (!registerResponse.ok) {
      console.error("❌ Registration failed:", registerData);
      return;
    }

    const userId = registerData.user?.id;
    console.log(`✅ User created: ${userId}`);
    console.log(`✅ Email: ${registerData.user?.email}\n`);

    // Test 2: Wait a moment for trigger to create profile
    console.log("2️⃣  Waiting for profile trigger to create profile...");
    await new Promise((r) => setTimeout(r, 1000));

    // Test 3: Check if profile was created
    console.log("3️⃣  Checking profile in database...");

    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const profileData = await profileResponse.json();
    if (profileResponse.ok && profileData.length > 0) {
      const profile = profileData[0];
      console.log(`✅ Profile found in database`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Full Name: ${profile.full_name}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Role: ${profile.role}`);
      console.log(`   Phone: ${profile.phone}`);
      console.log(`   County: ${profile.county}`);
      console.log(`   Created At: ${profile.created_at}\n`);
    } else {
      console.error(
        `❌ Profile NOT found in database. Response:`,
        profileData
      );
      console.log("\n⚠️  This indicates the auth trigger is not working!\n");

      // Try to manually create the profile
      console.log(
        "4️⃣  Attempting manual profile fallback creation...\n"
      );
      const fallbackResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            id: userId,
            full_name: payload.fullName,
            email: payload.email,
            role: payload.role,
            phone: payload.phone,
            county: payload.county,
          }),
        }
      );

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        console.log(`✅ Manual profile creation succeeded`);
        console.log(JSON.stringify(fallbackData[0], null, 2));
      } else {
        const fallbackError = await fallbackResponse.json();
        console.error(
          `❌ Manual profile creation failed:`,
          fallbackError
        );
      }
    }

    // Test 4: Try to login with created account
    console.log("\n4️⃣  Testing login with created account...");
    const loginResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
        }),
      }
    );

    const loginData = await loginResponse.json();
    if (loginResponse.ok && loginData.access_token) {
      console.log(`✅ Login successful`);
      console.log(`   Access Token: ${loginData.access_token.substring(0, 20)}...`);
      console.log(`   User ID: ${loginData.user.id}\n`);
    } else {
      console.error(`❌ Login failed:`, loginData);
    }

    // Cleanup
    console.log("🧹 Cleaning up test user...");
    const deleteResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (deleteResponse.ok) {
      console.log(`✅ Test user deleted\n`);
    } else {
      console.warn(
        `⚠️  Could not delete test user. Manual cleanup may be needed.`
      );
    }

    console.log(
      "✅ Registration test completed!"
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testRegistration();
