-- ============================================================================
-- fix_users_roles_fk.sql
-- 
-- PURPOSE: Ensure proper foreign key relationship between users and roles
-- 
-- EXECUTION: Manual - Run this script in Supabase SQL Editor
-- 
-- DESCRIPTION:
--   This script ensures that:
--   1. roles.id exists as a PRIMARY KEY
--   2. users.role_id column exists
--   3. Foreign key constraint users.role_id -> roles(id) is created
--      with ON UPDATE CASCADE and ON DELETE SET NULL for safety
-- 
-- NON-DESTRUCTIVE: This script will not drop tables or remove existing data.
--                  It uses IF NOT EXISTS checks and will skip operations
--                  that would conflict with existing structures.
-- 
-- PREREQUISITES:
--   - The 'users' and 'roles' tables must already exist
--   - You must have superuser or appropriate privileges
-- 
-- ============================================================================

-- Step 1: Ensure roles table has primary key on id
-- (Usually already exists, but we verify)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'roles_pkey' 
    AND conrelid = 'public.roles'::regclass
  ) THEN
    ALTER TABLE public.roles ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added PRIMARY KEY to roles.id';
  ELSE
    RAISE NOTICE 'PRIMARY KEY already exists on roles.id';
  END IF;
END $$;

-- Step 2: Ensure users table has role_id column
-- (If missing, create it as integer type)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'role_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN role_id integer;
    RAISE NOTICE 'Added role_id column to users table';
  ELSE
    RAISE NOTICE 'role_id column already exists in users table';
  END IF;
END $$;

-- Step 3: Create foreign key constraint
-- ON UPDATE CASCADE: if role id changes, update users.role_id
-- ON DELETE SET NULL: if role is deleted, set users.role_id to NULL (safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_id_fkey'
    AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_id_fkey
      FOREIGN KEY (role_id)
      REFERENCES public.roles(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
    RAISE NOTICE 'Created foreign key constraint users_role_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint users_role_id_fkey already exists';
  END IF;
END $$;

-- Step 4: Verify the relationship
SELECT 
  conname AS constraint_name,
  confupdtype AS on_update,
  confdeltype AS on_delete
FROM pg_constraint
WHERE conname = 'users_role_id_fkey'
AND conrelid = 'public.users'::regclass;

-- Expected output:
-- constraint_name         | on_update | on_delete
-- -----------------------|-----------|----------
-- users_role_id_fkey     | c         | n
-- 
-- Where: c = CASCADE, n = SET NULL
