# Validation Checklist - Leads and Dashboard Fixes

## PR Summary
**Branch**: `copilot/fix-leads-dashboard-display-issues`  
**Commits**: 2 (5da7722, 28284fd)  
**Files Modified**: 11 + 1 documentation  
**Build Status**: ✅ Passing  
**Lines Changed**: 106 insertions, 25 deletions

---

## Quick Validation Guide

### 1. Verify Deleted Field Handling ✅

**What Changed**: All queries now use `.or('deleted.is.false,deleted.is.null')` instead of `.eq('deleted', false)`

**Test**:
```typescript
// Before: Only returned records with deleted = false
// After: Returns records with deleted = false OR deleted = NULL
```

**Where to Check**:
- Open Leads page → Should see more records if some have `deleted = NULL`
- Check Dashboard metrics → Total counts should include NULL records
- Verify Edge Function sync → Should process complete dataset

**Files to Inspect**:
```bash
grep -r "deleted.is.false,deleted.is.null" src/ supabase/functions/
```

---

### 2. Verify Date Field Fallback ✅

**What Changed**: Queries support both `criado` and `created_at` columns

**Test Scenarios**:

#### Scenario A: Filter by Date Range
1. Go to Leads page
2. Set "Data Início" and "Data Fim"
3. Verify results appear regardless of which date column exists

#### Scenario B: Dashboard Date Filters
1. Go to Dashboard
2. Use Interactive Filter Panel
3. Change date range
4. Confirm data loads correctly

**Query Example**:
```typescript
// Before: .gte('criado', startDate)
// After: .or(`criado.gte.${startDate},created_at.gte.${startDate}`)
```

**Files to Inspect**:
```bash
grep -n "criado.gte\|created_at.gte" src/repositories/dashboardRepo.ts
grep -n "criado.gte\|created_at.gte" src/repositories/fichasRepo.ts
```

---

### 3. Verify Boolean Normalization ✅

**What Changed**: Boolean fields normalized to consistent "Sim"/"Não" format

**Test**:

#### Check Field Normalization:
1. Open Leads page
2. Look at badges/indicators:
   - Fichas Confirmadas
   - Com Foto
   - Presença Confirmada
   - Agendadas
   - Compareceram
3. Verify all show consistent text (no mix of "sim", "SIM", "true", "1")

**Database Query to Validate**:
```sql
-- Check for consistent values
SELECT DISTINCT ficha_confirmada FROM fichas WHERE ficha_confirmada IS NOT NULL;
-- Should return: 'Sim', 'Não', or empty string

SELECT DISTINCT cadastro_existe_foto FROM fichas WHERE cadastro_existe_foto IS NOT NULL;
-- Should return: 'Sim', 'Não', or empty string
```

**Normalized Fields**:
- ✅ `ficha_confirmada`
- ✅ `cadastro_existe_foto`
- ✅ `presenca_confirmada`
- ✅ `compareceu`
- ✅ `confirmado`
- ✅ `agendado`

---

### 4. Verify New Repository Functions ✅

**What Changed**: Added missing `createLead()` and `deleteLeads()` functions

#### Test A: Create Lead
1. Go to Leads page
2. Click "Nova Ficha" or similar button
3. Fill in form
4. Submit
5. Verify new lead appears in list
6. Check database → `deleted` should be `false`

#### Test B: Delete Lead
1. Select one or more leads
2. Click delete button
3. Confirm deletion
4. Verify leads disappear from list
5. Check database → `deleted` should be `true` (not actually removed)

**Code to Review**:
```typescript
// src/repositories/leadsRepo.ts
export async function createLead(lead: Partial<Lead>): Promise<Lead>
export async function deleteLeads(leadIds: number[]): Promise<void>
```

---

## Database Schema Validation

### Required Column Check

Run these queries to ensure proper schema:

```sql
-- 1. Check if 'deleted' column exists and is nullable
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'fichas' AND column_name = 'deleted';

-- Expected: column_name='deleted', data_type='boolean', is_nullable='YES'

-- 2. Check for date columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'fichas' 
  AND (column_name = 'criado' OR column_name = 'created_at');

-- Expected: At least one of these columns exists

-- 3. Verify deleted field distribution
SELECT 
  deleted,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM fichas
GROUP BY deleted;

-- Expected: Shows count for true, false, and NULL values
```

---

## RLS (Row Level Security) Validation

Ensure policies allow proper access:

```sql
-- Check RLS policies on fichas table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'fichas';
```

**Required Policy Behavior**:
- ✅ SELECT: Should allow reading records where `deleted IS NULL OR deleted = false`
- ✅ INSERT: Should allow creating records with `deleted = false`
- ✅ UPDATE: Should allow updating `deleted` field for soft deletes
- ✅ DELETE: May be restricted (we use soft deletes via UPDATE)

---

## Performance Validation

### Query Performance Check

The new OR conditions might affect query performance. Monitor execution time:

