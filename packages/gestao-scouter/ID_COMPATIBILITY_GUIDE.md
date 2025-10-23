# ID Compatibility: UUID String + Numeric IDs

## Solution: TEXT Column with UUID String Default

```
┌─────────────────────────────────────────────────────────────┐
│             fichas table - id column                         │
│                                                              │
│  Type: TEXT                                                  │
│  Default: gen_random_uuid()::text                           │
│  Constraint: PRIMARY KEY, NOT NULL                          │
└─────────────────────────────────────────────────────────────┘
```

## Two Scenarios - Both Supported ✅

### Scenario 1: Local Lead Creation (App)

```
User clicks "Criar Lead"
         │
         ▼
┌────────────────────────┐
│  CreateLeadDialog      │
│  (Frontend)            │
└────────┬───────────────┘
         │
         │ Submit without 'id'
         ▼
┌────────────────────────┐
│  createLead()          │
│  (leadsRepo.ts)        │
│                        │
│  INSERT {              │
│    nome: "João",       │
│    telefone: "...",    │
│    // NO id field      │ ← Key: id not sent
│  }                     │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  PostgreSQL            │
│  fichas table          │
│                        │
│  DEFAULT triggered:    │
│  gen_random_uuid()     │
│  ::text                │
└────────┬───────────────┘
         │
         ▼
    Result: ✅
┌─────────────────────────────────────────────┐
│ id: "550e8400-e29b-41d4-a716-446655440000"  │  UUID string
│ nome: "João"                                │
│ created_at: 2025-10-18 ...                  │
└─────────────────────────────────────────────┘
```

### Scenario 2: TabuladorMax Sync

```
TabuladorMax (leads table)
         │
         │ id: 558906 (numeric)
         ▼
┌────────────────────────┐
│  sync-tabulador        │
│  (Edge Function)       │
│                        │
│  mapLeadToFicha():     │
│    id: String(lead.id) │ ← Converts 558906 to "558906"
│    nome: "Maria"       │
│    ...                 │
└────────┬───────────────┘
         │
         │ UPSERT with id: "558906"
         ▼
┌────────────────────────┐
│  PostgreSQL            │
│  fichas table          │
│                        │
│  id provided?          │
│  YES → use it          │ ← DEFAULT NOT used
│  (ignore DEFAULT)      │
└────────┬───────────────┘
         │
         ▼
    Result: ✅
┌─────────────────────────────────────────────┐
│ id: "558906"                                │  Numeric as string
│ nome: "Maria"                               │
│ sync_source: "TabuladorMax"                 │
└─────────────────────────────────────────────┘
```

## Database State: Mixed IDs (Both Formats) ✅

```sql
SELECT id, nome, scouter, sync_source FROM fichas ORDER BY created_at DESC;
```

| id | nome | scouter | sync_source |
|---|---|---|---|
| `"550e8400-e29b-41d4-a716-446655440000"` | João Silva | Sistema | NULL |
| `"558906"` | Maria Santos | Scouter A | TabuladorMax |
| `"551234"` | Pedro Souza | Scouter B | TabuladorMax |
| `"660e9500-f39c-42e5-b827-556766551111"` | Ana Costa | Sistema | NULL |

**Key Insight**: Both UUID strings and numeric strings coexist in the same TEXT column!

## Type System Compatibility

### TypeScript Interface

```typescript
export interface Ficha {
  id?: string | number;  // ✅ Supports both
  nome?: string;
  // ...
}
```

### Normalization Function

```typescript
function normalizeFichaFromSupabase(r: any): Lead {
  let normalizedId: string | number;
  
  if (typeof r.id === 'string') {
    normalizedId = r.id;  // UUID string or numeric string
  } else {
    normalizedId = Number(r.id) || 0;  // Fallback
  }
  
  return { id: normalizedId, ... };
}
```

### Sync Function

```typescript
function mapLeadToFicha(lead: any) {
  return {
    id: String(lead.id),  // ✅ 558906 → "558906"
    nome: lead.nome,
    // ...
  };
}
```

## Migration Details

### What the Migration Does

```sql
-- Simple and non-destructive
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.fichas 
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

COMMENT ON COLUMN public.fichas.id IS 
  'Auto-gera UUID string para novos registros locais. 
   Aceita IDs numéricos/texto de sincronização.';
```

### What It Doesn't Do

❌ No column type change (stays TEXT)  
❌ No data migration  
❌ No column recreation  
❌ No downtime required  

## Advantages of This Approach

| Feature | UUID Type | TEXT + UUID Default |
|---------|-----------|---------------------|
| **Auto-generate local IDs** | ✅ | ✅ |
| **Accept numeric sync IDs** | ❌ | ✅ |
| **Accept any text ID** | ❌ | ✅ |
| **Type validation** | ✅ (strict) | ⚠️ (flexible) |
| **Storage efficiency** | ✅ (16 bytes) | ⚠️ (variable) |
| **Migration complexity** | ⚠️ (complex) | ✅ (simple) |
| **Backward compatible** | ❌ | ✅ |
| **TabuladorMax compatible** | ❌ | ✅ |

## Real-World Examples

### Example 1: Create Lead via UI

```typescript
// Frontend sends
{
  nome: "João Silva",
  telefone: "11999999999",
  email: "joao@example.com"
  // NO id
}

// Database inserts
{
  id: "550e8400-e29b-41d4-a716-446655440000",  // Auto-generated
  nome: "João Silva",
  telefone: "11999999999",
  email: "joao@example.com",
  criado: "2025-10-18",
  raw: { ... },
  created_at: "2025-10-18T14:00:00Z"
}
```

### Example 2: Sync from TabuladorMax

```typescript
// TabuladorMax sends
{
  id: 558906,  // numeric
  nome: "Maria Santos",
  telefone: "11988888888"
}

// Edge Function converts
{
  id: "558906",  // String(558906)
  nome: "Maria Santos",
  telefone: "11988888888"
}

// Database upserts (finds by id "558906" or creates new)
{
  id: "558906",  // Numeric as string
  nome: "Maria Santos",
  telefone: "11988888888",
  sync_source: "TabuladorMax",
  last_synced_at: "2025-10-18T14:01:00Z"
}
```

## Summary

✅ **Problem Solved**: Lead creation no longer fails  
✅ **TabuladorMax Compatible**: Accepts numeric IDs  
✅ **Simple Migration**: Just adds DEFAULT  
✅ **No Breaking Changes**: All existing code works  
✅ **Mixed IDs Supported**: UUID and numeric coexist  
✅ **Production Ready**: Tested and documented  

The TEXT + UUID default approach provides the best of both worlds:
- Auto-generation for local records
- Full compatibility with external numeric IDs
- Simple implementation
- No data migration required
