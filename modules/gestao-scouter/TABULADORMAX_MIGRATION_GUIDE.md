# TabuladorMax Migration to LovableCloud - Setup Guide

## Overview

This guide provides step-by-step instructions for configuring synchronization between **Gestão Scouter** and **TabuladorMax** after the migration of TabuladorMax to LovableCloud.

---

## 🔴 Task 1: Update SERVICE_ROLE_KEY Environment Variable

### Why is this critical?
The SERVICE_ROLE_KEY bypasses Row Level Security (RLS) policies and has full database access, which is essential for cross-project synchronization.

### Steps:

1. **Obtain the SERVICE_ROLE_KEY from TabuladorMax:**
   - Access the TabuladorMax project: https://lovable.dev/projects/fa1475f9-ea99-4684-a990-84bdf96f348a
   - Navigate to **Settings → Backend → Secrets**
   - Copy the **SERVICE_ROLE_KEY** (NOT the anon/publishable key)

2. **Update TABULADOR_SERVICE_KEY in Gestão Scouter:**
   - Return to this project (Gestão Scouter)
   - Navigate to **Settings → Backend → Secrets**
   - Update or create the secret `TABULADOR_SERVICE_KEY` with the copied SERVICE_ROLE_KEY

3. **Update local .env file (for script execution):**
   ```bash
   # Edit .env file
   TABULADOR_SERVICE_KEY=<paste_service_role_key_here>
   ```

**⚠️ Security Note:** Never commit SERVICE_ROLE_KEY to version control. It should only be in:
- Supabase Dashboard secrets (for Edge Functions)
- Local .env file (for scripts, excluded by .gitignore)

---

## 🟡 Task 2: Apply SQL for Incremental Sync Setup

### Execute SQL in TabuladorMax Database

**Option A: Use the complete SQL script (Recommended)**

Execute the file: `scripts/sql/tabuladormax_incremental_sync_setup.sql`

This script includes:
- Column creation with fallback logic
- Index for performance
- Trigger function and trigger
- Data population for existing records
- Comprehensive verification

**Option B: Execute SQL commands manually**

Access TabuladorMax SQL Editor and run:

```sql
-- 1. Add updated_at column if it doesn't exist
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create index for sync query performance
CREATE INDEX IF NOT EXISTS idx_leads_updated_at 
ON public.leads(updated_at DESC);

-- 3. Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to update on every UPDATE
DROP TRIGGER IF EXISTS set_updated_at ON public.leads;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Populate updated_at for existing records with fallback
UPDATE public.leads
SET updated_at = COALESCE(
  updated_at,
  modificado,
  criado,
  NOW()
)
WHERE updated_at IS NULL;
```

### Verify the Setup

```sql
-- Verification query
SELECT 
  COUNT(*) as total_leads,
  COUNT(updated_at) as com_updated_at,
  MAX(updated_at) as ultimo_update,
  MIN(updated_at) as primeiro_update
FROM public.leads;

-- Expected result:
-- - total_leads: 218709 (or current count)
-- - com_updated_at: 218709 (should match total)
-- - ultimo_update: recent date
-- - primeiro_update: older date
```

---

## 🟢 Task 3: Test Sync Functionality

### Prerequisites
- SERVICE_ROLE_KEY updated in secrets
- SQL migration applied to TabuladorMax
- Edge Functions deployed (if not already)

### Test 1: Connection Test

Test basic connectivity to TabuladorMax:

```bash
curl -X POST https://jstsrgyxrrlklnzgsihd.supabase.co/functions/v1/test-tabulador-connection \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdHNyZ3l4cnJsa2xuemdzaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIyOTEsImV4cCI6MjA3NjUxODI5MX0.0uh9Uid5HZ3_TQB0877ncfhlYJwhxdMsQBReHZW2QLg" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "tabuladorUrl": "https://gkvvtfqfggddzotxltxf.supabase.co",
  "timestamp": "2025-10-20T15:30:00.000Z"
}
```

### Test 2: Diagnostic Check

Run comprehensive diagnostics:

```bash
curl -X POST https://jstsrgyxrrlklnzgsihd.supabase.co/functions/v1/diagnose-tabulador-sync \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdHNyZ3l4cnJsa2xuemdzaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIyOTEsImV4cCI6MjA3NjUxODI5MX0.0uh9Uid5HZ3_TQB0877ncfhlYJwhxdMsQBReHZW2QLg" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "checks": {
    "tabuladorConnection": "✅ Connected",
    "leadsTable": "✅ Found",
    "updatedAtColumn": "✅ Present",
    "triggerExists": "✅ Active",
    "indexExists": "✅ Created",
    "recordsCount": 218709
  }
}
```

