# Data Flow Documentation - Leads Table as Single Source of Truth

## 🎯 Overview

This document describes the complete data flow for leads/fichas in the Gestão Scouter application, clarifying that the **`leads` table in Supabase is the SINGLE SOURCE OF TRUTH** for all lead data.

## ⚠️ CRITICAL: Table Usage

### ✅ CORRECT - Use Only This:
- **Table: `leads`** (Supabase Local - Gestão Scouter project)
- This is the ONLY table that should be used for all lead/ficha queries and operations

### ❌ DEPRECATED - Never Use:
- **Table: `fichas`** - Deprecated, migrated to `leads` (legacy)
- **Table: `bitrix_leads`** - Historical reference only
- **MockDataService** - Only for offline local testing
- **Google Sheets** - Direct access discontinued

## 📊 Data Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     TabuladorMax Project                        │
│                    (External Supabase)                          │
│                                                                 │
│                    Table: leads                                 │
│              (External lead management)                         │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ Bidirectional Sync
                  │ (Edge Functions)
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                  Gestão Scouter Project                         │
│                    (Local Supabase)                             │
│                                                                 │
│              ┌──────────────────────┐                          │
│              │   Table: leads       │                          │
│              │  (SINGLE SOURCE)     │                          │
│              └──────────┬───────────┘                          │
│                         │                                       │
│         ┌───────────────┼───────────────┐                      │
│         │               │               │                      │
│    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐                 │
│    │ leadsRepo│    │fichasRepo│   │dashboardRepo│              │
│    └────┬────┘    └────┬────┘    └────┬────┘                 │
│         │               │               │                      │
│         └───────────────┼───────────────┘                      │
│                         │                                       │
│                    ┌────▼────┐                                 │
│                    │ Hooks    │                                │
│                    │          │                                │
│                    │useFichas │                                │
│                    │useSupabase│                               │
│                    └────┬─────┘                                │
│                         │                                       │
│              ┌──────────┼──────────┐                           │
│              │          │          │                           │
│         ┌────▼────┐┌───▼───┐ ┌───▼────┐                       │
│         │Dashboard││Leads  │ │Maps    │                       │
│         │Page     ││Page   │ │Components│                     │
│         └─────────┘└───────┘ └────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Complete Data Flow

### 1. Data Entry Points

#### External Sync (TabuladorMax → Gestão Scouter)
```
TabuladorMax leads table
    ↓ (Edge Function: sync-tabulador)
Gestão Scouter leads table
    ↓ (Repository layer)
Application components
```

#### Manual Entry (UI → Database)
```
User creates lead in UI
    ↓ (Form submission)
leadsRepo.createLead()
    ↓ (Supabase insert)
leads table
    ↓ (Real-time subscription or refetch)
UI updates
```

### 2. Data Query Flow

All data queries follow this pattern:

```
Component/Page
    ↓ (uses hook)
useFichas() or useSupabaseData()
    ↓ (calls repository)
leadsRepo.ts / fichasRepo.ts / dashboardRepo.ts
    ↓ (Supabase query)
SELECT * FROM leads WHERE deleted = FALSE OR deleted IS NULL
    ↓ (returns data)
Component renders
```

### 3. Key Repository Functions

#### leadsRepo.ts (Primary Interface)
- `getLeads(filters)` - Get all leads with filters
- `createLead(lead)` - Create new lead
- `deleteLeads(ids)` - Soft delete (sets deleted = true)
- `getLeadsSummary(filters)` - Aggregated stats
- `getLeadsByScouter(filters)` - Group by scouter
- `getLeadsByProject(filters)` - Group by project

#### fichasRepo.ts (Legacy Compatibility Layer)
- `fetchFichasFromDB(filters)` - Fetch from leads table
- Returns simplified data format for legacy components

#### dashboardRepo.ts (Dashboard-Specific)
- `getDashboardData(filters)` - Optimized dashboard queries
- Returns data formatted for dashboard visualizations

## 🔒 Row Level Security (RLS)

The `leads` table has RLS policies configured:

1. **Read Access**: All authenticated users can read non-deleted leads
2. **Write Access**: Based on user roles and permissions
3. **Delete Access**: Only authorized users can soft-delete

### Verifying RLS Policies

```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'leads';

-- Test read access (as authenticated user)
SELECT * FROM leads WHERE deleted = FALSE OR deleted IS NULL;
```

### Common RLS Issues

If no data is returned:
1. Check if RLS is enabled: `ALTER TABLE leads ENABLE ROW LEVEL SECURITY;`
2. Verify policies exist for SELECT operations
3. Confirm user authentication token is valid
4. Check if records exist and are not deleted

## 📝 Column Reference

### Required Columns in `leads` Table

| Column | Type | Description | Default |
|--------|------|-------------|---------|
| `id` | UUID/Text | Primary key | Auto-generated |
| `deleted` | Boolean | Soft delete flag | FALSE |
| `criado` | Date | Creation date | Current date |
| `projeto` | Text | Project name | NULL |
| `scouter` | Text | Scouter name | NULL |
| `nome` | Text | Lead name | NULL |
| `telefone` | Text | Phone number | NULL |
| `email` | Text | Email address | NULL |
| `etapa` | Text | Current stage | NULL |
| `valor_ficha` | Numeric | Lead value | 0 |
| `raw` | JSONB | Full data backup | {} |

