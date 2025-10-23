# Quick Testing Guide - Cluster Maps

## Como Testar a Implementação

### 1. Pré-requisitos

Certifique-se de que:
- [ ] Migration `20251001_geo_ingest.sql` está aplicada no Supabase
- [ ] Edge Functions `sheets-locations-sync` e `fichas-geo-enrich` estão deployadas
- [ ] Há dados em `scouters` e `scouter_locations` (via sync do GID 1351167110)
- [ ] Há fichas com `lat/lng` preenchidos em `fichas`

### 2. Acessar a Página

```bash
# Development
npm run dev

# Navegar para:
http://localhost:8080/area-de-abordagem
```

### 3. Testes de Funcionalidade

#### ✅ Mapa de Scouters (Esquerda)

**Teste 1: Clusters Aparecem**
- [ ] Ao carregar, clusters amarelos devem aparecer
- [ ] Números dentro dos clusters indicam quantidade de scouters
- [ ] Clusters têm tamanhos diferentes (small/medium/large)

**Teste 2: Zoom e Separação de Clusters**
- [ ] Clicar em um cluster → zoom automático
- [ ] Ao aproximar, clusters se separam em markers individuais
- [ ] Markers são círculos coloridos (Bronze/Prata/Ouro)

**Teste 3: Tooltips com Nomes**
- [ ] Passar mouse sobre marker → tooltip aparece com nome
- [ ] Zoom in até nível 13+ → tooltips ficam permanentes
- [ ] Zoom out abaixo de 13 → tooltips desaparecem (só no hover)

**Teste 4: Popup de Detalhes**
- [ ] Clicar em marker → popup abre
- [ ] Popup mostra: nome, tier, última atualização
- [ ] Última atualização em português (e.g., "há 5 minutos")

**Teste 5: Botão Centralizar**
- [ ] Clicar "Centralizar" → mapa ajusta para mostrar todos os scouters
- [ ] Bounds incluem todos os markers com padding

#### ✅ Mapa de Calor (Direita)

**Teste 1: Heatmap Aparece**
- [ ] Ao carregar, camada de calor deve aparecer
- [ ] Cores vão de verde (baixa) → amarelo → vermelho (alta)
- [ ] Áreas com mais fichas ficam vermelhas

**Teste 2: Intensidade de Cores**
- [ ] Verde: poucas fichas na região
- [ ] Amarelo: concentração média
- [ ] Vermelho: alta concentração de fichas

**Teste 3: Botão Centralizar**
- [ ] Clicar "Centralizar" → mapa ajusta para mostrar todos os pontos
- [ ] Bounds incluem todas as fichas

#### ✅ Filtros Globais

**Teste 1: Filtro de Período**
- [ ] Alterar "Data Início" → heatmap atualiza
- [ ] Alterar "Data Fim" → heatmap atualiza
- [ ] Card "Pontos de Fichas" atualiza contagem

**Teste 2: Filtro de Projeto**
- [ ] Dropdown lista projetos do banco
- [ ] Selecionar projeto → heatmap mostra apenas fichas desse projeto
- [ ] "Todos os projetos" → mostra todas as fichas

**Teste 3: Filtro de Scouter**
- [ ] Dropdown lista scouters do banco
- [ ] Selecionar scouter → mapa de scouters mostra apenas esse
- [ ] Selecionar scouter → heatmap mostra apenas fichas desse
- [ ] "Todos os scouters" → mostra todos

#### ✅ Estatísticas em Tempo Real

**Teste 1: Card Scouters Ativos**
- [ ] Mostra número de scouters com atualização ≤ 10 minutos
- [ ] Atualiza automaticamente quando nova posição chega

**Teste 2: Card Pontos de Fichas**
- [ ] Mostra total de fichas no período filtrado
- [ ] Atualiza quando filtros mudam
- [ ] Atualiza quando fichas recebem lat/lng

#### ✅ Realtime Updates

**Teste 1: Nova Posição de Scouter**
- [ ] Executar `sheets-locations-sync`
- [ ] Marker move ou aparece automaticamente
- [ ] Não requer refresh da página

**Teste 2: Nova Ficha com Lat/Lng**
- [ ] Executar `fichas-geo-enrich`
- [ ] Heatmap atualiza com novos pontos
- [ ] Card "Pontos de Fichas" atualiza