### Test 3: Sync Pull (TabuladorMax → Gestão Scouter)

Pull recent changes from TabuladorMax:

```bash
curl -X POST "https://jstsrgyxrrlklnzgsihd.supabase.co/functions/v1/sync-tabulador?direction=pull" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdHNyZ3l4cnJsa2xuemdzaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIyOTEsImV4cCI6MjA3NjUxODI5MX0.0uh9Uid5HZ3_TQB0877ncfhlYJwhxdMsQBReHZW2QLg" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "direction": "pull",
  "records_synced": 218709,
  "conflicts_resolved": 0,
  "errors": [],
  "processing_time_ms": 15000,
  "timestamp": "2025-10-20T15:30:00.000Z"
}
```

### Test 4: Run Migration Script (Alternative)

Use the Node.js script for initial data migration:

```bash
npm run migrate:leads
```

**Expected Output:**
```
🚀 Iniciando sincronização TabuladorMax Leads → Gestão Scouter Leads

📋 Fonte: TabuladorMax (tabela leads)
🎯 Destino: Gestão Scouter (tabela leads)
================================================================================
✅ Clientes Supabase configurados
   TabuladorMax: https://gkvvtfqfggddzotxltxf.supabase.co
   Gestão Scouter: https://ngestyxtopvfeyenyvgt.supabase.co

📥 Buscando leads da tabela de origem...
   Página 1: 1000 registros
   ...
✅ Total de 218709 leads encontrados

🔄 Iniciando processamento em lotes...
...
✅ MIGRAÇÃO CONCLUÍDA
```

---

## 🔵 Task 4: Logs and Edge Functions

### Check Edge Function Logs

1. **Access Supabase Dashboard**
   - Go to **Edge Functions** section
   - Select the function (e.g., `sync-tabulador`, `test-tabulador-connection`)
   - View **Logs** tab

2. **Monitor Sync Logs in Database**

Query sync logs:
```sql
SELECT 
  endpoint,
  table_name,
  status,
  records_count,
  execution_time_ms,
  error_message,
  created_at
FROM public.sync_logs_detailed
ORDER BY created_at DESC
LIMIT 20;
```

3. **Check Sync Status**

```sql
SELECT 
  id,
  project_name,
  last_sync_at,
  last_sync_success,
  total_records,
  last_full_sync_at
FROM public.sync_status
WHERE id = 'tabulador_max_leads';
```

### Common Log Messages

**Success:**
```
✅ Sync completed: 1000 records processed in 2500ms
✅ Updated leads table with 1000 records
```

**Warnings:**
```
⚠️ Some records skipped due to invalid data
⚠️ Partial sync: 950/1000 records processed
```

**Errors:**
```
❌ Connection failed: Invalid SERVICE_ROLE_KEY
❌ Column 'updated_at' does not exist in TabuladorMax
❌ RLS policy violation: insufficient permissions
```

### Validate syncLeadsToFichas.ts Script

The script `scripts/syncLeadsToFichas.ts` is compatible with the new setup:

**Key features:**
- ✅ Uses `updated_at` field correctly (line 101, 125, 179)
- ✅ Normalizes lead data with fallback logic
- ✅ Supports batch processing (1000 records per batch)
- ✅ Includes retry mechanism (3 attempts)
- ✅ Provides detailed progress reporting

**Verify compatibility:**
```bash
npm run verify:leads-setup
```

---

## 🟣 Task 5: Verify SQL Migrations

### Check Applied Migrations

Ensure all SQL migrations are applied in the correct order:

```bash
# List migration files
ls -la supabase/migrations/ | grep leads
```

**Key migrations for leads table:**
- ✅ `20251018_sync_leads_tabMax.sql` - Creates leads table with sync infrastructure
- ✅ `20251018_migrate_fichas_to_leads.sql` - Migrates data from fichas to leads
- ✅ `20251018_sync_fichas_leads_schema.sql` - Ensures schema compatibility
- ✅ `20251018_ensure_leads_deleted_column.sql` - Adds deleted column

### Verify Schema Alignment

Check that Gestão Scouter's leads table has required columns:

```sql
-- Query column information
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'leads'
  AND column_name IN ('id', 'updated_at', 'deleted', 'sync_source', 'last_synced_at')
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` - TEXT (PRIMARY KEY)
- `updated_at` - TIMESTAMPTZ (with default NOW())
- `deleted` - BOOLEAN (default false)
- `sync_source` - TEXT (default 'Gestao')
- `last_synced_at` - TIMESTAMPTZ (nullable)

