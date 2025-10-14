# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- RLS (Row Level Security) policy for `agent_telemarketing_mapping` table to allow authenticated users to create their own mappings
- Comprehensive documentation for RLS policies and permission management

### Security

#### Agent Telemarketing Mapping Permissions

A new INSERT policy has been added to the `agent_telemarketing_mapping` table to resolve 403 (forbidden) errors when users try to create mappings between themselves and telemarketing operators.

**Migration File:** `supabase/migrations/20251014171900_fix_agent_telemarketing_mapping_rls.sql`

**Policy Details:**
```sql
CREATE POLICY "Users can create their own mapping"
  ON public.agent_telemarketing_mapping
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (tabuladormax_user_id = auth.uid())  -- Users can create mappings for themselves
    OR
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))  -- Admins/managers can create for anyone
  );
```

**Impact:**
- ✅ Authenticated users can now create their own telemarketing mappings during signup
- ✅ Admins and managers retain the ability to create mappings for any user
- ✅ Users can only view their own mappings (privacy protection)
- ✅ Only admins/managers can update or delete mappings (data integrity)

**⚠️ IMPORTANT - Review Permissions for Your Business Rules:**

The current implementation follows these business rules:
1. **Self-service creation**: Users can create their own mappings (`tabuladormax_user_id = auth.uid()`)
2. **Administrative override**: Admins and managers can create mappings for any user
3. **Privacy**: Users can only see their own mappings
4. **Data integrity**: Only admins/managers can modify or delete mappings

**If your business rules differ, you may need to adjust these policies:**

- **Allow any authenticated user to insert without restrictions:**
  ```sql
  CREATE POLICY "Authenticated users can insert mappings"
    ON public.agent_telemarketing_mapping
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
  ```

- **Allow users to update their own mappings:**
  ```sql
  CREATE POLICY "Users can update own mapping"
    ON public.agent_telemarketing_mapping
    FOR UPDATE
    TO authenticated
    USING (tabuladormax_user_id = auth.uid())
    WITH CHECK (tabuladormax_user_id = auth.uid());
  ```

- **Allow users to delete their own mappings:**
  ```sql
  CREATE POLICY "Users can delete own mapping"
    ON public.agent_telemarketing_mapping
    FOR DELETE
    TO authenticated
    USING (tabuladormax_user_id = auth.uid());
  ```

**To review or modify policies:**

1. Check current policies:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'agent_telemarketing_mapping';
   ```

2. Drop a policy if needed:
   ```sql
   DROP POLICY IF EXISTS "policy_name" ON public.agent_telemarketing_mapping;
   ```

3. Create or recreate the policy with your business rules

4. Test the new policy with different user roles before deploying to production

**Related Documentation:**
- See `docs/USER_CREATION_TELEMARKETING_FIX.md` for detailed implementation notes
- See `PR_SUMMARY.md` for deployment checklist and validation queries

### Changed
- Enhanced error handling in user authentication flow to provide specific feedback for permission errors

### Fixed
- Fixed 403 forbidden error when authenticated users attempted to create agent-telemarketing mappings during signup
- Fixed inconsistent mapping creation across different authentication flows (password login, OAuth)

## Previous Changes

For changes prior to this version, see commit history or `PR_SUMMARY.md`.
