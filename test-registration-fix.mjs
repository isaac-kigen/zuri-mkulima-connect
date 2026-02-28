#!/usr/bin/env node
/**
 * Registration System - Issue Analysis and Solution
 * 
 * ISSUE FOUND:
 * When users register, their profiles are not being created in the profiles table.
 * One auth user exists (isaackigen86@gmail.com) but has no corresponding profile.
 * 
 * ROOT CAUSE:
 * The email format validation constraint in the profiles table was using an incorrect
 * PostgreSQL regex pattern: `check (email::text ~* '^\\S+@\\S+\\.\\S+$')`
 * 
 * The problem: In PostgreSQL POSIX regex, `\S` is interpreted as literal `\S` characters,
 * not as "non-whitespace" like in Perl-compatible regex. This caused ALL email inserts
 * to fail the constraint check, even valid emails like "user@example.com".
 * 
 * IMPACT:
 * 1. The auth trigger `handle_new_auth_user()` tries to insert a profile for each new user
 * 2. The insert fails due to the bad email constraint
 * 3. The app's fallback `provisionProfileFallback()` also fails to insert
 * 4. User auth account is created but no profile exists
 * 5. Users cannot fully use the system (no profile data in app)
 * 
 * SOLUTION:
 * Two migrations have been created to fix this:
 * 
 * 1. supabase/migrations/20260221110000_init_schema.sql (UPDATED)
 *    - Changed the email constraint regex to use POSIX syntax that works in PostgreSQL
 *    - New pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
 *    - This pattern validates email format correctly
 * 
 * 2. supabase/migrations/20260228140000_fix_email_constraint.sql (NEW)
 *    - Applied to existing database to fix the constraint
 *    - Drops the old bad constraint and creates the new correct one
 * 
 * NEXT STEPS TO APPLY FIX:
 * 
 * For cloud Supabase (as this project uses):
 * 1. Go to: https://app.supabase.com/project/dmhjccyjbzxaxpikfcve/sql
 * 2. Run the SQL from supabase/migrations/20260228140000_fix_email_constraint.sql
 * 3. Or use Supabase CLI: supabase db push
 * 
 * After applying:
 * 1. New user registrations will work properly
 * 2. Profiles will be created via the trigger
 * 3. The fallback mechanism will work if trigger fails
 * 4. All pages (register, login, dashboard) will function correctly
 * 
 * VERIFICATION COMMANDS:
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function verifyFix() {
  console.log("\n🔍 Verifying Email Constraint Fix\n");

  // Try to create a test profile with the new constraint
  const testProfile = {
    id: "test-" + Date.now(),
    full_name: "Test User",
    email: `test-${Date.now()}@example.com`,
    role: "buyer",
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify(testProfile),
    });

    if (response.ok) {
      console.log("✅ Email constraint fix is working!");
      console.log(`   Successfully created test profile with email: ${testProfile.email}`);
      
      // Clean up test profile
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${testProfile.id}`, {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      console.log("   Test profile cleaned up.");
      return true;
    } else {
      const error = await response.json();
      if (error.message?.includes("email_format_chk")) {
        console.error("❌ Email constraint fix NOT applied yet");
        console.error("   Error:", error.message);
        console.error("\n📋 To fix, run this SQL in Supabase:");
        console.error(
          'ALTER TABLE public.profiles DROP CONSTRAINT profiles_email_format_chk;'
        );
        console.error(
          "ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_format_chk"
        );
        console.error(
          "  CHECK (email::text ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');"
        );
        return false;
      } else {
        console.error("❌ Unexpected error:", error);
        return false;
      }
    }
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    return false;
  }
}

async function checkExistingUsers() {
  console.log("\n📊 Checking Existing Users and Profiles\n");

  const authUsers = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  }).then((r) => r.json());

  const profiles = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  }).then((r) => r.json());

  const authUserIds = new Set((authUsers.users || []).map((u) => u.id));
  const profileIds = new Set((profiles || []).map((p) => p.id));

  console.log(`Auth users: ${authUserIds.size}`);
  console.log(`Profiles: ${profileIds.size}`);

  if (authUserIds.size > profileIds.size) {
    console.log("\n⚠️  Users without profiles:");
    for (const userId of authUserIds) {
      if (!profileIds.has(userId)) {
        const user = (authUsers.users || []).find((u) => u.id === userId);
        console.log(`   - ${user?.email} (${userId})`);
      }
    }

    console.log("\n💡 After the fix is applied, run:");
    console.log("   npm run dev");
    console.log("   Then register a new user through the web interface");
    console.log("   The profile should be created automatically");
  } else {
    console.log("\n✅ All auth users have profiles!");
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error(
      "❌ Missing Supabase configuration. Run: source .env.local && node test-registration-fix.mjs"
    );
    process.exit(1);
  }

  const fixed = await verifyFix();
  await checkExistingUsers();

  if (fixed) {
    console.log(
      "\n✅ Registration system is ready! Users can now register and profiles will be created."
    );
  } else {
    console.log("\n📋 Apply the SQL fix migration, then rerun this script to verify.");
  }
}

main().catch(console.error);
