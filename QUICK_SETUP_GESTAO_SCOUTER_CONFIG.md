# Quick Setup - Gestão Scouter Config

**Fast-track guide to configure Gestão Scouter integration in TabuladorMax**

## Prerequisites

- ✅ Access to TabuladorMax Supabase project
- ✅ Gestão Scouter project URL and anon key
- ✅ Authenticated user account in TabuladorMax
- ✅ Migration file already applied

## 5-Minute Setup

### Step 1: Apply Migration (if not done)

**Option A: Supabase Dashboard**
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your TabuladorMax project
3. Navigate to **SQL Editor**
4. Open the migration file: `supabase/migrations/tabuladormax_gestao_scouter_config.sql`
5. Copy and paste the entire content
6. Click **Run**

**Option B: Supabase CLI**
```bash
cd /path/to/tabuladormax
supabase link --project-ref your-project-ref
supabase db push
```

### Step 2: Get Gestão Scouter Credentials

1. Login to your Gestão Scouter Supabase project
2. Go to **Settings** → **API**
3. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

### Step 3: Configure TabuladorMax

**Option A: Via SQL Editor (Recommended)**
```sql
-- Update the example configuration with your values
UPDATE public.gestao_scouter_config 
SET 
  project_url = 'https://your-project.supabase.co',
  anon_key = 'your-actual-anon-key-here',
  active = true,
  sync_enabled = false  -- Keep disabled until tested
WHERE id = 1;
```

**Option B: Insert New Configuration**
```sql
INSERT INTO public.gestao_scouter_config (
  project_url,
  anon_key,
  active,
  sync_enabled
) VALUES (
  'https://your-project.supabase.co',
  'your-actual-anon-key-here',
  true,
  false  -- Start with sync disabled
);
```

### Step 4: Verify Configuration

```sql
-- Check if configuration is properly set
SELECT 
  id,
  project_url,
  LEFT(anon_key, 20) || '...' as anon_key_preview,
  active,
  sync_enabled,
  created_at,
  updated_at
FROM public.gestao_scouter_config
WHERE active = true;
```

Expected result:
- One row returned
- `active = true`
- `project_url` contains your Gestão Scouter URL
- `anon_key` is not empty

### Step 5: Test Connection (Optional)

Before enabling sync, test the connection in your application:

```javascript
// In your TabuladorMax application
import { supabase } from '@/integrations/supabase/client';

async function testGestaoScouterConnection() {
  // Get active config
  const { data: config } = await supabase
    .from('gestao_scouter_config')
    .select('*')
    .eq('active', true)
    .single();
  
  if (!config) {
    console.error('No active configuration found');
    return;
  }
  
  // Test connection to Gestão Scouter
  const { createClient } = await import('@supabase/supabase-js');
  const gestaoClient = createClient(config.project_url, config.anon_key);
  
  // Try a simple query
  const { data, error } = await gestaoClient
    .from('fichas')  // or any table you have access to
    .select('count')
    .limit(1);
  
  if (error) {
    console.error('Connection test failed:', error);
  } else {
    console.log('Connection successful!', data);
  }
}
```

### Step 6: Enable Synchronization

Once you've tested and verified the connection:

```sql
UPDATE public.gestao_scouter_config 
SET sync_enabled = true 
WHERE active = true;
```

## Quick Reference Commands

### View Current Configuration
```sql
SELECT * FROM public.gestao_scouter_config WHERE active = true;
```

### Disable Sync Temporarily
```sql
UPDATE public.gestao_scouter_config SET sync_enabled = false WHERE active = true;
```

### Enable Sync
```sql
UPDATE public.gestao_scouter_config SET sync_enabled = true WHERE active = true;
```

### Switch to Different Configuration
```sql
UPDATE public.gestao_scouter_config SET active = true WHERE id = <config_id>;
```

### Add New Configuration
```sql
INSERT INTO public.gestao_scouter_config (project_url, anon_key, active)
VALUES ('https://new-project.supabase.co', 'new-anon-key', true);
```

## Common Issues & Quick Fixes

### ❌ URL Format Error
**Error:** `violates check constraint "project_url_format_check"`

**Fix:** Ensure URL includes `https://` or `http://`
```sql
-- Wrong
project_url = 'example.supabase.co'

-- Correct
project_url = 'https://example.supabase.co'
```

### ❌ Permission Denied
**Error:** `permission denied for table gestao_scouter_config`

**Fix:** Ensure you're logged in as an authenticated user. Anonymous users can only read.

### ❌ No Configuration Found
**Error:** Application can't find active configuration

**Fix:** Verify at least one config is active
```sql
-- Check for active config
SELECT COUNT(*) FROM public.gestao_scouter_config WHERE active = true;

-- If count is 0, activate one
UPDATE public.gestao_scouter_config SET active = true WHERE id = 1;
```

### ❌ Multiple Active Configurations
**Issue:** Multiple configs showing as active (shouldn't happen)

**Fix:** Trigger should handle this, but if needed:
```sql
-- Reset all to inactive
UPDATE public.gestao_scouter_config SET active = false;

-- Activate desired one
UPDATE public.gestao_scouter_config SET active = true WHERE id = <desired_id>;
```

## Environment-Specific Setup

### Development
```sql
INSERT INTO public.gestao_scouter_config (
  project_url,
  anon_key,
  active,
  sync_enabled
) VALUES (
  'https://dev-gestao-scouter.supabase.co',
  'dev-anon-key',
  true,
  false  -- Keep sync disabled in dev
);
```

### Staging
```sql
INSERT INTO public.gestao_scouter_config (
  project_url,
  anon_key,
  active,
  sync_enabled
) VALUES (
  'https://staging-gestao-scouter.supabase.co',
  'staging-anon-key',
  true,
  true  -- Enable sync for staging tests
);
```

### Production
```sql
INSERT INTO public.gestao_scouter_config (
  project_url,
  anon_key,
  active,
  sync_enabled
) VALUES (
  'https://prod-gestao-scouter.supabase.co',
  'prod-anon-key',
  true,
  true  -- Enable sync in production
);
```

## Next Steps

1. ✅ Configuration complete
2. 📖 Read [Architecture Overview](./GESTAO_SCOUTER_CONFIG_ARCHITECTURE.md)
3. 💻 Check [Implementation Guide](./IMPLEMENTATION_GESTAO_SCOUTER_CONFIG.md)
4. 🔧 Review [Detailed Setup Documentation](./TABULADORMAX_CONFIG_TABLE_SETUP.md)

## Support

For issues or questions:
1. Check [Troubleshooting](./TABULADORMAX_CONFIG_TABLE_SETUP.md#troubleshooting)
2. Review [Gestão Scouter Sync Guide](./docs/guides/gestao-scouter-sync-guide.md)
3. Open an issue on GitHub

---

**Setup Time:** ~5 minutes  
**Difficulty:** Easy  
**Prerequisites:** Basic SQL knowledge
