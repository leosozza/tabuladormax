## ⚠️ NOTA: Este documento está obsoleto ou parcialmente obsoleto

**Status**: ⚠️ Este documento contém referências a implementações antigas que dependiam de Google Sheets.

**Arquitetura Atual**: TabuladorMax → Supabase (tabela 'leads') → Repository → Hook → Componente

Para informações atualizadas, consulte:
- [LEADS_DATA_SOURCE.md](./LEADS_DATA_SOURCE.md) ou [../LEADS_DATA_SOURCE.md](../LEADS_DATA_SOURCE.md)
- [README.md](./README.md) ou [../README.md](../README.md)

---

# Scouters Data Fix Documentation

## Problem
The system was showing 0 active scouters even though the Google Sheets spreadsheet has 64 active scouters in the Scouters tab (GID: 1351167110).

## Root Cause
The code was only deriving scouter data by grouping fichas by scouter name, without reading from the dedicated Scouters tab in the spreadsheet.

## Solution
Added support to read directly from the Scouters tab (GID: 1351167110) and enrich that data with statistics from fichas.

## Changes Made

### 1. GoogleSheetsService (`src/services/googleSheetsService.ts`)
- **Added SCOUTERS GID**: `'1351167110'` to read from the correct tab
- **Added `fetchScouters()` method**: Reads and processes data from the Scouters tab
- **Added `parseAtivo()` helper**: Correctly identifies active vs inactive scouters based on status field
- **Column Mappings**: The code tries multiple column name variations:
  - **Nome**: `'Nome'`, `'Scouter'`, `'Nome do Scouter'`
  - **Tier**: `'Tier'`, `'Classificação'`, `'Nivel'`
  - **Status**: `'Status'`, `'Situação'`, `'Ativo'`
  - **Meta**: `'Meta Semanal'`, `'Meta'`, `'Meta/Semana'`

### 2. ScoutersRepo (`src/repositories/scoutersRepo.ts`)
- **Refactored `fetchScoutersFromSheets()`**: Now tries to fetch from Scouters tab first
- **Added `enrichScoutersWithFichasData()`**: Combines Scouters tab data with fichas statistics
- **Kept `deriveScoutersFromFichas()`**: Maintains backward compatibility as a fallback
- **Active Status**: Now respects the `ativo` field from the Scouters tab

## How It Works

1. **Primary Source**: Fetch from Scouters tab (GID: 1351167110)
2. **Enrichment**: Match each scouter with their fichas to calculate:
   - Total fichas count
   - Converted fichas count
   - Conversion rate
   - Performance status
   - Total value
3. **Fallback**: If Scouters tab is empty or unavailable, falls back to deriving scouters from fichas

## Expected Column Names in Scouters Sheet

The code is flexible and accepts various column name formats:

| Data | Accepted Column Names |
|------|----------------------|
| Name | Nome, Scouter, Nome do Scouter |
| Tier/Level | Tier, Classificação, Nivel |
| Active Status | Status, Situação, Ativo |
| Weekly Goal | Meta Semanal, Meta, Meta/Semana |

## Active Status Detection

A scouter is considered **inactive** if their status contains:
- "inativo"
- "inativa"
- "desligado"
- "desligada"
- "pausado"
- "férias" / "ferias"
- "afastado"

Otherwise, the scouter is considered **active** by default.

## Testing & Debugging

### Console Logs to Check

When the Scouters page loads, check the browser console for:

```
GoogleSheetsService: Buscando scouters da aba dedicada...
GoogleSheetsService: Campos disponíveis no primeiro scouter: [...]
GoogleSheetsService: X scouters processados da aba dedicada
GoogleSheetsService: Scouters ativos: X
scoutersRepo: Using data from Scouters tab (X scouters found)
scoutersRepo: Enriching X scouters with fichas data from Y fichas
scoutersRepo: Grouped fichas into X unique scouter names
scoutersRepo: Enriched X scouters (Y active, Z inactive)
```

### If Using Fallback

If you see this message, the Scouters tab is empty or failed to load:
```
scoutersRepo: Scouters tab empty, falling back to deriving from fichas
```

### Test Connection

The test connection method in Configurações page now reports:
- Number of fichas
- Number of projetos
- Number of scouters
- Number of active scouters

## Troubleshooting

### Problem: Still showing 0 active scouters

**Check:**
1. Open browser console and look for the logs mentioned above
2. Verify the column names in your Scouters sheet match the expected names
3. Check if the Status column values are being parsed correctly
4. Verify the GID is correct (1351167110)

**Solution:**
- If column names don't match, you can add them to the column mapping in `googleSheetsService.ts`
- If status values aren't recognized, adjust the `parseAtivo()` function

### Problem: Names don't match between Scouters and Fichas

**Check:**
Console logs will show: `Scouter "X" has 0 fichas`

**Solution:**
Ensure the scouter names in the Scouters tab exactly match the names in the "Gestão de Scouter" column of the Fichas tab (after normalization). The normalization removes accents and extra spaces.

### Problem: CORS errors accessing the sheet

**Solution:**
The code automatically uses a proxy in development mode. In production, ensure the spreadsheet is publicly accessible or configure proper authentication.

## File Changes Summary

- ✅ `src/services/googleSheetsService.ts`: Added Scouters tab support
- ✅ `src/repositories/scoutersRepo.ts`: Refactored to use Scouters tab with fallback
- ✅ Added proper TypeScript types (no `any` types introduced)
- ✅ Maintained backward compatibility

## Performance Impact

- **Minimal**: One additional CSV fetch on page load
- **Cached**: React Query caches the results
- **Fallback**: If fetch fails, falls back to existing logic
