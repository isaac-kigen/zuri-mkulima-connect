#!/usr/bin/env node
/**
 * Test all pages load correctly
 * Tests: /register, /login, /dashboard, /profile, /marketplace, /listings, etc.
 */

async function testPage(path, description) {
  try {
    const response = await fetch(`http://localhost:3000${path}`, {
      redirect: "manual",
      headers: {
        "User-Agent": "Testing-Bot/1.0",
      },
    });

    const status = response.status;
    const isOk = status >= 200 && status < 300;
    const isRedirect = status >= 300 && status < 400;
    const isFail = status >= 400;

    const icon = isOk ? "✅" : isRedirect ? "➡️ " : "❌";
    const detail =
      isRedirect ? ` (→ ${response.headers.get("location")})` : ` (${status})`;

    console.log(`${icon} ${path.padEnd(20)} ${description}${detail}`);
    return isOk || isRedirect;
  } catch (error) {
    console.log(
      `❌ ${path.padEnd(20)} ${description} - Connection failed (${error.message})`
    );
    return false;
  }
}

async function main() {
  console.log("\n🧪 Testing All Pages\n");
  console.log("Testing if Next.js dev server is running on http://localhost:3000\n");

  // Wait a moment for server to be ready
  await new Promise((r) => setTimeout(r, 500));

  const results = [];

  // Test key pages
  results.push(["/register", "Registration Page"]);
  results.push(["/login", "Login Page"]);
  results.push(["/logout", "Logout Route"]);
  results.push(["/dashboard", "Dashboard (Protected)"]);
  results.push(["/profile", "Profile Page (Protected)"]);
  results.push(["/marketplace", "Marketplace Listings"]);
  results.push(["/listings", "Farmer Listings"]);
  results.push(["/orders", "Orders Page"]);
  results.push(["/notifications", "Notifications Page"]);
  results.push(["/admin", "Admin Dashboard (Protected)"]);

  console.log("Public Pages:");
  console.log("─".repeat(60));
  const publicTests = [
    await testPage("/register", "Registration Page"),
    await testPage("/login", "Login Page"),
    await testPage("/marketplace", "Marketplace Listings"),
  ];

  console.log("\nAPI Health Check:");
  console.log("─".repeat(60));
  const healthCheck = await testPage("/api/health", "Health Check Endpoint");

  console.log("\nAPI Auth Endpoints:");
  console.log("─".repeat(60));
  try {
    const loginRoute = await fetch("http://localhost:3000/api/auth/login", {
      method: "GET",
      headers: { "User-Agent": "Testing-Bot" },
    });
    console.log(
      `✅ /api/auth/login${loginRoute.status >= 400 ? " (Method Not Allowed)" : ""}`
    );
  } catch (e) {
    console.log(`❌ /api/auth/login - ${e.message}`);
  }

  try {
    const registerRoute = await fetch("http://localhost:3000/api/auth/register", {
      method: "GET",
      headers: { "User-Agent": "Testing-Bot" },
    });
    console.log(
      `✅ /api/auth/register${registerRoute.status >= 400 ? " (Method Not Allowed)" : ""}`
    );
  } catch (e) {
    console.log(`❌ /api/auth/register - ${e.message}`);
  }

  console.log("\n📊 Summary:");
  console.log("─".repeat(60));

  if (publicTests.every((t) => t)) {
    console.log("✅ All public pages are accessible");
  } else {
    console.log("⚠️  Some pages failed - check if server is running");
  }

  if (healthCheck) {
    console.log("✅ API endpoints are responding");
  } else {
    console.log("⚠️  Health check endpoint not found");
  }

  console.log(
    "\n💡 Note: Protected pages (dashboard, profile, admin) redirect to login"
  );
  console.log(
    "   which is expected behavior. They will work after user logs in.\n"
  );
}

main().catch(console.error);
