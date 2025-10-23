# Alternative Solutions for ID Handling in Sync Scenarios

## Context
This document outlines alternative approaches if TabuladorMax uses non-UUID IDs (e.g., numeric or arbitrary text IDs) and the current UUID-based solution causes issues with sync/import operations.

## Current Solution (UUID-based)
- **New fichas**: Auto-generated via `DEFAULT gen_random_uuid()`
- **Sync/Import**: Expects UUID format in the incoming `id` field
- **Risk**: If TabuladorMax sends non-UUID IDs, inserts will fail

## Alternative Approaches

### Option 1: Keep TEXT with Auto-Generated UUID Default
If TabuladorMax uses non-UUID IDs, we can keep the column as TEXT but still auto-generate UUIDs for new local records:

```sql
-- Revert to TEXT but add smart default
ALTER TABLE public.fichas ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.fichas ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
```

**Pros:**
- ✅ Accepts any string format (UUID, numeric, custom)
- ✅ Auto-generates UUID strings for new local records
- ✅ No sync/import issues

**Cons:**
- ❌ Loses UUID data type benefits (validation, storage efficiency)
- ❌ Mixed ID formats in the database

### Option 2: Dual ID System
Keep UUID for internal IDs, add separate column for external IDs:

```sql
-- Keep UUID as primary key
-- Add external_id for sync
ALTER TABLE public.fichas ADD COLUMN external_id TEXT UNIQUE;
CREATE INDEX idx_fichas_external_id ON public.fichas(external_id);
```

Then update sync logic:
```typescript
// In sync functions
const fichaToSync = {
  // Don't send id (let it auto-generate)
  external_id: lead.id, // Store TabuladorMax ID here
  // ... other fields
};
```

**Pros:**
- ✅ Clean separation of internal vs external IDs
- ✅ UUID benefits maintained
- ✅ No import conflicts

**Cons:**
- ❌ More complex logic
- ❌ Need to update all sync functions
- ❌ Additional column and index

### Option 3: ID Transformation Layer
Transform incoming IDs to UUIDs using a deterministic hash:

```typescript
// In sync functions
function transformIdToUuid(externalId: string): string {
  // Use a deterministic UUID v5 based on external ID
  // This ensures same external ID always maps to same UUID
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Custom namespace
  return uuidv5(externalId.toString(), namespace);
}

const fichaToSync = {
  id: transformIdToUuid(lead.id),
  // Store original ID in metadata
  raw: { ...lead, original_id: lead.id },
  // ... other fields
};
```

**Pros:**
- ✅ Maintains UUID benefits
- ✅ Deterministic mapping (same external ID → same UUID)
- ✅ No schema changes needed

**Cons:**
- ❌ Requires UUID v5 library in Edge Functions
- ❌ Original ID only in raw/metadata
- ❌ More complex sync logic

### Option 4: Conditional Auto-Generation
Use a database function that only generates UUID if ID is not provided:

```sql
-- Create a function for smart ID handling
CREATE OR REPLACE FUNCTION public.smart_id_generator()
RETURNS trigger AS $$
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    NEW.id := gen_random_uuid()::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to fichas table
ALTER TABLE public.fichas ALTER COLUMN id TYPE TEXT;
CREATE TRIGGER set_smart_id 
  BEFORE INSERT ON public.fichas 
  FOR EACH ROW 
  EXECUTE FUNCTION public.smart_id_generator();
```

**Pros:**
- ✅ Accepts any ID format
- ✅ Auto-generates UUIDs only when needed
- ✅ No application code changes for sync

**Cons:**
- ❌ TEXT type (loses UUID validation)
- ❌ Trigger overhead on every insert

## Recommended Approach

**IF TabuladorMax uses UUIDs:**
- ✅ Keep current solution (no changes needed)

**IF TabuladorMax uses numeric/text IDs:**
- 🥇 **Option 1** (TEXT with UUID default) - Simplest, most compatible
- 🥈 **Option 4** (Trigger-based) - Good balance of automation and flexibility
- 🥉 **Option 2** (Dual ID) - Best for long-term if clean separation is important

## Decision Needed

We need to confirm:
1. What format does TabuladorMax use for `leads.id`?
   - UUID?
   - BIGINT/SERIAL?
   - Custom TEXT?

2. Can TabuladorMax schema be modified to use UUIDs?
   - If yes → Keep current solution
   - If no → Implement Option 1 or Option 4

## Testing Checklist

For any chosen option:
- [ ] Create new ficha locally → ID is auto-generated ✅
- [ ] Sync ficha from TabuladorMax → ID is preserved ✅
- [ ] Import bulk fichas → All IDs handled correctly ✅
- [ ] Upsert existing ficha → Conflict resolution works ✅
- [ ] Query performance → Indexes work efficiently ✅
