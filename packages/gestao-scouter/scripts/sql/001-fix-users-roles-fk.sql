-- ============================================================================
-- 001-fix-users-roles-fk.sql
-- 
-- PURPOSE: Fix the missing foreign key relationship between users and roles
-- 
-- ISSUE: The PostgREST API was returning PGRST200 errors when trying to join
--        users with roles because the foreign key constraint was missing.
--
-- SOLUTION: This script creates the missing foreign key constraint and
--           notifies PostgREST to reload its schema cache.
-- 
-- EXECUTION: Run this script in Supabase SQL Editor for gestao-scouter project
-- 
-- ============================================================================

-- Adiciona a chave estrangeira para a relação users -> roles
ALTER TABLE public.users
ADD CONSTRAINT users_role_id_fkey
FOREIGN KEY (role_id)
REFERENCES public.roles (id);

-- Recarrega o schema do PostgREST para que as alterações sejam aplicadas imediatamente.
NOTIFY pgrst, 'reload schema';
