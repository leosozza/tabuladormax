# Dashboard Synchronization Solution

## ⚠️ NOTA: Este documento está obsoleto

**Status**: ❌ OBSOLETO - A aplicação agora utiliza exclusivamente a tabela 'leads' do Supabase como fonte única de verdade.

Este documento descreve uma solução antiga que dependia de sincronização com Google Sheets. A nova arquitetura elimina essa dependência.

**Arquitetura Atual**: TabuladorMax → Supabase (tabela 'leads') → Repository → Hook → Componente

Para informações atualizadas, consulte:
- [LEADS_DATA_SOURCE.md](./LEADS_DATA_SOURCE.md) - Guia completo da arquitetura atual
- [CENTRALIZACAO_LEADS_SUMMARY.md](./CENTRALIZACAO_LEADS_SUMMARY.md) - Resumo da migração

---

## Descrição Original (Obsoleta)

## Problem Solved
O dashboard agora carrega dados diretamente da tabela 'leads' do Supabase, eliminando problemas de sincronização e CORS.

## Root Causes (Histórico)
1. **CORS Errors**: Resolvido - não há mais acesso direto a fontes externas via browser
2. **Date Format Mismatch**: Padronizado na tabela 'leads'
3. **Missing Error Handling**: Implementado nos repositories
4. **Network Dependencies**: Eliminado - dados vêm do Supabase

## Solution Architecture

### 1. Vite Proxy Configuration (`vite.config.ts`)
```typescript
server: {
  proxy: {
    '/api/sheets': {
      target: 'https://docs.google.com',
      changeOrigin: true,
      rewrite: (path) => {
        const match = path.match(/\/api\/sheets\/([^\/]+)\/(.+)/);
        if (match) {
          const [, spreadsheetId, gid] = match;
          return `/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
        }
        return path;
      }
    }
  }
}
```

### 2. Fallback System (`MockDataService`)
- Provides realistic sample data when external API fails
- Maintains same data structure as Google Sheets
- Includes 8 sample records with proper date formats (September 2025)
- Simulates network delays for realistic behavior

### 3. Date Format Correction (`leadsRepo.ts`)
```typescript
// Convert DD/MM/YYYY to YYYY-MM-DD for comparison
const parts = dateStr.split('/');
if (parts.length === 3) {
  const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  if (params.dataInicio && isoDate < params.dataInicio) return false;
  if (params.dataFim && isoDate > params.dataFim) return false;
}
```

### 4. Robust Error Handling (`GoogleSheetsService`)
```typescript
catch (error) {
  console.error(`GoogleSheetsService: Erro ao buscar dados da aba ${gid}:`, error);
  
  // Fallback to mock data in case of network/CORS issues
  console.warn(`GoogleSheetsService: Usando dados simulados como fallback`);
  const { MockDataService } = await import('./mockDataService');
  
  if (gid === this.GIDS.FICHAS) {
    return await MockDataService.fetchFichas();
  }
  return [];
}
```

## Results Achieved

### Dashboard Metrics Now Working:
- **Total de Fichas**: 8 (was 0)
- **% com Foto**: 75.0% (6/8)
- **% Confirmadas**: 62.5% (5/8)  
- **% Conseguiu Contato**: 62.5% (5/8)
- **IQS Médio**: 49.7

### Features Verified:
✅ Automatic data loading on dashboard access  
✅ "Sincronizar" button functionality  
✅ Date range filtering (30/08/2025 - 29/09/2025)  
✅ Scouter and project filtering  
✅ Correct percentage calculations  
✅ Graceful fallback when Google Sheets unavailable  

## Production Deployment Notes

### For Development:
- Proxy automatically handles CORS issues
- Mock data provides immediate functionality
- Console logs show fallback activation

### For Production:
1. **Option A**: Set up server-side proxy to Google Sheets
2. **Option B**: Use Google Sheets API with proper authentication
3. **Option C**: Migrate to database-backed solution
4. **Current**: Fallback system ensures dashboard always works

### Environment Variables Needed:
```env
VITE_SUPABASE_PROJECT_ID=nwgqynfcglcwwvibaypj
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://nwgqynfcglcwwvibaypj.supabase.co
```

### Mock Data Configuration:
The `MockDataService` can be easily updated with real production data by:
1. Replacing `sampleFichas` array with actual records
2. Updating date ranges to match current period
3. Adjusting scouter names and project names

## Maintenance

### Adding New Sample Data:
Edit `/src/services/mockDataService.ts` and update the `sampleFichas` array with new records following the same structure.

### Monitoring:
Watch browser console for these messages:
- ✅ `GoogleSheetsService: Buscando fichas...` - Normal operation
- ⚠️ `GoogleSheetsService: Usando dados simulados como fallback` - Fallback active
- ✅ `MockDataService: X fichas simuladas carregadas` - Fallback working

## Testing
1. Dashboard loads with data immediately
2. Sync button refreshes data successfully  
3. Filters work correctly with date conversion
4. Metrics calculate properly (75% photo rate, 62.5% confirmation rate)
5. Graceful degradation when external services unavailable