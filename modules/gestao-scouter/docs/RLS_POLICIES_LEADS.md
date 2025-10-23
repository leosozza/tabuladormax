# Row Level Security (RLS) Configuration for Leads Table

## 🔒 Overview

This document describes the Row Level Security (RLS) policies that should be configured for the `leads` table in Supabase to ensure proper data access control while maintaining usability.

## ⚠️ CRITICAL: Why RLS Matters

Without proper RLS policies:
- Dashboard and Leads page may show no data (even if data exists)
- Users may see data they shouldn't have access to
- Operations like create/update/delete may fail silently

## 📋 Current State Verification

Before configuring RLS, verify the current state:

```sql
-- Check if RLS is enabled on leads table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'leads';

-- List existing policies
SELECT * FROM pg_policies WHERE tablename = 'leads';

-- Count total vs accessible records (as current user)
SELECT 
  (SELECT COUNT(*) FROM leads) as total_records,
  (SELECT COUNT(*) FROM public.leads) as accessible_records;
```

## 🎯 Recommended RLS Policies

### Policy 1: Allow Service Role to Perform UPSERT (Critical for TabuladorMax Sync)

**Purpose:** Enable TabuladorMax to sync leads via service_role

```sql
-- Create policy for service_role UPSERT operations
CREATE POLICY "service_role_upsert_leads"
  ON public.leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_upsert_leads" ON public.leads IS 
  'Permite que service_role (usado pelo TabuladorMax) faça UPSERT de leads via sincronização';
```

**What it does:**
- Allows service_role to INSERT, UPDATE, SELECT, and DELETE
- Required for TabuladorMax batch exports using `Prefer: resolution=merge-duplicates`
- Uses `USING (true)` to allow reading any row (needed for UPSERT existence check)
- Uses `WITH CHECK (true)` to allow writing any row (needed for INSERT/UPDATE)

**Security:**
- Only applies to `service_role` (not regular users)
- Regular users still require their own specific policies
- Maintains audit trail via `created_at`/`updated_at`

**Why it's necessary:**
- UPSERT operations require both INSERT and UPDATE permissions simultaneously
- Without this policy, you'll see "new row violates row-level security policy" errors
- Service role needs full access to perform batch synchronization

---

### Policy 2: Allow Authenticated Users to Read Non-Deleted Leads

**Purpose:** Enable all authenticated users to view active leads

```sql
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to read leads" ON public.leads;

-- Create read policy for authenticated users
CREATE POLICY "Allow authenticated users to read leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  -- Only show non-deleted records
  (deleted = false OR deleted IS NULL)
);
```

**What it does:**
- Allows any authenticated user to read leads
- Automatically filters out soft-deleted records
- Simple and permissive for dashboard/reports

### Policy 3: Allow Authenticated Users to Insert Leads

**Purpose:** Enable lead creation through the UI

```sql
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to insert leads" ON public.leads;

-- Create insert policy
CREATE POLICY "Allow authenticated users to insert leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- New records should not be deleted
  (deleted = false OR deleted IS NULL)
);
```

**What it does:**
- Allows authenticated users to create new leads
- Ensures new leads are not created as deleted
- Basic validation at the RLS level

### Policy 4: Allow Users to Update Their Own Leads (Optional)

**Purpose:** Enable users to edit leads they created

```sql
-- Only implement if you have a created_by or user_id column
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow users to update own leads" ON public.leads;

-- Create update policy (requires user tracking)
CREATE POLICY "Allow users to update own leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  -- User created this lead
  created_by = auth.uid()
  OR
  -- OR user is admin (implement admin check)
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  -- Don't allow changing ownership
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
```

**Note:** This requires a `created_by` column. If you don't have user tracking, use a simpler policy:

```sql
-- Simpler update policy without user tracking
CREATE POLICY "Allow authenticated users to update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (deleted = false OR deleted IS NULL)
WITH CHECK (true);
```

### Policy 5: Allow Soft Delete (Admins Only)

**Purpose:** Enable soft-delete for authorized users only

```sql
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow admins to soft delete leads" ON public.leads;

-- Create delete policy (requires admin role)
CREATE POLICY "Allow admins to soft delete leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  -- Check if user has admin role
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
)
WITH CHECK (
  -- Only allow setting deleted = true
  deleted = true
);
```

**Alternative: Allow All Authenticated Users to Soft Delete**

```sql
-- Simpler policy if all users can delete
CREATE POLICY "Allow authenticated users to soft delete leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (deleted = false OR deleted IS NULL)
WITH CHECK (deleted = true);
```

## 🚀 Quick Setup (Development)

For development/testing, use these simplified permissive policies:

```sql
-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read non-deleted leads
CREATE POLICY "dev_read_leads"
ON public.leads
FOR SELECT
TO authenticated
USING (deleted = false OR deleted IS NULL);

-- Allow all authenticated users to insert
CREATE POLICY "dev_insert_leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to update
CREATE POLICY "dev_update_leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow all authenticated users to soft delete
CREATE POLICY "dev_delete_leads"
ON public.leads
FOR DELETE
TO authenticated
USING (true);
```

## 🔐 Production Setup (Recommended)

For production, implement role-based policies:

