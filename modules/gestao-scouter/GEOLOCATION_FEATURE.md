# Geolocalização - Área de Abordagem

## Visão Geral

Este módulo implementa funcionalidades de geolocalização em tempo real para a aplicação Gestão Scouter, incluindo:
- **Mapa de Scouters ao Vivo**: Rastreamento em tempo real das posições dos scouters
- **Mapa de Calor de Fichas**: Visualização da densidade de fichas por localização
- **Geocodificação Automática**: Conversão de endereços em coordenadas geográficas

## Arquitetura

### 1. Banco de Dados (Supabase)

#### Tabelas Criadas

**`public.scouters`**
- Armazena informações dos scouters
- Campos: `id`, `name` (único), `tier` (Bronze/Prata/Ouro)

**`public.scouter_locations`**
- Histórico de localizações dos scouters
- Campos: `id`, `scouter_id`, `lat`, `lng`, `accuracy`, `heading`, `speed`, `source`, `at`
- Índice: `(scouter_id, at desc)` para queries rápidas

**`public.geocache`**
- Cache de geocodificações para evitar requisições repetidas
- Campos: `query`, `lat`, `lng`, `resolved_at`
- Chave primária: `query`

**Colunas Adicionadas em `public.fichas`**
- `lat` (double precision)
- `lng` (double precision)
- `localizacao` (text)

#### Views

**`public.scouter_last_location`**
- Retorna a última posição de cada scouter
- Utiliza `DISTINCT ON` para otimização

#### RPCs (Remote Procedure Calls)

**`get_scouters_last_locations()`**
- Retorna as últimas posições de todos os scouters
- Usado pelo mapa em tempo real

**`get_fichas_geo(p_start, p_end, p_project, p_scouter)`**
- Retorna fichas com geolocalização em um período
- Suporta filtros por projeto e scouter
- Usado pelo heatmap

### 2. Edge Functions

#### `scouter-locations-sync`

**Propósito**: Sincroniza localizações de scouters do TabuladorMax

**Formato de Entrada** (dados da tabela):
```
scouter            | latitude        | longitude       | tier
-------------------|-----------------|-----------------|-------
Taciana melo       | -23.5491761     | -46.6881783     | Bronze
Herick- Teste      | -23.5491761     | -46.6881783     | Prata
```

**Processo**:
1. Lê dados da tabela de scouters
2. Valida coordenadas
3. Faz upsert em `scouters` (por nome)
4. Insere nova localização em `scouter_locations`

**Autenticação**: Header `X-Secret: SHEETS_SYNC_SHARED_SECRET`

**Como chamar**:
```bash
curl -X POST \
  https://SEU_PROJETO.supabase.co/functions/v1/sheets-locations-sync \
  -H "X-Secret: seu_segredo"
```

#### `fichas-geo-enrich`

**Propósito**: Enriquece fichas com coordenadas a partir da coluna "Localização"

**Processo**:
1. Busca fichas sem `lat/lng` mas com `localizacao` preenchida
2. **Se for coordenada**: Faz parse direto
3. **Se for endereço**: 
   - Verifica cache (`geocache`)
   - Se não existir, geocodifica usando Nominatim (OpenStreetMap)
   - Salva no cache
   - Atualiza a ficha
4. Respeita rate limit (1 req/seg para Nominatim)

**Autenticação**: Header `X-Secret: SHEETS_SYNC_SHARED_SECRET`

**Como chamar**:
```bash
curl -X POST \
  "https://SEU_PROJETO.supabase.co/functions/v1/fichas-geo-enrich?limit=50" \
  -H "X-Secret: seu_segredo"
```

### 3. Frontend

#### Hooks

**`useScoutersLastLocations()`**
- Busca últimas localizações via RPC
- Subscreve a realtime updates na tabela `scouter_locations`
- Retorna: `{ locations, isLoading, error, refetch }`

**`useFichasGeo(params)`**
- Busca fichas georeferenciadas por período
- Subscreve a realtime updates na tabela `fichas`
- Params: `{ startDate, endDate, project, scouter }`
- Retorna: `{ fichasGeo, isLoading, error, refetch }`

#### Componentes de Mapa

**`ScouterLiveMap`**
- Mapa Leaflet com OpenStreetMap tiles
- Markers customizados coloridos por tier:
  - Bronze: `#CD7F32` (marrom)
  - Prata: `#C0C0C0` (cinza)
  - Ouro: `#FFD700` (dourado)
- Popups com informações do scouter
- Contador de scouters ativos (≤10 min)
- Botão "Centralizar" para ajustar zoom

**`FichasHeatmap`**
- Heatmap usando `leaflet.heat`
- Gradiente de cores: azul → verde → amarelo → vermelho
- Configurável: radius=25, blur=15
- Filtros: período, projeto, scouter
- Atualização em tempo real

#### Página Principal

**`/area-de-abordagem`**
- Layout com dois mapas lado a lado (desktop)
- Cards de estatísticas no topo
- Botão "Enriquecer Geolocalização" (chama edge function)
- Seção informativa sobre os mapas

## Configuração

### 1. Variáveis de Ambiente

Adicione ao `.env`:
```env
VITE_SUPABASE_URL=https://seu_projeto.supabase.co
VITE_SHEETS_SYNC_SHARED_SECRET=seu_segredo_compartilhado
```

### 2. Secrets do Supabase

