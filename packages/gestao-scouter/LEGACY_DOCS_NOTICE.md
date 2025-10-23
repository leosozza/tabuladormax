# Legacy Documentation Notice

## ⚠️ DEPRECATED DOCUMENTATION FILES

The following documentation files are **DEPRECATED** and kept only for historical reference. They describe the old architecture where the `fichas` table was the source of truth.

### Migration Status

**FROM:** `public.fichas` table (LEGACY)  
**TO:** `public.leads` table (CURRENT)  
**Date:** October 18, 2025

### Deprecated Files

1. **CENTRALIZACAO_FICHAS_SUMMARY.md** - Describes fichas centralization (now replaced by leads)
2. **ENTERPRISE_FICHAS_IMPLEMENTATION.md** - Enterprise fichas implementation (obsolete)
3. **ANALISE_IMPACTO_FICHAS.md** - Impact analysis for fichas (historical reference only)
4. **SYNC_LEADS_FICHAS_IMPLEMENTATION.md** - Sync between leads and fichas (now leads ↔ leads)
5. **docs/gestao-scouter-fichas-table.sql** - Legacy fichas table schema
6. **supabase/functions/trigger_sync_leads_to_fichas.sql** - Legacy trigger (DO NOT USE)

### Current Documentation

Please refer to these up-to-date documents:

- **CENTRALIZACAO_LEADS_SUMMARY.md** - Current leads centralization approach
- **LEADS_DATA_SOURCE.md** - Leads as single source of truth
- **VALIDATION_CHECKLIST.md** - Updated validation checklist for leads
- **README.md** - Main project documentation
- **supabase/migrations/20251018_migrate_fichas_to_leads.sql** - Migration script

### Key Changes

1. **Table Name**: `fichas` → `leads`
2. **Geo Fields**: `lat`/`lng` → `latitude`/`longitude`
3. **Sync Direction**: leads (TabuladorMax) ↔ fichas (Gestão) → leads (TabuladorMax) ↔ leads (Gestão)
4. **Edge Functions**: All updated to use `leads` table exclusively
5. **Repositories**: `leadsRepo.ts` queries `leads` table only

### What Changed in the Codebase

- ✅ All queries in `src/` use `public.leads` table
- ✅ Edge functions (`fichas-geo-enrich`, `process-sync-queue`) use `leads`
- ✅ Geo enrichment uses `latitude`/`longitude` instead of `lat`/`lng`
- ✅ Realtime subscriptions listen to `leads` table
- ✅ Sync logs show "leads ↔ leads" instead of "leads ↔ fichas"
- ✅ Conversion metrics use `ficha_confirmada === 'Sim'` (normalized)

### Migration Path

If you need to reference the old architecture:

1. Check the git history before October 18, 2025
2. Review the deprecated files listed above (for context only)
3. Consult `supabase/migrations/20251018_migrate_fichas_to_leads.sql` for migration details

### Questions?

For questions about the current architecture, refer to:
- **LEADS_DATA_SOURCE.md** - Comprehensive guide to leads table usage
- **VALIDATION_CHECKLIST.md** - Validation procedures
- Team lead or project maintainer

---

**Last Updated:** 2025-10-18  
**Status:** ACTIVE NOTICE  
**Action Required:** None - for informational purposes only
