# Schema Cache Synchronization Fix - Quick Reference

## Summary of Changes

This fix addresses the synchronization error: "Could not find the 'cadastro_existe_foto' column of 'leads' in the schema cache"

## What Was Fixed

### 1. ✅ Enhanced Sync Functions
- **Dynamic field filtering**: Only sends fields with values
- **Schema error detection**: Identifies and logs schema mismatches
- **Better error messages**: Provides actionable troubleshooting steps
- **Detailed logging**: Logs attempted fields for debugging

### 2. ✅ Schema Validation Tools
Created SQL functions to validate schema compatibility:
- `get_leads_schema_info()` - Get schema details
- `validate_leads_schema()` - Check for missing columns
- `v_leads_schema_summary` - View schema status

### 3. ✅ Comprehensive Documentation
- Updated setup guide with schema cache reload instructions
- Created detailed troubleshooting guide
- Added prevention best practices

## How to Deploy

### Step 1: Apply Migration (TabuladorMax Database)
```bash
# The migration will be applied automatically on next deployment
# File: supabase/migrations/20251021_add_schema_validation_helper.sql
```

### Step 2: Update Gestão Scouter Database
Run the updated SQL from: `docs/gestao-scouter-leads-table.sql`

Key steps:
1. Ensure `cadastro_existe_foto` column exists
2. **IMPORTANT**: Reload schema cache
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
   Or via Dashboard: Settings > API > PostgREST Settings > Reload schema cache

### Step 3: Validate Schemas
```sql
-- Run on both databases
SELECT validate_leads_schema();
```

Expected result:
```json
{
  "valid": true,
  "missing_columns": [],
  "total_expected": 50,
  "total_missing": 0
}
```

### Step 4: Test Synchronization
Use the sync monitor in the TabuladorMax UI to test a lead sync.

## Quick Troubleshooting

### If you get schema cache errors:

1. **Reload Schema Cache** (most common fix):
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

2. **Verify Column Exists**:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'leads' AND column_name = 'cadastro_existe_foto';
   ```

3. **Add Missing Column** (if needed):
   ```sql
   ALTER TABLE public.leads 
   ADD COLUMN IF NOT EXISTS cadastro_existe_foto BOOLEAN DEFAULT false;
   
   -- Then reload cache!
   NOTIFY pgrst, 'reload schema';
   ```

## Files Changed

1. `supabase/functions/sync-to-gestao-scouter/index.ts` - Enhanced error handling
2. `supabase/functions/sync-from-gestao-scouter/index.ts` - Enhanced error handling
3. `supabase/migrations/20251021_add_schema_validation_helper.sql` - Validation functions
4. `docs/gestao-scouter-leads-table.sql` - Updated setup guide
5. `docs/SCHEMA_CACHE_TROUBLESHOOTING.md` - Troubleshooting guide
6. `IMPLEMENTATION_SUMMARY_SCHEMA_CACHE_FIX.md` - Detailed implementation summary

## Key Benefits

- ✅ **Prevents future errors**: Only sends existing fields
- ✅ **Better debugging**: Detailed error messages and logging
- ✅ **Easy validation**: SQL functions to check schema
- ✅ **Comprehensive docs**: Clear troubleshooting steps

## Testing Results

- ✅ Build: Successful
- ✅ Tests: All 257 tests passed
- ✅ Linter: No new errors introduced

## Monitoring

After deployment, monitor sync errors:

```sql
SELECT 
  lead_id,
  error_message,
  created_at,
  sync_duration_ms
FROM sync_events
WHERE error_message LIKE '%schema%'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## Need More Help?

See the complete guides:
- 📖 Full implementation details: `IMPLEMENTATION_SUMMARY_SCHEMA_CACHE_FIX.md`
- 🔧 Troubleshooting guide: `docs/SCHEMA_CACHE_TROUBLESHOOTING.md`
- 🚀 Setup guide: `docs/gestao-scouter-leads-table.sql`