```sql
-- Test query performance with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM fichas 
WHERE (deleted IS false OR deleted IS NULL);

-- Compare with old query
EXPLAIN ANALYZE
SELECT * FROM fichas 
WHERE deleted = false;
```

**Expected**: Similar performance, possibly with slight overhead from OR condition. Consider adding index if performance degrades:

```sql
-- Optional: Add index to improve deleted field queries
CREATE INDEX IF NOT EXISTS idx_fichas_deleted 
ON fichas(deleted) 
WHERE deleted IS NOT true;
```

---

## Edge Function Validation

### Test Sync Health Endpoint

```bash
# Call sync health endpoint
curl -X GET "https://your-project.supabase.co/functions/v1/sync-health" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Expected Response**:
- Should show correct count of fichas (including NULL deleted records)
- Connection status should be "ok"

### Test Tabulador Export

```bash
# Call export endpoint with filters
curl -X POST "https://your-project.supabase.co/functions/v1/tabulador-export" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "updated_since": "2024-01-01"
    }
  }'
```

**Expected**: Should export all non-deleted records (false or NULL)

---

## UI Component Validation

### Interactive Filter Panel

**Component**: `src/components/dashboard/InteractiveFilterPanel.tsx`

**Test Steps**:
1. Open Dashboard
2. Find "Filtros Avançados" card
3. Check dropdown population:
   - ✅ "Projetos" dropdown should show all unique projects
   - ✅ "Scouters" dropdown should show all unique scouters
4. Select filters and verify data updates

### Leads Page

**Component**: `src/pages/Leads.tsx`

**Test Steps**:
1. Navigate to Leads page
2. Verify all sections load:
   - ✅ Lead count badge
   - ✅ Status badges (Confirmadas, Com Foto, etc.)
   - ✅ Lead table/list
   - ✅ Filter controls
3. Test interactions:
   - ✅ Click on a lead → Opens detail view
   - ✅ Use filters → List updates
   - ✅ Create new lead → Appears in list
   - ✅ Delete lead → Disappears from list

---

## Regression Testing

### Areas to Monitor for Regressions

1. **Existing Queries**:
   - Ensure no queries break due to OR condition
   - Monitor for NULL pointer exceptions

2. **Performance**:
   - Check page load times
   - Monitor dashboard render time
   - Verify Edge Function latency

3. **Data Consistency**:
   - Ensure soft deletes work correctly
   - Verify no data loss from new logic
   - Check referential integrity

4. **Build System**:
   - ✅ `npm run build` passes
   - ✅ No new TypeScript errors
   - ⚠️ Pre-existing linter warnings (not from this PR)

---

## Rollback Procedure

If critical issues arise:

### Step 1: Immediate Rollback
```bash
git checkout main
git revert 5da7722 28284fd
git push origin main
```

### Step 2: Targeted Fix
If only specific queries are problematic:

1. Identify failing query
2. Revert specific file:
   ```bash
   git checkout HEAD~2 -- path/to/problematic/file.ts
   ```
3. Test and deploy partial fix

### Step 3: Database Hotfix
If query logic needs database-level fix:

```sql
-- Temporarily set all NULL deleted values to false
UPDATE fichas SET deleted = false WHERE deleted IS NULL;

-- Then update RLS policy to only check false
-- (Reverts to original behavior)
```

---

## Success Criteria

### ✅ All Must Pass

- [ ] Build completes without errors
- [ ] Leads page displays complete list of leads
- [ ] Lead count matches database query results
- [ ] Date filters return expected results
- [ ] Boolean indicators show consistent values
- [ ] Create lead function works
- [ ] Delete lead function works (soft delete)
- [ ] Dashboard metrics show accurate counts
- [ ] Edge Functions return correct data
- [ ] No new TypeScript errors introduced
- [ ] Performance remains acceptable (< 2s page load)

### 📊 Metrics to Monitor

**Before Fix** → **After Fix**:
- Total leads visible: X → X + Y (where Y = NULL deleted records)
- Dashboard load time: T1 → T2 (should be similar)
- Query execution time: Q1 → Q2 (should be similar)
- User-reported data inconsistencies: N → 0

---

## Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor error logs for query failures
- [ ] Check user feedback for data inconsistencies
- [ ] Verify dashboard metrics stability
- [ ] Monitor Edge Function success rate

### First Week
- [ ] Analyze query performance metrics
- [ ] Review user-reported issues
- [ ] Validate data integrity
- [ ] Consider index optimization if needed

---

## Contact & Support

**Issue Tracking**: GitHub Issues on leosozza/gestao-scouter  
**Documentation**: See `LEADS_DASHBOARD_FIX_SUMMARY.md` for technical details  
**Rollback Authority**: Repository maintainers

---

**Validation Date**: 2025-10-17  
**PR Status**: Ready for Review  
**Reviewer Action Required**: Complete this checklist before merge
