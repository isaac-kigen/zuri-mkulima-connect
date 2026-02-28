# 🚀 Quick Fix Guide - Registration Not Adding Profiles

## ⚡ TL;DR - The Issue

Users can register, but their profiles don't get created in the database. This blocks them from using the app.

**Root Cause:** Bad email validation regex in the database constraint

**Status:** ✅ FIXED (see below)

---

## 🔧 How to Apply the Fix

### Step 1: Go to Supabase Dashboard
Go to: https://app.supabase.com/project/dmhjccyjbzxaxpikfcve/sql/new

### Step 2: Copy & Paste This SQL

```sql
-- Fix the broken email constraint
ALTER TABLE public.profiles DROP CONSTRAINT profiles_email_format_chk;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_format_chk 
  CHECK (email::text ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
```

### Step 3: Click "Run"

You should see ✅ "Query executed successfully"

---

## ✅ Verify the Fix Works

```bash
# From your project directory:
cd /home/kigen/Desktop/zuri-mkulima-connect

# Run the verification script:
source .env.local && node test-registration-fix.mjs
```

Expected output: ✅ All checks pass

---

## 🧪 Test Registration

1. Open http://localhost:3000/register
2. Fill in form:
   - Full Name: "Test Farmer"
   - Email: "farmer@example.com"
   - Password: "SecurePass123"
   - Role: "Farmer"
   - County: "Nairobi"
3. Click "Create account"
4. Should go to dashboard
5. Check Supabase: profiles table should have the new user

---

## 📚 More Information

See `REGISTRATION_FIX.md` in the project root for detailed technical explanation.

---

## ❓ Still Not Working?

1. **Check if SQL executed:** Go to Supabase Dashboard > SQL Editor > check "Recent queries"
2. **Verify constraints:** Run this to see current constraints:
   ```sql
   SELECT constraint_name 
   FROM information_schema.table_constraints 
   WHERE table_name = 'profiles';
   ```
3. **Check migration was applied:** Look at the timestamp in the constraint error

---

## 📞 Next Steps

1. ✅ Apply the SQL fix above
2. ✅ Run the verification script
3. ✅ Test registration through web interface
4. ✅ Test login with created account
5. ✅ Test dashboard loads correctly
6. ✅ Test profile page loads and can edit

All pages should now work! 🎉
