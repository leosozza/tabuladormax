# Schema Cache Synchronization Fix - Implementation Summary

## Overview

This document summarizes the changes made to resolve the schema cache synchronization error that occurred on 2025-10-21.

## Problem Statement

**Error:** "Could not find the 'cadastro_existe_foto' column of 'leads' in the schema cache"

**Context:**
- Direction: Supabase → Gestão Scouter
- Lead ID: 632280
- Duration: 226ms
- Status: Error

**Root Cause:**
The error occurred because the Gestão Scouter database's PostgREST schema cache was not updated after the `cadastro_existe_foto` column was added to the leads table. This is a common issue when schema changes are made but the cache is not refreshed.

## Solution Implemented

### 1. Enhanced Error Handling in Sync Functions

**Files Modified:**
- `supabase/functions/sync-to-gestao-scouter/index.ts`
- `supabase/functions/sync-from-gestao-scouter/index.ts`

**Key Improvements:**

#### A. Dynamic Field Filtering
- Implemented `buildLeadData()` function that only includes fields with defined values
- Filters out `null` and `undefined` fields to prevent schema conflicts
- Reduces payload size and improves compatibility

**Before:**
```typescript
const leadData = {
  id: lead.id,
  name: lead.name,
  cadastro_existe_foto: lead.cadastro_existe_foto,
  // ... all fields, even if null/undefined
};
```

**After:**
```typescript
const buildLeadData = (leadSource: any) => {
  const data: Record<string, any> = {
    id: leadSource.id,
    updated_at: new Date().toISOString(),
    last_sync_at: new Date().toISOString(),
    sync_source: 'tabuladormax'
  };
  
  const optionalFields = { /* all optional fields */ };
  
  // Only add fields with values
  for (const [key, value] of Object.entries(optionalFields)) {
    if (value !== undefined && value !== null) {
      data[key] = value;
    }
  }
  
  return data;
};
```

#### B. Schema Error Detection and Logging
- Detects schema cache errors by checking error messages and codes
- Provides detailed logging of attempted fields
- Offers actionable suggestions for resolution

**Code:**
```typescript
if (leadError) {
  const isSchemaCacheError = leadError.message?.includes('schema cache') || 
                              leadError.message?.includes('column') ||
                              leadError.code === 'PGRST204' ||
                              leadError.code === '42703';
  
  console.error('❌ Erro ao sincronizar com gestao-scouter:', {
    error: leadError,
    leadId: lead.id,
    isSchemaCacheError,
    fieldsAttempted: Object.keys(leadData)
  });
  
  if (isSchemaCacheError) {
    const schemaErrorMsg = `Schema mismatch detected: ${leadError.message}. ` +
      `Please ensure the 'leads' table in Gestão Scouter has all required columns. ` +
      `You may need to run the schema update SQL from the integration instructions.`;
    
    console.error('💡 Schema Error Details:', {
      suggestion: schemaErrorMsg,
      fieldsInPayload: Object.keys(leadData),
      recommendedAction: 'Update Gestão Scouter schema to match TabuladorMax schema'
    });
  }
  
  // Enhanced error message for sync_events
  throw new Error(isSchemaCacheError 
    ? `Schema mismatch: ${leadError.message}. Please update Gestão Scouter database schema.`
    : `Erro ao sincronizar: ${leadError.message} (code: ${leadError.code})`);
}
```

### 2. Schema Validation Helper Functions

**New Migration:** `supabase/migrations/20251021_add_schema_validation_helper.sql`

**Functions Added:**

#### A. `get_leads_schema_info()`
Returns detailed schema information for the leads table.

**Usage:**
```sql
SELECT * FROM get_leads_schema_info();
```

**Returns:**
| column_name | data_type | is_nullable | column_default |
|------------|-----------|-------------|----------------|
| id | bigint | NO | ... |
| cadastro_existe_foto | boolean | YES | false |
| ... | ... | ... | ... |

#### B. `validate_leads_schema()`
Validates that all expected columns exist in the leads table.

**Usage:**
```sql
SELECT validate_leads_schema();
```

**Returns:**
```json
{
  "valid": true,
  "missing_columns": [],
  "total_expected": 50,
  "total_missing": 0,
  "checked_at": "2025-10-21T15:30:00Z"
}
```

#### C. `v_leads_schema_summary` (View)
Provides a summary view of the leads table schema with status indicators.

**Usage:**
```sql
SELECT * FROM v_leads_schema_summary;
```

### 3. Updated Documentation

