# Plano de Migração: Gestão Scouter → TabuladorMax

## Status: Em Andamento

### Objetivo
Migrar funcionalidades específicas do gestao-scouter para o tabuladormax principal, mantendo a interface e funcionalidade idênticas mas usando o backend atual do tabuladormax.

## Funcionalidades a Migrar

### 1. Dashboard ✅ (Em Implementação)
**Origem**: `packages/gestao-scouter/src/pages/Dashboard.tsx`
**Destino**: `src/pages/Dashboard.tsx` (substituir/melhorar)

**Componentes a migrar:**
- [ ] DashboardHeader - cabeçalho com filtros
- [ ] ConfigurableIndicator - cards de métricas configuráveis
- [ ] DynamicWidget - widgets drag-and-drop
- [ ] Charts (TreemapChart, HeatmapChart, etc.)
- [ ] ProjectFilters - filtros de projeto
- [ ] AnalysisPanel - painel de análise

**Backend:**
- ✅ Tabela leads existe
- ✅ APIs de leads existem
- [ ] Adaptar queries para estrutura do tabuladormax

### 2. Leads - Análise Tinder ⏳
**Origem**: `packages/gestao-scouter/src/pages/Leads.tsx`
**Destino**: Nova aba/componente em `src/pages/`

**Componentes a migrar:**
- [ ] TinderCard - card de swipe
- [ ] LeadAnalysis - lógica de análise
- [ ] SwipeControls - controles de swipe

**Backend:**
- ✅ Tabela leads existe
- [ ] Adicionar campos de análise Tinder se necessário

### 3. Área de Abordagem + API de Mapas 🔴
**Origem**: `packages/gestao-scouter/src/pages/AreaDeAbordagem.tsx`
**Destino**: Nova página/substituir existente

**Componentes a migrar:**
- [ ] MapContainer - container do mapa
- [ ] LeadsHeatmap - mapa de calor
- [ ] ScouterTracker - rastreamento em tempo real
- [ ] AreaDrawing - desenho de áreas
- [ ] LocationMarkers - marcadores de localização

**Backend:**
- ✅ Tabela de geolocalização existe
- 🔴 API de mapas NÃO existe (precisa criar)
  - [ ] Endpoint para buscar localizações
  - [ ] Endpoint para atualizar localização em tempo real
  - [ ] Endpoint para dados de heatmap
  - [ ] Endpoint para áreas desenhadas

## Estratégia de Implementação

### Fase 1: Dashboard (Atual)
1. Criar componentes base do dashboard
2. Migrar lógica de métricas
3. Adaptar para backend tabuladormax
4. Testar e validar

### Fase 2: Leads Tinder
1. Migrar componentes de swipe
2. Integrar com tabela leads
3. Adicionar rota/aba
4. Testar funcionalidade

### Fase 3: Mapas + API
1. Criar API de mapas (edge functions ou endpoints)
2. Migrar componentes de mapa
3. Implementar rastreamento em tempo real
4. Implementar heatmap
5. Implementar desenho de áreas
6. Testar integração completa

## Notas Técnicas

### Dependências a Adicionar
- Leaflet (mapas) - já existe em gestao-scouter
- React-grid-layout (dashboard) - já existe em tabuladormax
- Outras libs de charts se necessário

### Adaptações Necessárias
- Supabase client: usar `@/integrations/supabase/client`
- Tipos: criar/adaptar types para compatibilidade
- Rotas: adicionar no router principal
- Estilos: manter consistência com tema tabuladormax

## Checklist de Verificação

### Geral
- [ ] Build sem erros
- [ ] TypeScript sem erros
- [ ] Testes passando
- [ ] Lint passando

### Dashboard
- [ ] Métricas carregam corretamente
- [ ] Filtros funcionam
- [ ] Widgets são configuráveis
- [ ] Drag-and-drop funciona

### Leads Tinder
- [ ] Swipe funciona
- [ ] Dados carregam
- [ ] Análise salva corretamente

### Mapas
- [ ] API responde corretamente
- [ ] Mapa carrega
- [ ] Heatmap mostra dados
- [ ] Rastreamento atualiza em tempo real
- [ ] Desenho de áreas funciona
- [ ] Marcadores aparecem corretamente

## Commits Planejados
1. `feat: add dashboard components from gestao-scouter`
2. `feat: add tinder-style lead analysis`
3. `feat: add map API endpoints`
4. `feat: add area de abordagem with maps`
5. `fix: adapt components to tabuladormax backend`
6. `docs: update migration plan and usage`

---

**Última atualização**: 2025-10-24
**Status**: Fase 1 iniciada - Dashboard
