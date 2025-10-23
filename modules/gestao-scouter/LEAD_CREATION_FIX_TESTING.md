# Testing Guide: Lead Creation Fix

## Overview
This document explains how to test the fix for the lead creation error related to the 'id' field in the 'fichas' table.

## Problem Fixed
Previously, creating a new lead would fail with a constraint violation error because:
- The `id` field was defined as `text primary key` without a default value
- The application didn't provide an `id` value during insert operations
- PostgreSQL requires values for NOT NULL columns without defaults

## Solution Implemented
1. **Database Migration**: Created `20251018_fix_fichas_id_auto_generation.sql` which:
   - Keeps the `id` column as TEXT (compatible with numeric IDs from TabuladorMax)
   - Adds `DEFAULT gen_random_uuid()::text` for automatic UUID string generation
   - Preserves existing data (no data migration needed)

2. **Code Changes**: (Minimal - already compatible)
   - `leadsRepo.ts`: Added `criado` and `raw` fields to inserts
   - Type definitions: Already support `string | number` for IDs
   - Normalization: Already handles both string and number IDs

**Key Advantage**: TEXT type accepts both UUID strings (for local creation) and numeric strings (from TabuladorMax sync like "558906").

## How to Test

### Prerequisites
1. Ensure you have a local Supabase instance or access to a test database
2. Run the migration: `supabase migration up` or apply via Supabase dashboard

### Test 1: Create a New Lead via UI
1. Start the application: `npm run dev`
2. Navigate to the Leads page
3. Click "Criar Novo Lead" button
4. Fill in the required fields:
   - Nome: Test Lead
   - Telefone: (11) 99999-9999
   - Email: test@example.com (optional)
5. Click "Criar Lead"
6. **Expected Result**: Lead is created successfully without errors
7. Check the database to verify the lead has a UUID `id` field

### Test 2: Create a Lead via API
```typescript
import { createLead } from '@/repositories/leadsRepo';

const testLead = {
  nome: 'Test Lead',
  telefone: '11999999999',
  email: 'test@example.com',
  projetos: 'Projeto Teste',
  scouter: 'Sistema',
  etapa: 'Contato',
};

try {
  const result = await createLead(testLead);
  console.log('Lead created successfully:', result);
  console.log('Generated ID:', result.id); // Should be a UUID string
} catch (error) {
  console.error('Failed to create lead:', error);
}
```

### Test 3: Verify Database Schema
Run this SQL query in your Supabase SQL Editor:

```sql
-- Check the id column definition
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'fichas'
  AND column_name = 'id';

-- Expected output:
-- column_name | data_type | column_default              | is_nullable
-- id          | text      | (gen_random_uuid())::text   | NO
```

### Test 4: Verify TabuladorMax Sync Compatibility
1. Manually insert a record with numeric ID to simulate TabuladorMax sync:
   ```sql
   -- Test inserting with numeric string ID (like TabuladorMax)
   INSERT INTO public.fichas (id, nome, scouter, projeto, raw, deleted)
   VALUES ('558906', 'Test Sync', 'Sistema', 'TabuladorMax', '{}'::jsonb, false);
   ```
2. Verify the insert succeeds without errors
3. Query to confirm both ID formats coexist:
   ```sql
   SELECT id, nome, scouter FROM public.fichas 
   ORDER BY created_at DESC LIMIT 10;
   -- Should see both UUID strings and numeric string IDs
   ```

### Test 4: Legacy Data Compatibility
1. If you have existing leads in the database, verify they still work:
   ```sql
   -- Query existing leads
   SELECT id, nome, scouter, projeto, criado 
   FROM public.fichas 
   WHERE deleted IS FALSE OR deleted IS NULL
   ORDER BY created_at DESC
   LIMIT 10;
   ```
2. Verify that existing leads can be viewed and edited in the UI
3. Verify that the delete functionality still works

### Test 5: Bulk Operations
1. Try creating multiple leads in sequence
2. Verify each gets a unique UUID
3. Check that batch operations (if any) still work correctly

## Verification Checklist

- [ ] Migration runs successfully without errors
- [ ] New leads can be created via the UI
- [ ] New leads receive auto-generated UUID IDs
- [ ] Existing leads (if any) are still accessible
- [ ] Lead deletion (soft delete) still works
- [ ] No TypeScript compilation errors
- [ ] Build completes successfully (`npm run build`)
- [ ] No new linting errors introduced (existing `any` types are technical debt)

## Rollback Plan

If the migration causes issues, you can rollback by:

1. Create a down migration that reverts the changes:
```sql
-- WARNING: This will lose UUID IDs and regenerate new ones
ALTER TABLE public.fichas DROP CONSTRAINT IF EXISTS fichas_pkey;
ALTER TABLE public.fichas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.fichas ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.fichas ADD PRIMARY KEY (id);
```

2. Restore the code changes:
   - Revert `src/repositories/leadsRepo.ts`
   - Revert `src/repositories/types.ts`

## Notes

- The migration preserves existing data where possible
- UUID IDs are more suitable for distributed systems and prevent ID conflicts
- The `raw` field now stores the complete lead data as JSON for audit purposes
- Both string (UUID) and number (legacy) IDs are supported for backward compatibility

## Contact

If you encounter any issues during testing, please:
1. Check the migration logs in Supabase
2. Check browser console for JavaScript errors
3. Check server logs for database errors
4. Report issues with full error messages and reproduction steps
