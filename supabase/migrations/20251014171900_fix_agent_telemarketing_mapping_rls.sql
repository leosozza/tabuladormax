-- ============================================
-- Fix RLS Policies for agent_telemarketing_mapping
-- Allow users to create their own mapping during signup
-- ============================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admins and managers can manage mappings" ON public.agent_telemarketing_mapping;

-- Allow authenticated users to INSERT their own mapping
CREATE POLICY "Users can create their own mapping"
  ON public.agent_telemarketing_mapping
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can only create mapping for themselves
    (tabuladormax_user_id = auth.uid())
    OR
    -- Or admins/managers can create for anyone
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Allow users to view their own mappings, admins/managers can view all
CREATE POLICY "Users can view own mapping, admins view all"
  ON public.agent_telemarketing_mapping
  FOR SELECT
  TO authenticated
  USING (
    (tabuladormax_user_id = auth.uid())
    OR
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Only admins and managers can UPDATE
CREATE POLICY "Admins and managers can update mappings"
  ON public.agent_telemarketing_mapping
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Only admins and managers can DELETE
CREATE POLICY "Admins and managers can delete mappings"
  ON public.agent_telemarketing_mapping
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