#### ✅ Responsividade

**Teste 1: Desktop (≥1024px)**
- [ ] Mapas aparecem lado a lado (2 colunas)
- [ ] Filtros em 4 colunas
- [ ] Cards de stats em 2 colunas

**Teste 2: Tablet (768-1023px)**
- [ ] Mapas empilhados (1 coluna)
- [ ] Filtros em 2-3 colunas
- [ ] Cards de stats em 2 colunas

**Teste 3: Mobile (<768px)**
- [ ] Mapas empilhados (1 coluna)
- [ ] Filtros em 1 coluna
- [ ] Cards de stats em 1 coluna

#### ✅ Botão Enriquecer Geolocalização

**Teste 1: Execução**
- [ ] Clicar botão → spinner aparece
- [ ] Toast de sucesso com números processados
- [ ] Heatmap atualiza se novas fichas foram geocodificadas

**Teste 2: Erro**
- [ ] Se falhar, toast de erro aparece
- [ ] Mensagem clara do erro

### 4. Testes de Performance

#### ✅ Carregamento Inicial
- [ ] Página carrega em < 2s (dev)
- [ ] Spinner aparece enquanto carrega dados
- [ ] Sem erros no console

#### ✅ Interações
- [ ] Zoom in/out fluido
- [ ] Pan no mapa responsivo
- [ ] Clusters atualizam rapidamente

#### ✅ Filtros
- [ ] Mudança de filtro < 500ms
- [ ] Sem lag ao mudar dropdowns
- [ ] Mapas atualizam instantaneamente

### 5. Testes Visuais

#### ✅ Cores e Estilos
- [ ] Clusters amarelos (#FFC107)
- [ ] Markers: Bronze/Prata/Ouro visíveis
- [ ] Tooltips com fundo escuro legível
- [ ] Heatmap com gradiente claro

#### ✅ Layout
- [ ] Cards bem espaçados
- [ ] Mapas com altura adequada (600px)
- [ ] Botões alinhados corretamente
- [ ] Info card ao final legível

### 6. Cenários de Erro

#### ✅ Sem Dados
- [ ] Sem scouters → mapa vazio, sem erros
- [ ] Sem fichas → heatmap vazio, sem erros
- [ ] Cards mostram "0"

#### ✅ Erro de API
- [ ] Se RPC falhar → mensagem de erro no mapa
- [ ] Se Realtime falhar → dados ainda carregam (sem Realtime)
- [ ] Console mostra erro claro

### 7. Comandos Úteis para Testes

```bash
# Sincronizar posições de scouters
curl -X POST \
  "https://SEU_PROJETO.supabase.co/functions/v1/sheets-locations-sync" \
  -H "X-Secret: seu_segredo"

# Enriquecer geolocalização de fichas
curl -X POST \
  "https://SEU_PROJETO.supabase.co/functions/v1/fichas-geo-enrich?limit=50" \
  -H "X-Secret: seu_segredo"

# Verificar última posição dos scouters
SELECT * FROM scouter_last_location;

# Verificar fichas com geo
SELECT COUNT(*) FROM fichas WHERE lat IS NOT NULL AND lng IS NOT NULL;
```

### 8. Checklist Final

Antes de aprovar o PR:
- [ ] Todos os testes acima passaram
- [ ] Build de produção funciona: `npm run build`
- [ ] Linting sem novos erros: `npm run lint`
- [ ] Documentação está completa
- [ ] Screenshots da implementação anexados (se possível)

### 9. Problemas Conhecidos / Limitações

**Não são bugs, mas comportamento esperado:**
- Tooltips só ficam permanentes em zoom >= 13 (intencional)
- Heatmap não mostra endereços, só intensidade (by design)
- Filtro de scouter no mapa é client-side (pode ser lento com 100+ scouters)
- Mobile pode ter performance reduzida com muitos markers

### 10. Próximos Passos (Fora do Escopo)

- [ ] Toggle de tile server no UI
- [ ] Histórico/trail de movimento dos scouters
- [ ] Filtro por tier no mapa de scouters
- [ ] Desenho de áreas/polígonos de interesse
- [ ] Exportação KML/GeoJSON
- [ ] Notificações de eventos geográficos