Configure no Supabase Dashboard > Settings > Edge Functions:
```
SHEETS_SYNC_SHARED_SECRET=seu_segredo_compartilhado
SHEETS_ID=14l4A_BOFZM-TwLuam-bKzUgInNAA7fOCeamdkE1nt_o
NEXT_PUBLIC_SUPABASE_URL=https://seu_projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### 3. Deploy das Edge Functions

```bash
# Deploy sheets-locations-sync
supabase functions deploy sheets-locations-sync

# Deploy fichas-geo-enrich
supabase functions deploy fichas-geo-enrich
```

### 4. Migration

```bash
# Aplicar migration
supabase db push

# Ou via SQL Editor no dashboard
# Copiar conteúdo de supabase/migrations/20251001_geo_ingest.sql
```

### 5. Google Apps Script (Opcional)

Para sincronização automática do Grid 1351167110:

```javascript
const EDGE_FUNCTION_URL = 'https://SEU_PROJETO.supabase.co/functions/v1/sheets-locations-sync';
const SHARED_SECRET = 'seu_segredo';

function syncScouterLocations() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NOME_DA_ABA');
  // ... implementar lógica de sync
}

// Trigger: executar a cada 5 minutos ou manualmente
```

## Uso

### 1. Sincronizar Localizações de Scouters

**Manualmente via curl**:
```bash
curl -X POST \
  https://SEU_PROJETO.supabase.co/functions/v1/sheets-locations-sync \
  -H "X-Secret: seu_segredo"
```

**Resposta esperada**:
```json
{
  "success": true,
  "upsertedScouters": 10,
  "insertedLocations": 8
}
```

### 2. Enriquecer Geolocalização de Fichas

**Na interface**: Clique no botão "Enriquecer Geolocalização" na página /area-de-abordagem

**Manualmente via curl**:
```bash
curl -X POST \
  "https://SEU_PROJETO.supabase.co/functions/v1/fichas-geo-enrich?limit=50" \
  -H "X-Secret: seu_segredo"
```

**Resposta esperada**:
```json
{
  "success": true,
  "processed": 45,
  "geocoded": 30,
  "fromCache": 15,
  "total": 50
}
```

### 3. Visualizar Mapas

1. Acesse `/area-de-abordagem` na aplicação
2. **Mapa da Esquerda**: Mostra scouters em tempo real
3. **Mapa da Direita**: Mostra heatmap de fichas (últimos 30 dias)
4. Clique em "Centralizar" para ajustar o zoom
5. Clique em markers para ver detalhes

## Formatos de Dados

### Coordenadas do Grid de Scouters

Aceita os seguintes formatos:
- `-23.5491761,-46.6881783`
- `-23.5491761, -46.6881783` (com espaço)
- `-23.5491761,-46.6881783 (, )` (com sufixo)
- `-23.5491761,-46.6881783(,)` (sem espaços)

### Coluna "Localização" das Fichas

Aceita:
- **Coordenadas**: `-23.55,-46.68`
- **Endereços**: `"Rua Augusta, 123, São Paulo, SP"`

## Rate Limits e Otimizações

### Nominatim (Geocoding)
- **Limite**: 1 requisição/segundo
- **Solução**: Implementado delay de 1s entre requisições
- **Cache**: Endereços geocodificados são armazenados em `geocache`

### Realtime Updates
- **Debounce**: 500ms para evitar re-renders excessivos
- **Channel Management**: Canais são limpos no unmount dos componentes

## Troubleshooting

### Mapas não aparecem
1. Verifique se as dependências foram instaladas: `npm install leaflet leaflet.heat @types/leaflet`
2. Confirme que o CSS do Leaflet está sendo importado
3. Verifique console do navegador por erros

### Geocodificação falhando
1. Verifique conectividade com Nominatim
2. Confirme que o rate limit está sendo respeitado
3. Verifique logs da Edge Function

### Dados não aparecem em tempo real
1. Confirme que a migration foi aplicada
2. Verifique se o Realtime está habilitado no Supabase
3. Confirme que as policies RLS estão corretas

### Edge Functions retornam 403
1. Verifique se o header `X-Secret` está correto
2. Confirme que `SHEETS_SYNC_SHARED_SECRET` está configurado nos Secrets

## Performance

### Otimizações Implementadas

1. **Índices no banco**:
   - `(scouter_id, at desc)` em `scouter_locations`
   - `(lat, lng)` em `fichas`

2. **Views Materializadas**:
   - `scouter_last_location` usa `DISTINCT ON` para performance

3. **Cache de Geocoding**:
   - Tabela `geocache` evita requisições repetidas ao Nominatim

4. **React Query**:
   - `staleTime: 30s` para scouter locations
   - `staleTime: 60s` para fichas geo
   - Invalidação inteligente via Realtime

5. **Lazy Loading**:
   - Página carregada via React.lazy
   - Code splitting automático

## Referências

- [Leaflet Documentation](https://leafletjs.com/)
- [Leaflet.heat Plugin](https://github.com/Leaflet/Leaflet.heat)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Nominatim API](https://nominatim.org/release-docs/latest/api/Overview/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

## Próximos Passos

- [ ] Implementar filtros de período no heatmap (UI)
- [ ] Adicionar toggle para escolher tier de scouters no mapa
- [ ] Implementar clustering de markers para áreas densas
- [ ] Adicionar histórico de movimento dos scouters (trail)
- [ ] Implementar notificações quando scouter entra/sai de área
- [ ] Adicionar exportação de dados geográficos (KML/GeoJSON)
