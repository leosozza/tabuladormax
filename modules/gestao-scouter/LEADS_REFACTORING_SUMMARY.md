# Leads Table Refactoring - Implementation Summary

## Overview

This refactoring migrates the entire codebase from using `public.fichas` as the source of truth to using `public.leads` exclusively. This change aligns with the database migration that was already in place and ensures consistency across the application.

## Date

**Implementation Date:** October 18, 2025  
**Status:** ✅ COMPLETE

## Changes Summary

### 1. Frontend Code Updates

#### `src/hooks/useFichasGeo.ts`
- **Before:** Used RPC call `get_fichas_geo` and subscribed to `fichas` table with `lat`/`lng` filter
- **After:** Direct query on `leads` table using `latitude`/`longitude` fields, subscribes to `leads` table
- **Impact:** Geo heatmap now correctly displays data from leads table
- **Backward Compatibility:** Return key still `fichasGeo` for consumer compatibility

#### `src/repositories/leadsRepo.ts`
- **Before:** Conversion metrics compared `ficha_confirmada === 'Confirmada'`
- **After:** Conversion metrics compare `ficha_confirmada === 'Sim'` (normalized value)
- **Impact:** Correctly counts converted leads based on normalized boolean values
- **Functions Updated:** `getLeadsSummary`, `getLeadsByScouter`, `getLeadsByProject`

#### `src/components/dashboard/integrations/TabuladorSync.tsx`
- **Before:** UI labels showed "leads (TabuladorMax) ↔️ fichas (Gestão)"
- **After:** UI labels show "leads (TabuladorMax) ↔ leads (Gestão Scouter)"
- **Impact:** Accurate representation of bidirectional sync to users
- **Logs Updated:** Console logs, sync log table_name, and all user-facing messages

### 2. Edge Functions Updates

#### `supabase/functions/fichas-geo-enrich/index.ts`
- **Before:** Queried `fichas` table for `lat IS NULL`, updated `lat`/`lng` fields
- **After:** Queries `leads` table for `latitude IS NULL`, updates `latitude`/`longitude` fields
- **Impact:** Geo enrichment now updates the correct table with proper column names
- **API Changes:** 
  - Filter: `or=(deleted.is.false,deleted.is.null)` added
  - Column names: `lat`/`lng` → `latitude`/`longitude`
  - Function signatures updated to use proper types

#### `supabase/functions/process-sync-queue/index.ts`
- **Before:** Conditional logic to handle both `leads` and `fichas` tables
- **After:** Always uses `leads` table, removed fichas fallback
- **Impact:** Simplified code, consistent sync behavior
- **Changes:**
  - Removed `tableName` branching logic
  - Always updates `leads` table in Gestão Scouter
  - Log table_name changed from 'mixed' to 'leads'

### 3. Scripts & Tooling

#### `scripts/verify-fichas-centralization.sh`
- **Status:** DEPRECATED
- **Action:** Script now exits with error message directing to `verify-leads-centralization.sh`
- **Impact:** Prevents confusion, enforces use of correct validation script

#### `scripts/verify-leads-centralization.sh`
- **Status:** ACTIVE (already existed)
- **Results:** ✅ 11/11 checks passed
- **Verification:**
  - 0 queries to 'fichas' in production code
  - 23 queries to 'leads' in codebase
  - All edge functions use 'leads'

### 4. Documentation Updates

#### Updated Files
- ✅ `VALIDATION_CHECKLIST.md` - Reflects leads-only approach
- ✅ `LEGACY_DOCS_NOTICE.md` - Created comprehensive deprecation notice
- ✅ `CENTRALIZACAO_FICHAS_SUMMARY.md` - Added deprecation header
- ✅ `ENTERPRISE_FICHAS_IMPLEMENTATION.md` - Added deprecation header
- ✅ `ANALISE_IMPACTO_FICHAS.md` - Added deprecation header
- ✅ `SYNC_LEADS_FICHAS_IMPLEMENTATION.md` - Added deprecation header