### Filtering Deleted Records

**ALL queries must filter deleted records:**

```typescript
// Correct - filters out deleted records
const { data } = await supabase
  .from('leads')
  .select('*')
  .or('deleted.is.false,deleted.is.null');

// Incorrect - may return deleted records
const { data } = await supabase
  .from('leads')
  .select('*');
```

## 🧪 Testing Data Access

### Script: insertFakeLeads.js

Inserts test data into the `leads` table:

```bash
node scripts/insertFakeLeads.js
```

This script:
- Inserts 20 fake leads
- Sets `deleted = false` for all records
- Populates the `raw` field with complete data
- Uses proper date format (YYYY-MM-DD)

### Script: syncLeadsToFichas.ts

Syncs data from TabuladorMax to Gestão Scouter:

```bash
npm run migrate:leads
# or
npx tsx scripts/syncLeadsToFichas.ts
```

This script:
- Fetches leads from TabuladorMax
- Normalizes data format
- Upserts into Gestão Scouter `leads` table
- Maintains data integrity

## 🐛 Troubleshooting

### Issue: No data returned from queries

**Possible Causes:**
1. RLS policies blocking access
2. All records are soft-deleted
3. Filters are too restrictive
4. Wrong table name (using 'fichas' instead of 'leads')

**Solution:**
```typescript
// Check if data exists (ignoring RLS for debugging)
// Run this query in Supabase SQL editor:
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE deleted = true) as deleted_count,
       COUNT(*) FILTER (WHERE deleted = false OR deleted IS NULL) as active_count
FROM leads;
```

### Issue: Filters not working

**Possible Causes:**
1. Column doesn't exist (e.g., `deleted` column missing)
2. Wrong column name in filter
3. Data type mismatch

**Solution:**
```typescript
// Safe filtering that handles missing column
.or('deleted.is.false,deleted.is.null')
// This won't break even if 'deleted' column doesn't exist
```

### Issue: Dashboard shows no data

**Check:**
1. Repository logging: Look for console messages starting with `[dashboardRepo]`
2. Verify filters in dashboard state
3. Check date range - may be outside data range
4. Verify RLS policies allow read access

**Debug:**
```typescript
// Add to component
console.log('Dashboard filters:', filters);
console.log('Dashboard data:', data);
```

## 📚 Related Files

### Repositories
- `/src/repositories/leadsRepo.ts` - Primary leads interface
- `/src/repositories/fichasRepo.ts` - Legacy compatibility layer
- `/src/repositories/dashboardRepo.ts` - Dashboard-specific queries

### Hooks
- `/src/hooks/useFichas.ts` - React Query hook for leads
- `/src/hooks/useSupabaseData.ts` - Generic Supabase data hook

### Pages
- `/src/pages/Dashboard.tsx` - Main dashboard
- `/src/pages/Leads.tsx` - Leads management page

### Scripts
- `/scripts/insertFakeLeads.js` - Insert test data
- `/scripts/syncLeadsToFichas.ts` - Sync from TabuladorMax
- `/scripts/testMigration.ts` - Test data normalization

### Migrations
- `/supabase/migrations/20251018_ensure_leads_deleted_column.sql` - Ensures deleted column exists

## ✅ Verification Checklist

Before deploying changes:

- [ ] All queries use `from('leads')` - NEVER `from('fichas')`
- [ ] All queries filter deleted records: `.or('deleted.is.false,deleted.is.null')`
- [ ] Date filters use `criado` column (YYYY-MM-DD format)
- [ ] Console logging is present for debugging
- [ ] Error handling catches and logs Supabase errors
- [ ] RLS policies are configured and tested
- [ ] Test data can be inserted via scripts
- [ ] Dashboard displays data correctly
- [ ] Leads page displays data correctly
- [ ] Filters work correctly (date, scouter, project)
- [ ] Documentation is updated

## 🔄 Migration Path from Legacy Code

If you find code using deprecated tables:

### From 'fichas' table:
```typescript
// OLD (❌ Wrong)
const { data } = await supabase.from('fichas').select('*');

// NEW (✅ Correct)
const { data } = await supabase.from('leads').select('*')
  .or('deleted.is.false,deleted.is.null');
```

### From 'bitrix_leads' table:
```typescript
// OLD (❌ Wrong - only for historical reference)
const { data } = await supabase.from('bitrix_leads').select('*');

// NEW (✅ Correct)
import { getLeads } from '@/repositories/leadsRepo';
const leads = await getLeads(filters);
```

## 📞 Support

If you encounter issues with data access:

1. Check console logs for detailed error messages
2. Verify RLS policies in Supabase dashboard
3. Run the verification checklist above
4. Review this documentation for proper patterns
5. Check related files for examples

## 🎓 Best Practices

1. **Always use repositories** - Don't query Supabase directly from components
2. **Filter deleted records** - Unless specifically needed
3. **Log operations** - Use console.log with prefixes for debugging
4. **Handle errors** - Always wrap queries in try-catch
5. **Type safety** - Use TypeScript interfaces for data structures
6. **Test with real data** - Use scripts to insert test data
7. **Document changes** - Update this file when data flow changes

---

**Last Updated:** 2025-10-18
**Version:** 1.0
**Status:** Active