### Verify Triggers and Functions

```sql
-- Check triggers on leads table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'leads'
  AND event_object_schema = 'public';
```

**Expected triggers:**
- `trg_leads_updated_at` - Updates updated_at on UPDATE
- `trg_leads_enqueue_sync` - Enqueues changes for sync

### Verify Indexes

```sql
-- Check indexes on leads table
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'leads'
  AND schemaname = 'public'
  AND indexname LIKE '%updated_at%';
```

**Expected index:**
- `idx_leads_updated_at` - Optimizes sync queries

---

## 📊 Troubleshooting

### Issue: "Invalid API key" or "403 Forbidden"

**Solution:**
- ✅ Ensure you're using **SERVICE_ROLE_KEY**, not anon/publishable key
- ✅ Update `TABULADOR_SERVICE_KEY` in Supabase Dashboard secrets
- ✅ Restart Edge Functions after updating secrets

### Issue: "Column 'updated_at' does not exist"

**Solution:**
- ✅ Execute the SQL migration in TabuladorMax database
- ✅ Verify column exists: `SELECT updated_at FROM public.leads LIMIT 1;`

### Issue: "Table 'leads' not found"

**Solution:**
- ✅ Verify table name in TabuladorMax (might be `Leads` with capital L)
- ✅ Check if table was renamed or deleted
- ✅ Review Edge Function logs for table name variations tried

### Issue: Sync returns 0 records

**Solution:**
- ✅ Check if `updated_at` is populated: `SELECT COUNT(*) FROM leads WHERE updated_at IS NULL;`
- ✅ Verify `last_sync_at` in `sync_status` table isn't too recent
- ✅ Try with an older sync date to force full sync

### Issue: RLS policy violation

**Solution:**
- ✅ Confirm using SERVICE_ROLE_KEY (bypasses RLS)
- ✅ If needed, add explicit policy for service_role:
```sql
CREATE POLICY "Allow service role full access"
ON public.leads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

## ✅ Completion Checklist

- [ ] 1. SERVICE_ROLE_KEY obtained from TabuladorMax
- [ ] 2. TABULADOR_SERVICE_KEY updated in Gestão Scouter secrets
- [ ] 3. TABULADOR_SERVICE_KEY updated in local .env file
- [ ] 4. SQL migration executed in TabuladorMax
- [ ] 5. Verification query confirms all leads have `updated_at`
- [ ] 6. Trigger and index created in TabuladorMax
- [ ] 7. Connection test successful (curl test-tabulador-connection)
- [ ] 8. Diagnostic check successful (curl diagnose-tabulador-sync)
- [ ] 9. Sync pull test successful (curl sync-tabulador?direction=pull)
- [ ] 10. Edge Function logs show no errors
- [ ] 11. Sync logs in database show successful syncs
- [ ] 12. SQL migrations verified in Gestão Scouter
- [ ] 13. Schema alignment confirmed (updated_at column exists)
- [ ] 14. Triggers and indexes verified in both databases

---

## 📚 Additional Resources

- [SQL_TABULADORMAX_SETUP.md](./SQL_TABULADORMAX_SETUP.md) - Detailed SQL setup instructions
- [DEPLOYMENT_SYNC_BIDIRECTIONAL.md](./DEPLOYMENT_SYNC_BIDIRECTIONAL.md) - Bidirectional sync architecture
- [SYNC_DIAGNOSTICS_GUIDE.md](./SYNC_DIAGNOSTICS_GUIDE.md) - Diagnostic tools and troubleshooting
- [scripts/sql/tabuladormax_incremental_sync_setup.sql](./scripts/sql/tabuladormax_incremental_sync_setup.sql) - Complete SQL script

---

## 🔒 Security Best Practices

1. **Never commit service role keys** to version control
2. **Rotate keys periodically** in both projects
3. **Monitor Edge Function logs** for suspicious activity
4. **Use RLS policies** on all tables except sync infrastructure
5. **Audit sync logs** regularly for anomalies
6. **Test in development** before applying to production

---

## 📝 Notes

- The column name is **`updated_at`** (not `atualizado_at` - this was a typo in the original requirement)
- All SQL scripts use consistent English naming conventions
- The `updated_at` column is automatically managed by triggers
- Incremental sync uses `updated_at` > `last_sync_at` for efficiency
- Full sync can be forced by setting `last_sync_at` to an older date
