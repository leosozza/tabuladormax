# TabuladorMax - Gestão Scouter Config Table Setup

> ⚠️ **OBSOLETO**: A tabela `gestao_scouter_config` não está implementada neste projeto. A sincronização com Gestão Scouter funciona via `export-to-gestao-scouter-batch` sem necessidade desta tabela.

## Overview

This document provides detailed information about the `gestao_scouter_config` table, which manages the configuration for integrating TabuladorMax with the Gestão Scouter system.

## Table Structure

### Table Name
`public.gestao_scouter_config`

### Columns

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | SERIAL | PRIMARY KEY | auto-increment | Sequential unique identifier |
| `project_url` | TEXT | NOT NULL, CHECK constraint | - | Supabase project URL for gestao-scouter |
| `anon_key` | TEXT | NOT NULL | - | Anonymous key for public API access |
| `active` | BOOLEAN | - | true | Indicates if this configuration is active |
| `sync_enabled` | BOOLEAN | - | false | Indicates if synchronization is enabled |
| `created_at` | TIMESTAMPTZ | - | now() | Timestamp when record was created |
| `updated_at` | TIMESTAMPTZ | - | now() | Timestamp of last update |

### Constraints

#### URL Format Check
The `project_url` column has a CHECK constraint to validate URL format:
```sql
CHECK (project_url ~* '^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$')
```

This ensures:
- URL starts with `http://` or `https://`
- Contains valid domain name
- Includes top-level domain (TLD)
- Optionally includes path

**Valid examples:**
- `https://your-project.supabase.co`
- `https://myproject.supabase.co/api`
- `http://localhost:54321`

**Invalid examples:**
- `myproject.supabase.co` (missing protocol)
- `https://` (incomplete URL)
- `ftp://example.com` (invalid protocol)

#### Single Active Configuration
A trigger ensures only one configuration can be active at a time:
- When setting `active = true` on a record, all other records are automatically set to `active = false`
- Implemented via `enforce_single_active_config()` function

## Row Level Security (RLS)

The table has RLS enabled with the following policies:

### SELECT Policy
- **Name:** `Allow public SELECT on gestao_scouter_config`
- **Access:** Public (all users)
- **Purpose:** Allow reading configuration data

### INSERT Policy
- **Name:** `Allow authenticated INSERT on gestao_scouter_config`
- **Access:** Authenticated users and service_role
- **Purpose:** Restrict creation to authenticated users

### UPDATE Policy
- **Name:** `Allow authenticated UPDATE on gestao_scouter_config`
- **Access:** Authenticated users and service_role
- **Purpose:** Restrict modifications to authenticated users

### DELETE Policy
- **Name:** `Allow authenticated DELETE on gestao_scouter_config`
- **Access:** Authenticated users and service_role
- **Purpose:** Restrict deletion to authenticated users

## Indexes

### Active Configuration Index
```sql
CREATE INDEX idx_gestao_scouter_config_active 
  ON public.gestao_scouter_config(active)
  WHERE active = true;
```
Optimizes queries for finding the active configuration.

### Sync Enabled Index
```sql
CREATE INDEX idx_gestao_scouter_config_sync_enabled 
  ON public.gestao_scouter_config(sync_enabled)
  WHERE sync_enabled = true;
```
Optimizes queries for finding configurations with sync enabled.

### Composite Index
```sql
CREATE INDEX idx_gestao_scouter_config_active_sync 
  ON public.gestao_scouter_config(active, sync_enabled)
  WHERE active = true AND sync_enabled = true;
```
Optimizes queries for finding active configurations with sync enabled.

## Triggers

### Updated At Trigger
- **Trigger:** `update_gestao_scouter_config_updated_at`
- **When:** BEFORE UPDATE
- **Function:** `update_updated_at_column()`
- **Purpose:** Automatically updates `updated_at` timestamp on any record modification

### Single Active Config Trigger
- **Trigger:** `ensure_single_active_gestao_scouter_config`
- **When:** BEFORE INSERT OR UPDATE
- **Condition:** NEW.active = true
- **Function:** `enforce_single_active_config()`
- **Purpose:** Ensures only one configuration is active at a time

## Initial Data

The migration includes one example record:
```sql
{
  "project_url": "https://xxxxxxxxxxxxx.supabase.co",
  "anon_key": "REPLACE_WITH_YOUR_ANON_KEY",
  "active": false,
  "sync_enabled": false
}
```

**Important:** This is a placeholder. Update with actual values before activating.

## Usage Examples

### Getting the Active Configuration
```sql
SELECT * FROM public.gestao_scouter_config 
WHERE active = true 
LIMIT 1;
```

### Adding a New Configuration
```sql
INSERT INTO public.gestao_scouter_config (
  project_url,
  anon_key,
  active,
  sync_enabled
) VALUES (
  'https://your-project.supabase.co',
  'your-actual-anon-key',
  true,  -- This will automatically deactivate other configs
  true
);
```

### Updating Configuration
```sql
UPDATE public.gestao_scouter_config 
SET 
  project_url = 'https://new-project.supabase.co',
  anon_key = 'new-anon-key',
  sync_enabled = true
WHERE id = 1;
```

### Enabling/Disabling Sync
```sql
-- Enable sync
UPDATE public.gestao_scouter_config 
SET sync_enabled = true 
WHERE active = true;

-- Disable sync
UPDATE public.gestao_scouter_config 
SET sync_enabled = false 
WHERE active = true;
```

### Switching Active Configuration
```sql
-- Simply set a different config to active
-- The trigger will automatically deactivate the previous one
UPDATE public.gestao_scouter_config 
SET active = true 
WHERE id = 2;
```

## Best Practices

1. **Always verify URL format** before inserting/updating to avoid constraint violations
2. **Keep only necessary configurations** - delete old/unused ones
3. **Test with sync_enabled = false** before enabling synchronization
4. **Monitor the updated_at** field to track configuration changes
5. **Use transactions** when updating multiple configurations

## Security Considerations

1. **Anonymous Key Protection:** While the anon key is stored in plain text, it's designed for public access. Never store service role keys here.
2. **RLS Policies:** Write operations require authentication, preventing unauthorized modifications.
3. **URL Validation:** The CHECK constraint prevents malformed URLs that could cause issues.

## Migration File

Location: `supabase/migrations/tabuladormax_gestao_scouter_config.sql`

To apply this migration:
1. Via Supabase Dashboard: Copy content to SQL Editor and execute
2. Via Supabase CLI: `supabase db push`

## Troubleshooting

### URL Format Error
**Error:** `new row for relation "gestao_scouter_config" violates check constraint "project_url_format_check"`

**Solution:** Ensure URL includes protocol (`http://` or `https://`) and valid domain.

### Multiple Active Configs
This shouldn't happen due to the trigger, but if it does:
```sql
-- Manually fix by deactivating all but one
UPDATE public.gestao_scouter_config SET active = false WHERE id != <desired_active_id>;
UPDATE public.gestao_scouter_config SET active = true WHERE id = <desired_active_id>;
```

### Permission Denied
**Error:** `permission denied for table gestao_scouter_config`

**Solution:** Ensure you're authenticated. Anonymous users can only SELECT, not INSERT/UPDATE/DELETE.

## Related Documentation

- [Quick Setup Guide](./QUICK_SETUP_GESTAO_SCOUTER_CONFIG.md)
- [Architecture Overview](./GESTAO_SCOUTER_CONFIG_ARCHITECTURE.md)
- [Implementation Guide](./IMPLEMENTATION_GESTAO_SCOUTER_CONFIG.md)
- [Main README](./README.md)