```sql
-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 1. Read policy - All authenticated users
CREATE POLICY "prod_read_leads"
ON public.leads
FOR SELECT
TO authenticated
USING (deleted = false OR deleted IS NULL);

-- 2. Insert policy - All authenticated users
CREATE POLICY "prod_insert_leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (deleted = false OR deleted IS NULL)
);

-- 3. Update policy - Admins and record owners
CREATE POLICY "prod_update_leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  -- User is admin
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
  OR
  -- Or user created this record (if you have created_by column)
  created_by = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
  OR
  created_by = auth.uid()
);

-- 4. Soft delete policy - Admins only
CREATE POLICY "prod_delete_leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
)
WITH CHECK (deleted = true);
```

## 🧪 Testing RLS Policies

### Test 1: Verify RLS is Enabled

```sql
-- Should return true
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'leads';
```

### Test 2: Verify Policies Exist

```sql
-- Should return your policies
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'leads';
```

### Test 3: Test Read Access (as authenticated user)

```sql
-- Should return non-deleted records
SELECT COUNT(*) as accessible_count
FROM public.leads;

-- Should return total including deleted
SELECT COUNT(*) as total_count
FROM leads;
```

### Test 4: Test Insert (via application)

```typescript
// Should succeed for authenticated users
const { data, error } = await supabase
  .from('leads')
  .insert([{
    nome: 'Test Lead',
    projeto: 'Test Project',
    scouter: 'Test Scouter',
    deleted: false,
    criado: '2024-01-01',
    raw: {}
  }]);

console.log('Insert result:', { data, error });
```

### Test 5: Test Update (via application)

```typescript
// Should succeed based on your policy
const { data, error } = await supabase
  .from('leads')
  .update({ nome: 'Updated Name' })
  .eq('id', 'some-id');

console.log('Update result:', { data, error });
```

### Test 6: Test Soft Delete (via application)

```typescript
// Should succeed based on your policy
const { data, error } = await supabase
  .from('leads')
  .update({ deleted: true })
  .eq('id', 'some-id');

console.log('Delete result:', { data, error });
```

## 🐛 Troubleshooting

### Issue: Dashboard shows no data

**Cause:** RLS is blocking read access

**Solution:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'leads';

-- If enabled but no policies, add read policy
CREATE POLICY "allow_read" ON public.leads
FOR SELECT TO authenticated
USING (deleted = false OR deleted IS NULL);
```

### Issue: Cannot insert leads from UI

**Cause:** RLS is blocking insert operations

**Solution:**
```sql
-- Add insert policy
CREATE POLICY "allow_insert" ON public.leads
FOR INSERT TO authenticated
WITH CHECK (true);
```

### Issue: Cannot update leads

**Cause:** RLS is blocking update operations

**Solution:**
```sql
-- Add update policy
CREATE POLICY "allow_update" ON public.leads
FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);
```

### Issue: Some users can see data, others cannot

**Cause:** Policy is filtering by user-specific criteria

**Solution:** Review your USING clause to ensure it's not too restrictive:
```sql
-- Check existing policies
SELECT policyname, pg_get_expr(qual, polrelid) as using_expression
FROM pg_policy 
WHERE polrelid = 'public.leads'::regclass;
```

## 📊 Monitoring RLS

### Query to Check Policy Effectiveness

```sql
-- See which policies apply to current user
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  pg_get_expr(qual, polrelid) as using_expression,
  pg_get_expr(with_check, polrelid) as with_check_expression
FROM pg_policies
WHERE tablename = 'leads';
```

### Query to Audit Access

```sql
-- See what current user can access
SELECT 
  id,
  nome,
  projeto,
  scouter,
  deleted,
  criado,
  CASE 
    WHEN deleted = true THEN 'DELETED'
    WHEN deleted = false THEN 'ACTIVE'
    ELSE 'NULL'
  END as status
FROM public.leads
ORDER BY criado DESC
LIMIT 10;
```

## 🎓 Best Practices

1. **Start Permissive, Then Restrict:** Begin with simple policies and add restrictions as needed
2. **Test as Different Users:** Verify policies work for all user types
3. **Document Your Policies:** Comment on why each policy exists
4. **Use Policy Names That Explain Purpose:** E.g., "allow_scouter_read_own_leads"
5. **Monitor Policy Performance:** Complex policies can slow queries
6. **Never Disable RLS in Production:** Always keep RLS enabled for security
7. **Use Roles Effectively:** Leverage PostgreSQL roles for complex access patterns
8. **Test Edge Cases:** NULL values, missing columns, etc.

## 🔄 Migration Checklist

When deploying RLS changes:

- [ ] Enable RLS on leads table
- [ ] Create read policy for all authenticated users
- [ ] Create insert policy for authenticated users
- [ ] Create update policy (role-based or permissive)
- [ ] Create delete/soft-delete policy
- [ ] Test with actual user accounts
- [ ] Verify dashboard loads data
- [ ] Verify leads page loads data
- [ ] Verify lead creation works
- [ ] Verify lead updates work
- [ ] Verify soft delete works
- [ ] Document any custom policies
- [ ] Update this documentation if policies change

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

## 🆘 Support

If RLS is still not working:

1. Run the verification script: `npm run verify:leads-setup`
2. Check Supabase logs for policy violations
3. Test queries directly in Supabase SQL editor
4. Review `/docs/DATA_FLOW_LEADS.md` for data flow
5. Check if user is authenticated: `SELECT auth.uid();`

---

**Last Updated:** 2025-10-18
**Version:** 1.0
**Status:** Active
