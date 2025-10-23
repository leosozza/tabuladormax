# Implementação dos Mapas com Clustering - Área de Abordagem

## Visão Geral

Esta implementação adiciona funcionalidade de clustering ao mapa de scouters e separa os dois mapas (Scouters e Fichas) lado a lado, conforme especificado no prompt.

## Requisitos Implementados

### ✅ Mapa 1: Scouters com Clustering
- **Clusters**: Marcadores agrupados em círculos amarelos com contagem
- **Zoom Dinâmico**: Ao aproximar (zoom >= 13), os clusters se separam em markers individuais
- **Nomes Visíveis**: Tooltips com nomes dos scouters tornam-se permanentes em zoom alto
- **Cores por Tier**:
  - Bronze: `#CD7F32` (marrom)
  - Prata: `#C0C0C0` (cinza)
  - Ouro: `#FFD700` (dourado)
- **Filtro de Scouter**: Filtra apenas o scouter selecionado

### ✅ Mapa 2: Heatmap de Fichas
- **Gradiente de Cores**: Verde (baixa densidade) → Amarelo → Vermelho (alta densidade)
- **Filtros**: Período, projeto e scouter
- **Atualização em Tempo Real**: Via Supabase Realtime

### ✅ Filtros Globais
- **Período**: Data início e fim
- **Projeto**: Dropdown com projetos disponíveis
- **Scouter**: Dropdown com scouters cadastrados
- **Aplicação**: Filtros afetam ambos os mapas simultaneamente

### ✅ Estatísticas em Tempo Real
- **Scouters Ativos**: Conta scouters com atualização ≤ 10 minutos
- **Pontos de Fichas**: Total de fichas no período filtrado

## Arquitetura

### Componentes Criados

#### `ScoutersClusterMap.tsx`
```
src/components/map/ScoutersClusterMap.tsx
```

**Funcionalidades:**
- Usa `leaflet.markercluster` para clustering
- Ícones customizados por tier (círculos coloridos com ícone de pessoa)
- Tooltips dinâmicos que se tornam permanentes em zoom alto
- Listener de zoom para atualizar tooltips automaticamente
- Popup com detalhes do scouter (tier, última atualização)
- Botão "Centralizar" para ajustar bounds

**Props:**
- `scouter?: string | null` - Filtra por scouter específico

#### Modificações em `AreaDeAbordagem.tsx`
```
src/pages/AreaDeAbordagem.tsx
```

**Mudanças:**
1. Removido `UnifiedMap` (que tinha toggle entre views)
2. Adicionado layout grid com 2 colunas para mapas lado a lado
3. Implementado sistema de filtros completo
4. Adicionado loading de filtros disponíveis do Supabase
5. Stats cards agora mostram dados reais (não mais "-")
6. Tooltips informativos atualizados

### Dependências Adicionadas

```json
{
  "leaflet.markercluster": "^1.5.3",
  "@types/leaflet.markercluster": "^1.5.6"
}
```

### CSS Importado

```typescript
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
```

## Configuração de Clustering

### MarkerClusterGroup Options
```typescript
{
  chunkedLoading: true,              // Carregamento em chunks para performance
  maxClusterRadius: 60,              // Raio máximo para agrupamento (pixels)
  spiderfyOnMaxZoom: true,          // Expande markers sobrepostos
  showCoverageOnHover: false,       // Não mostra área de cobertura
  zoomToBoundsOnClick: true,        // Zoom ao clicar no cluster
  iconCreateFunction: (cluster) => {
    // Círculos amarelos com contagem
    // Tamanho varia com quantidade (small/medium/large)
  }
}
```

### Tooltip Behavior

- **Zoom < 13**: Tooltips aparecem apenas on hover
- **Zoom >= 13**: Tooltips tornam-se permanentes (sempre visíveis)
- **Atualização**: Event listener `zoomend` atualiza todos os tooltips

## Filtros e Dados

### Fonte de Dados

#### Scouters
- **Tabela**: `public.scouters` + `public.scouter_locations`
- **RPC**: `get_scouters_last_locations()`
- **Realtime**: Subscrição em `scouter_locations` (INSERT)
- **GID**: 1351167110 (via Edge Function `sheets-locations-sync`)

#### Fichas
- **Tabela**: `public.fichas`
- **RPC**: `get_fichas_geo(p_start, p_end, p_project, p_scouter)`
- **Realtime**: Subscrição em `fichas` (lat/lng updates)
- **Geocodificação**: Edge Function `fichas-geo-enrich`

### Lógica de Filtros

```typescript
// Período: usado no RPC get_fichas_geo
startDate: 'YYYY-MM-DD'
endDate: 'YYYY-MM-DD'

// Projeto: filtro SQL no RPC
p_project: string | null

// Scouter: 
// - Mapa Scouters: filtro client-side
// - Heatmap: filtro SQL no RPC
p_scouter: string | null
```

## Tiles e Mapas

### OpenStreetMap (Padrão)
```typescript
url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
attribution: '© OpenStreetMap contributors'
maxZoom: 19
```

