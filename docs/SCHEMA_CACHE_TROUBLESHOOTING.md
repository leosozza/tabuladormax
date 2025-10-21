# Schema Cache Synchronization Error - Troubleshooting Guide

## Problem Description

**Error Message:**
```
Could not find the 'cadastro_existe_foto' column of 'leads' in the schema cache
```

**Context:**
- Date/Time: 2025-10-21 11:50:11
- Event Type: update
- Direction: Supabase → Gestão Scouter
- Lead ID: 632280
- Duration: 226ms
- Status: Error

## Root Cause

This error occurs when:

1. **Schema Mismatch**: The `cadastro_existe_foto` column exists in the TabuladorMax database but not in the Gestão Scouter database, OR
2. **Outdated Schema Cache**: The Supabase PostgREST schema cache is outdated and doesn't reflect the current database schema

## Solutions Implemented

### 1. Enhanced Error Handling in Sync Functions

**Files Modified:**
- `supabase/functions/sync-to-gestao-scouter/index.ts`
- `supabase/functions/sync-from-gestao-scouter/index.ts`

**Changes:**
- Added detection for schema cache errors
- Improved error messages with actionable suggestions
- Added logging of fields attempted during sync
- Only send fields that have values (filtering out null/undefined)

### 2. Schema Validation Helper Functions

**New Migration:** `20251021_add_schema_validation_helper.sql`

**Functions Added:**
- `get_leads_schema_info()`: Returns detailed schema information for the leads table
- `validate_leads_schema()`: Validates that all expected columns exist
- `v_leads_schema_summary` (view): Provides a summary of the leads table schema

**Usage:**
```sql
-- Check schema information
SELECT * FROM get_leads_schema_info();

-- Validate schema
SELECT validate_leads_schema();

-- View schema summary
SELECT * FROM v_leads_schema_summary;
```

### 3. Updated Documentation

**File:** `docs/gestao-scouter-leads-table.sql`

**Additions:**
- Added explicit instructions to reload schema cache after schema changes
- Added troubleshooting section for schema cache errors
- Added verification steps for the `cadastro_existe_foto` column
- Included `NOTIFY pgrst, 'reload schema'` command

## Step-by-Step Resolution Guide

### For Gestão Scouter Database

1. **Verify Column Exists:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'leads' 
     AND column_name = 'cadastro_existe_foto';
   ```

2. **Add Column if Missing:**
   ```sql
   ALTER TABLE public.leads 
   ADD COLUMN IF NOT EXISTS cadastro_existe_foto BOOLEAN DEFAULT false;
   ```

3. **Reload Schema Cache (CRITICAL):**
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
   
   OR via Supabase Dashboard:
   - Go to Settings > API > PostgREST Settings
   - Click "Reload schema cache"

4. **Verify Schema:**
   ```sql
   SELECT validate_leads_schema();
   ```

### For TabuladorMax Database

1. **Verify Column Exists:**
   The column should already exist (added in migration `20251016134042`). Verify with:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'leads' 
     AND column_name = 'cadastro_existe_foto';
   ```

2. **Reload Schema Cache:**
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

## Prevention Measures

### 1. Always Reload Schema Cache After Changes

After any DDL operations (ALTER TABLE, CREATE TABLE, etc.), always run:
```sql
NOTIFY pgrst, 'reload schema';
```

### 2. Use Schema Validation Before Sync

Run validation before enabling synchronization:
```sql
-- In TabuladorMax
SELECT validate_leads_schema();

-- In Gestão Scouter (if function exists)
SELECT validate_leads_schema();
```

### 3. Monitor Sync Events

Check for schema-related errors regularly:
```sql
SELECT 
  event_type,
  direction,
  lead_id,
  status,
  error_message,
  created_at
FROM sync_events
WHERE error_message LIKE '%schema%' 
   OR error_message LIKE '%column%'
ORDER BY created_at DESC
LIMIT 20;
```

### 4. Field Filtering

The improved sync functions now:
- Only send fields that have values
- Filter out null/undefined fields
- Log which fields were attempted
- Provide detailed error messages

## Testing Synchronization

### 1. Test with Schema Validation

Before testing sync, validate schemas on both sides:
```sql
-- Run on both TabuladorMax and Gestão Scouter
SELECT validate_leads_schema();
```

### 2. Test Single Lead Sync

```javascript
// Via TabuladorMax
const { data, error } = await supabase.functions.invoke('sync-to-gestao-scouter', {
  body: {
    lead: {
      id: 632280, // The lead that previously failed
      name: 'Test Lead',
      cadastro_existe_foto: true,
      // ... other fields
    },
    source: 'supabase'
  }
});

console.log('Result:', data);
console.log('Error:', error);
```

### 3. Monitor Logs

Check Edge Function logs in Supabase Dashboard:
1. Go to Edge Functions
2. Select the sync function
3. View logs for detailed error information

## Monitoring and Alerting

### 1. Schema Errors Query

```sql
-- Get recent schema errors
SELECT 
  lead_id,
  error_message,
  created_at,
  sync_duration_ms
FROM sync_events
WHERE (
  error_message LIKE '%schema%' 
  OR error_message LIKE '%column%'
  OR error_message LIKE '%Could not find%'
)
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### 2. Success Rate

```sql
-- Calculate sync success rate
SELECT 
  direction,
  COUNT(*) FILTER (WHERE status = 'success') as success_count,
  COUNT(*) FILTER (WHERE status = 'error') as error_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'success') / COUNT(*),
    2
  ) as success_rate
FROM sync_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY direction;
```

## Common Issues and Solutions

### Issue 1: Column exists but still getting error

**Solution:**
1. Reload schema cache: `NOTIFY pgrst, 'reload schema';`
2. Wait 5-10 seconds for cache to reload
3. Retry synchronization

### Issue 2: Multiple columns missing

**Solution:**
1. Run the complete setup SQL from `docs/gestao-scouter-leads-table.sql`
2. Reload schema cache
3. Verify with `validate_leads_schema()`

### Issue 3: Synchronization loop

**Solution:**
The sync functions already prevent loops by checking `sync_source`. Ensure:
- Never set `sync_source` to null manually
- Check trigger conditions in both databases

### Issue 4: Performance degradation

**Solution:**
1. Check indexes: `SELECT * FROM pg_indexes WHERE tablename = 'leads';`
2. Ensure `updated_at`, `sync_status`, and `sync_source` are indexed
3. Monitor sync duration in `sync_events` table

## References

- [Supabase PostgREST Schema Cache](https://postgrest.org/en/stable/schema_cache.html)
- [PostgreSQL Information Schema](https://www.postgresql.org/docs/current/information-schema.html)
- Migration: `20251016134042_30bf5474-d21b-4252-8a1c-2f793a73d0c6.sql` (added column)
- Migration: `20251021_add_schema_validation_helper.sql` (validation functions)

## Support

If issues persist after following this guide:

1. Check sync_events table for detailed error logs
2. Verify both database schemas match
3. Ensure PostgREST schema cache is reloaded on both sides
4. Check that all required fields exist in both databases
5. Review Edge Function logs for detailed error information