#### Legacy SQL
- ✅ `supabase/functions/trigger_sync_leads_to_fichas.sql` - Marked as DEPRECATED

## Technical Details

### Database Schema Changes

The `leads` table uses the following geo fields:
```sql
latitude NUMERIC(10,8)   -- Replaces 'lat'
longitude NUMERIC(11,8)  -- Replaces 'lng'
localizacao TEXT         -- Location description
```

### Query Patterns

#### Before (fichas)
```typescript
await supabase.from('fichas')
  .select('id, lat, lng, ...')
  .filter('lat', 'not', null)
```

#### After (leads)
```typescript
await supabase.from('leads')
  .select('id, latitude, longitude, ...')
  .or('deleted.is.false,deleted.is.null')
  .not('latitude', 'is', null)
  .not('longitude', 'is', null)
```

### Data Normalization

The `normalizeBooleanIndicator` function normalizes values to:
- `'Sim'` for truthy values ('sim', 'true', '1', true, 1)
- `'Não'` for falsy values ('não', 'false', '0', false, 0)

This ensures consistent comparison: `ficha_confirmada === 'Sim'`

## Testing & Validation

### Build Status
✅ Build completed successfully
- Time: 18.04s
- No TypeScript errors
- PWA generated correctly
- Warning: Some chunks >600KB (existing issue, not introduced by changes)

### Verification Results
✅ verify-leads-centralization.sh: 11/11 checks passed
- No fichas queries in production code
- 23 leads queries found
- All repositories using leads
- All hooks using leads
- All edge functions using leads
- Documentation updated

### Manual Testing Checklist
The following should be tested in a deployed environment:

- [ ] Dashboard loads and displays lead counts correctly
- [ ] Heatmap shows leads with geolocation data
- [ ] Geo enrichment updates latitude/longitude in leads table
- [ ] TabuladorMax sync shows correct labels (leads ↔ leads)
- [ ] Conversion metrics count accurately
- [ ] Date filters work with criado field
- [ ] Realtime updates trigger on leads table changes

## Breaking Changes

### None Expected

All changes are backward compatible:
- Return values maintain same structure
- API signatures unchanged (except internal implementations)
- UI behavior remains consistent
- Migration script (20251018_migrate_fichas_to_leads.sql) already migrated data

## Migration Path

For existing deployments:

1. ✅ Run migration: `20251018_migrate_fichas_to_leads.sql` (already applied)
2. ✅ Deploy this code update
3. ⚠️ Verify sync with TabuladorMax works correctly
4. ⚠️ Test geo enrichment on sample records
5. ⏳ Optional: Drop `fichas` table after validation period (not in scope)

## Rollback Plan

If issues arise:

1. Revert code to previous commit
2. Re-enable fichas table if dropped
3. Restore trigger if removed
4. Note: Data in leads table is preserved

## Security Considerations

- No new security vulnerabilities introduced
- RLS policies on leads table already configured
- Edge functions use same authentication mechanism
- No sensitive data exposure in changes

## Performance Impact

- **Positive:** Direct queries instead of RPC calls (useFichasGeo)
- **Neutral:** Same database table structure and indexes
- **Positive:** Removed conditional branching in sync processor

## Future Cleanup

After validation period (e.g., 30 days):

1. Optional: Drop `public.fichas` table
2. Optional: Remove `fichas_compat` view
3. Optional: Archive legacy documentation to `docs/legacy/`
4. Update migration notes in README

## Contributors

- Implementation: GitHub Copilot
- Review: (to be added)
- Testing: (to be added)

## References

- Migration SQL: `supabase/migrations/20251018_migrate_fichas_to_leads.sql`
- Validation Checklist: `VALIDATION_CHECKLIST.md`
- Legacy Notice: `LEGACY_DOCS_NOTICE.md`
- Verification Script: `scripts/verify-leads-centralization.sh`

---

**Last Updated:** 2025-10-18  
**Status:** ✅ IMPLEMENTATION COMPLETE  
**Next Steps:** Deploy and validate in production environment