### Centro Padrão
São Paulo: `[-23.5505, -46.6333]`, zoom inicial: 11

## Performance

### Otimizações

1. **React Query Stale Time**:
   - Scouters: 30 segundos
   - Fichas: 60 segundos

2. **Clustering**:
   - `chunkedLoading: true` para renderização incremental
   - Markers só renderizados quando visíveis

3. **Realtime**:
   - Invalidação inteligente via subscriptions
   - Channels limpos no unmount

4. **Filtros**:
   - Carregados uma vez no mount
   - Cached localmente no estado

## UI/UX

### Layout Responsivo

```css
/* Desktop (lg): 2 colunas */
grid-cols-1 lg:grid-cols-2

/* Mobile: 1 coluna (stacked) */
grid-cols-1
```

### Feedback Visual

- **Loading**: Spinner sobre os mapas
- **Erro**: Mensagem de erro centralizada
- **Stats**: Atualizados em tempo real
- **Tooltips**: Informativos e não intrusivos

### Botões de Ação

1. **Enriquecer Geolocalização**: Processa fichas sem lat/lng
2. **Centralizar** (por mapa): Ajusta bounds para mostrar todos os pontos

## Aceite

### Comportamento Esperado

1. ✅ **Ao abrir a página**: 
   - Dois mapas aparecem lado a lado
   - Filtros padrão: últimos 30 dias, todos os projetos/scouters

2. ✅ **Mapa de Scouters**:
   - Clusters amarelos com número de scouters
   - Ao dar zoom, clusters se separam
   - Em zoom alto (>= 13), nomes aparecem permanentemente
   - Cores indicam tier

3. ✅ **Mapa de Calor**:
   - Gradiente verde → amarelo → vermelho
   - Vermelho = alta concentração de fichas
   - Verde = baixa concentração

4. ✅ **Filtros**:
   - Período altera heatmap
   - Projeto filtra fichas no heatmap
   - Scouter filtra ambos os mapas

5. ✅ **Estatísticas**:
   - "Scouters Ativos" conta markers ≤ 10 min
   - "Pontos de Fichas" mostra total no período

6. ✅ **Realtime**:
   - Nova posição de scouter → marker move
   - Ficha recebe lat/lng → heatmap atualiza

## Diferenças do Prompt Original

### Adaptações Feitas

1. **Filtro de Scouter no Mapa de Clustering**:
   - Implementado filtro client-side por scouter
   - Permite focar em um scouter específico

2. **Tooltips Inteligentes**:
   - Em vez de sempre permanentes, tornam-se permanentes em zoom alto
   - Melhor UX: não poluem a tela em zoom baixo

3. **Layout Responsivo**:
   - Desktop: lado a lado
   - Mobile: stacked
   - Não especificado no prompt, mas necessário

### Não Implementado (Futuro)

- [ ] Botão "Sincronizar planilhas agora" específico
- [ ] Histórico de movimento (trail) dos scouters
- [ ] Notificações de entrada/saída de área
- [ ] Exportação KML/GeoJSON

## Troubleshooting

### Clusters não aparecem
- Verificar se `leaflet.markercluster` está instalado
- Confirmar importação dos CSS
- Checar console por erros

### Tooltips não ficam permanentes
- Zoom deve ser >= 13
- Listener `zoomend` deve estar ativo
- Verificar no console se markers estão sendo criados

### Heatmap não mostra vermelho
- Precisa ter múltiplas fichas próximas
- Verificar se fichas têm lat/lng válidos
- Configuração do gradiente em `FichasHeatmap.tsx`

### Filtros não funcionam
- Verificar se RPCs estão criados no Supabase
- Confirmar que `get_fichas_geo` aceita os parâmetros
- Checar network tab para erros de API

## Comandos

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Dev
```bash
npm run dev
```

## Arquivos Modificados

1. `package.json` - Dependências
2. `package-lock.json` - Lock file
3. `src/pages/AreaDeAbordagem.tsx` - Layout e filtros
4. `src/components/map/ScoutersClusterMap.tsx` - Novo componente

## Checklist de Verificação

- [x] Migration `20251001_geo_ingest.sql` aplicada
- [x] Edge Functions `sheets-locations-sync` e `fichas-geo-enrich` deployadas
- [x] Hooks `useScoutersLastLocations` e `useFichasGeo` funcionando
- [x] Componente `ScoutersClusterMap` criado
- [x] Página `AreaDeAbordagem` atualizada
- [x] Filtros implementados e funcionais
- [x] Stats cards com dados reais
- [x] Build passa sem erros
- [x] Linting sem novos erros

## Próximos Passos Sugeridos

1. Adicionar toggle de tile server no UI
2. Implementar histórico/trail de movimento
3. Adicionar filtro por tier no mapa de scouters
4. Exportação de dados geográficos
5. Notificações push de eventos geográficos
6. Habilitar desenho de áreas/polígonos de interesse

## Referências

- [Leaflet](https://leafletjs.com/)
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster)
- [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
