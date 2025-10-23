# SQL Scripts for Environment Setup

This directory contains SQL scripts to set up optional tables and configurations for the Gestão Scouter application.

## ⚠️ Important Notes

- **Manual Execution**: These scripts are NOT executed automatically. They must be run manually by operators in the Supabase SQL Editor.
- **Non-Destructive**: All scripts use `IF NOT EXISTS` checks and will not drop existing tables or data.
- **Environment-Specific**: Review and adjust security policies based on your specific requirements.

## Scripts Overview

### 1. fix_users_roles_fk.sql

**Purpose**: Ensure proper foreign key relationship between users and roles tables.

**What it does**:
- Verifies `roles.id` is a PRIMARY KEY
- Ensures `users.role_id` column exists
- Creates FK constraint `users.role_id` → `roles(id)` with:
  - `ON UPDATE CASCADE`: Updates propagate to users
  - `ON DELETE SET NULL`: Safe deletion (doesn't orphan users)

**When to run**: 
- If you encounter `PGRST200` errors when fetching users with roles
- When setting up a new environment
- To enable PostgREST automatic joins for the users/roles relationship

**Prerequisites**: 
- Both `users` and `roles` tables must exist

---

### 2. create_sync_tables.sql

**Purpose**: Create tables for tracking synchronization operations with TabuladorMax.

**Tables created**:

#### sync_logs_detailed
Stores detailed logs of each sync operation:
- `endpoint`: The sync endpoint called
- `table_name`: Table being synced (e.g., "leads ↔ leads")
- `status`: 'success', 'error', or 'pending'
- `records_count`: Number of records processed
- `execution_time_ms`: Time taken for the operation
- `error_message`: Error details if failed
- `request_params`, `response_data`: Request/response JSONB for debugging

#### sync_status
Tracks current sync status per project:
- `project_name`: e.g., "TabuladorMax"
- `last_sync_at`: Timestamp of last sync
- `last_sync_success`: Boolean success flag
- `total_records`: Record count
- `last_error`: Most recent error message

**Features**:
- Automatic `updated_at` triggers
- RLS enabled with basic SELECT policy
- Indexes for common queries

**When to run**:
- When sync monitoring UI shows 404/406 errors for these tables
- Setting up a new environment

---

### 3. create_tabulador_config.sql

**Purpose**: Create table for storing TabuladorMax connection configuration.

**Table created**: `tabulador_config`
- `project_id`: Unique identifier (e.g., "gkvvtfqfggddzotxltxf")
- `url`: TabuladorMax Supabase URL
- `publishable_key`: Anon key for TabuladorMax
- `enabled`: Boolean flag to enable/disable sync

**Features**:
- Unique constraint on `project_id`
- Automatic `updated_at` trigger
- RLS enabled with basic SELECT policy
- Optional admin-only modification policy (commented)

**When to run**:
- If you want to store TabuladorMax config in the database instead of localStorage
- Setting up a new environment

**Security Note**: The commented admin policy should be adapted based on your role structure.

---

### 4. leads_read_policy.sql

**Purpose**: Enable Row Level Security on the leads table with basic read policy.

**What it does**:
- Enables RLS on `public.leads`
- Creates permissive SELECT policy for all authenticated users

**⚠️ Security Warning**: 
This creates a PERMISSIVE policy that allows all authenticated users to view all leads. This may not be appropriate for your security model.

**Optional Policies Included** (commented):
1. **Role-based**: Admins see all, scouters see only their own
2. **Project-based**: Users see only leads from their assigned projects
3. **Supervisor hierarchy**: Supervisors see their team's leads
4. **Write policies**: INSERT, UPDATE, DELETE examples

**When to run**:
- When setting up a new environment
- If leads queries return 403 errors due to RLS
- **Before running**: Review and customize the policy for your security requirements

**Customization Required**: Operators MUST review and adapt the policies based on their specific security model.

---

## Execution Order

For a fresh environment setup, run in this order:

1. `fix_users_roles_fk.sql` - Set up user/role relationship
2. `create_sync_tables.sql` - Enable sync monitoring
3. `create_tabulador_config.sql` - Store TabuladorMax config
4. `leads_read_policy.sql` - Configure leads access (CUSTOMIZE FIRST!)

## How to Execute

1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the SQL script content
5. Review the script (especially security policies)
6. Click "Run" or press `Ctrl+Enter`
7. Review the output for any errors or notices

## Verification

Each script includes verification queries at the end. After running a script:

1. Check the query output for success messages
2. Run the verification query to confirm the changes
3. Check the Supabase logs for any warnings

## Rollback

If you need to undo changes (use with caution):

```sql
-- Remove FK constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_id_fkey;

-- Drop sync tables
DROP TABLE IF EXISTS public.sync_logs_detailed;
DROP TABLE IF EXISTS public.sync_status;

-- Drop tabulador config
DROP TABLE IF EXISTS public.tabulador_config;

-- Disable RLS on leads (only if needed)
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;

-- Drop specific policy
DROP POLICY IF EXISTS "Allow authenticated users to view leads" ON public.leads;
```

## Support

If you encounter issues:

1. Check the Supabase logs for detailed error messages
2. Verify you have the necessary privileges (superuser or table owner)
3. Review the script comments for prerequisites
4. Ensure all referenced tables exist before running FK scripts

## Security Best Practices

1. **Review all policies** before execution
2. **Test in a development environment** first
3. **Customize RLS policies** for your security model
4. **Restrict admin operations** to specific roles
5. **Audit policy effectiveness** regularly
6. **Document any customizations** you make

---

**Last Updated**: 2025-10-18
**Version**: 1.0
**Compatibility**: Supabase PostgreSQL 15+
