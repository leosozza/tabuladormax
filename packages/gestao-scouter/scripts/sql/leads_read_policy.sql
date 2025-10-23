-- ============================================================================
-- leads_read_policy.sql
-- 
-- PURPOSE: Enable Row Level Security and create basic read policy for leads
-- 
-- EXECUTION: Manual - Run this script in Supabase SQL Editor
-- 
-- DESCRIPTION:
--   This script:
--   1. Enables Row Level Security (RLS) on the public.leads table
--   2. Creates a permissive SELECT policy for authenticated users
-- 
-- IMPORTANT SECURITY NOTES:
--   - This is a PERMISSIVE policy that allows all authenticated users to
--     read all leads. This may not be appropriate for your security model.
--   - Operators should review and adjust this policy based on their specific
--     requirements.
--   - Consider implementing more restrictive policies based on:
--     * User roles (e.g., admin, scouter, supervisor)
--     * Data ownership (e.g., users can only see their own leads)
--     * Project membership (e.g., users can only see leads from their projects)
-- 
-- NON-DESTRUCTIVE: This script only enables RLS and creates policies.
--                  It does not drop or modify existing data.
-- 
-- EXAMPLES OF MORE RESTRICTIVE POLICIES:
--   See the commented sections below for examples of role-based and
--   ownership-based policies that you can adapt for your needs.
-- 
-- ============================================================================

-- Enable Row Level Security on leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICY 1: Basic permissive read policy for authenticated users
-- ============================================================================
-- This policy allows all authenticated users to view all leads
-- Adjust based on your security requirements

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'leads'
    AND policyname = 'Allow authenticated users to view leads'
  ) THEN
    CREATE POLICY "Allow authenticated users to view leads"
      ON public.leads
      FOR SELECT
      TO authenticated
      USING (true);
    RAISE NOTICE 'Created permissive SELECT policy for leads';
  ELSE
    RAISE NOTICE 'SELECT policy already exists for leads';
  END IF;
END $$;

-- ============================================================================
-- OPTIONAL POLICIES - Uncomment and modify as needed
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXAMPLE 2: Role-based read policy
-- ----------------------------------------------------------------------------
-- Allows admins to see all leads, scouters only their own
/*
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'leads'
    AND policyname = 'Role-based read access to leads'
  ) THEN
    CREATE POLICY "Role-based read access to leads"
      ON public.leads
      FOR SELECT
      TO authenticated
      USING (
        -- Admins can see all leads
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role_id = (SELECT id FROM public.roles WHERE name = 'admin')
        )
        -- OR scouters can see only their own leads
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND leads.scouter = users.name
        )
      );
    RAISE NOTICE 'Created role-based SELECT policy for leads';
  END IF;
END $$;
*/

-- ----------------------------------------------------------------------------
-- EXAMPLE 3: Project-based read policy
-- ----------------------------------------------------------------------------
-- Allows users to see only leads from projects they're assigned to
/*
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'leads'
    AND policyname = 'Project-based read access to leads'
  ) THEN
    CREATE POLICY "Project-based read access to leads"
      ON public.leads
      FOR SELECT
      TO authenticated
      USING (
        -- Assuming you have a user_projects table mapping users to projects
        EXISTS (
          SELECT 1 FROM public.user_projects
          WHERE user_projects.user_id = auth.uid()
          AND user_projects.project_name = leads.projeto
        )
      );
    RAISE NOTICE 'Created project-based SELECT policy for leads';
  END IF;
END $$;
*/

-- ----------------------------------------------------------------------------
-- EXAMPLE 4: Supervisor hierarchy policy
-- ----------------------------------------------------------------------------
-- Allows supervisors to see leads from their supervised scouters
/*
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'leads'
    AND policyname = 'Supervisor hierarchy read access to leads'
  ) THEN
    CREATE POLICY "Supervisor hierarchy read access to leads"
      ON public.leads
      FOR SELECT
      TO authenticated
      USING (
        -- User can see their own leads
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND leads.scouter = users.name
        )
        -- OR user is a supervisor of the scouter
        OR EXISTS (
          SELECT 1 FROM public.users AS supervised
          JOIN public.users AS supervisor ON supervisor.id = auth.uid()
          WHERE supervised.supervisor_id = supervisor.id
          AND leads.scouter = supervised.name
        )
      );
    RAISE NOTICE 'Created supervisor hierarchy SELECT policy for leads';
  END IF;
END $$;
*/

-- ============================================================================
-- WRITE POLICIES (INSERT, UPDATE, DELETE)
-- ============================================================================
-- By default, no write policies are created. This means authenticated users
-- cannot modify leads through the API. Add policies as needed:

/*
-- Allow authenticated users to insert their own leads
CREATE POLICY "Allow users to insert their own leads"
  ON public.leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND leads.scouter = users.name
    )
  );

-- Allow users to update only their own leads
CREATE POLICY "Allow users to update their own leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND leads.scouter = users.name
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND leads.scouter = users.name
    )
  );

-- Allow soft delete (update deleted flag) for own leads
CREATE POLICY "Allow users to soft delete their own leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND leads.scouter = users.name
    )
  )
  WITH CHECK (deleted = true);
*/

-- ============================================================================

-- Verification query - Check active policies on leads table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'leads'
ORDER BY policyname;

-- Check RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'leads';