#### A. Gestão Scouter Setup SQL
**File:** `docs/gestao-scouter-leads-table.sql`

**Additions:**
1. Explicit instructions to reload schema cache after schema changes
2. `NOTIFY pgrst, 'reload schema'` command added
3. Troubleshooting section for schema cache errors
4. Verification steps for the `cadastro_existe_foto` column
5. Step-by-step guide for handling schema mismatches

**Key Section Added:**
```sql
-- ============================================
-- 8. RECARREGAR SCHEMA CACHE (MUITO IMPORTANTE!)
-- ============================================
-- Após criar/atualizar a tabela, você DEVE recarregar o schema cache
-- Execute o comando abaixo OU use a interface do Supabase:
NOTIFY pgrst, 'reload schema';

-- Alternativamente, vá para:
-- Settings > API > PostgREST Settings > Reload schema cache
```

#### B. Comprehensive Troubleshooting Guide
**File:** `docs/SCHEMA_CACHE_TROUBLESHOOTING.md`

**Contents:**
1. Problem description and root cause analysis
2. Step-by-step resolution guide for both databases
3. Prevention measures and best practices
4. Testing procedures
5. Monitoring and alerting queries
6. Common issues and solutions

### 4. Improved Sync Event Logging

Both sync functions now log more detailed error information to the `sync_events` table:

```typescript
await supabase.from('sync_events').insert({
  event_type: 'update',
  direction: 'supabase_to_gestao_scouter',
  lead_id: lead.id,
  status: 'error',
  error_message: isSchemaCacheError 
    ? `Schema mismatch: ${leadError.message}. Please update Gestão Scouter schema.`
    : `${leadError.message} (code: ${leadError.code}, hint: ${leadError.hint || 'N/A'})`,
  sync_duration_ms: Date.now() - startTime
});
```

## Benefits

### 1. Improved Robustness
- Handles missing columns gracefully
- Reduces synchronization failures
- Better error recovery

### 2. Better Debugging
- Detailed error messages with context
- Field-level logging
- Actionable error messages

### 3. Easier Maintenance
- Schema validation tools
- Self-documenting errors
- Clear troubleshooting guide

### 4. Prevention
- Only sends fields that have values
- Reduces unnecessary data transfer
- Minimizes schema mismatch opportunities

## Testing Recommendations

### 1. Schema Validation Test
```sql
-- Run on both TabuladorMax and Gestão Scouter
SELECT validate_leads_schema();
```

### 2. Manual Sync Test
```javascript
const { data, error } = await supabase.functions.invoke('sync-to-gestao-scouter', {
  body: {
    lead: {
      id: 632280,
      name: 'Test Lead',
      cadastro_existe_foto: true
    },
    source: 'supabase'
  }
});
```

### 3. Monitor Sync Events
```sql
SELECT 
  lead_id,
  error_message,
  created_at,
  sync_duration_ms
FROM sync_events
WHERE error_message LIKE '%schema%'
ORDER BY created_at DESC
LIMIT 10;
```

## Deployment Checklist

- [x] Update sync functions with error handling
- [x] Create schema validation migration
- [x] Update documentation
- [x] Create troubleshooting guide
- [ ] Deploy migration to TabuladorMax database
- [ ] Deploy migration to Gestão Scouter database
- [ ] Reload schema cache on both databases
- [ ] Validate schemas on both databases
- [ ] Test synchronization with sample lead
- [ ] Monitor sync_events for errors

## Future Improvements

1. **Automated Schema Sync**
   - Automatic schema cache reload after migrations
   - Scheduled schema validation checks

2. **Schema Drift Detection**
   - Periodic comparison of schemas between databases
   - Alerts when schemas are out of sync

3. **Retry Logic**
   - Automatic retry for transient schema cache errors
   - Exponential backoff for failed syncs

4. **Field Mapping Configuration**
   - Allow custom field mappings between databases
   - Support for field transformations

## References

- Error Report: Issue created on 2025-10-21
- Migration: `20251016134042_30bf5474-d21b-4252-8a1c-2f793a73d0c6.sql` (added column)
- Migration: `20251021_add_schema_validation_helper.sql` (validation functions)
- Documentation: `docs/SCHEMA_CACHE_TROUBLESHOOTING.md`
- Setup Guide: `docs/gestao-scouter-leads-table.sql`

## Support

For additional support or questions:
1. Review the troubleshooting guide
2. Check sync_events table for detailed logs
3. Validate schemas using provided functions
4. Ensure schema cache is reloaded after any schema changes
