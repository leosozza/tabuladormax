# Análise de Migração: Gestão Scouter → TabuladorMax

## Resumo Executivo

A migração das funcionalidades do gestao-scouter para o tabuladormax é uma tarefa **significativa** que requer:

- **~50-70 arquivos** a serem criados/copiados
- **Múltiplas dependências** (hooks, utils, types, repositories)
- **Nova API de mapas** (backend)
- **Testes e validação** extensivos

## Escopo Detalhado

### 1. Dashboard (Estimativa: ~30 arquivos)

#### Componentes Principais
- `PerformanceDashboard.tsx` (672 linhas) ✅ copiado
- `ConfigurableIndicator.tsx`
- `IndicatorConfigModal.tsx`
- `DynamicWidget.tsx`
- `WidgetConfigModal.tsx`

#### Componentes de Suporte (Charts)
- `LeadsPorDiaChart.tsx`
- `TreemapChart.tsx`
- `HeatmapChart.tsx`
- Outros charts (6-8 arquivos)

#### Componentes de Suporte (Tables)
- `PipelineTable.tsx`
- `ScouterTable.tsx`
- `ProjectTable.tsx`
- Outros (4-6 arquivos)

#### Hooks Necessários
- `useAppSettings.ts` - configurações da aplicação
- `useIndicatorConfigs.ts` - configuração de indicadores
- `useDashboardConfig.ts` - configuração de dashboards

#### Utilities
- `iqsCalculation.ts` - cálculos de IQS
- `scouterMetrics.ts` - métricas de scouters
- `indicatorCalculations.ts` - cálculos de indicadores

#### Types
- `indicator.ts` - tipos de indicadores
- `dashboard.ts` - tipos de dashboard
- Outros types relacionados

#### Repositories
- `leadsRepo.ts` - repositório de leads (adaptar para tabuladormax)

### 2. Leads Tinder (Estimativa: ~10 arquivos)

#### Componentes
- `Leads.tsx` (página principal)
- `TinderCard.tsx` - card de swipe
- `SwipeControls.tsx` - controles
- `LeadAnalysis.tsx` - lógica de análise

#### Libs Necessárias
- `react-tinder-card` - já existe no gestao-scouter

### 3. Área de Abordagem + Mapas (Estimativa: ~20 arquivos + API)

#### Componentes de Mapa
- `AreaDeAbordagem.tsx` (página)
- `MapContainer.tsx`
- `LeadsHeatmap.tsx`
- `ScouterTracker.tsx`
- `AreaDrawing.tsx`
- `LocationMarkers.tsx`

#### API de Mapas (NOVO - Backend)
- Edge function ou endpoint para:
  - Buscar localizações de scouters
  - Atualizar localização em tempo real
  - Gerar dados de heatmap
  - Salvar/carregar áreas desenhadas

#### Libs de Mapa
- `leaflet` - mapas
- `leaflet.heat` - heatmap
- `@geoman-io/leaflet-geoman-free` - desenho
- Já existem no gestao-scouter

## Opções de Implementação

### Opção A: Migração Completa Imediata
**Prós:**
- Todas funcionalidades disponíveis de uma vez
- Teste integrado completo

**Contras:**
- PR muito grande (~70 arquivos)
- Alto risco de conflitos
- Difícil de revisar
- Tempo: ~8-12 horas

### Opção B: Migração Incremental (RECOMENDADO)
**Fase 1: Dashboard Base**
- Copiar PerformanceDashboard + dependências essenciais
- Adaptar para backend tabuladormax
- Testar e validar
- PR: ~20 arquivos
- Tempo: ~3-4 horas

**Fase 2: Leads Tinder**
- Copiar componentes de swipe
- Integrar com leads
- PR: ~10 arquivos
- Tempo: ~2-3 horas

**Fase 3: Mapas + API**
- Criar API de mapas
- Copiar componentes de mapa
- Integrar funcionalidades
- PR: ~20 arquivos + backend
- Tempo: ~4-5 horas

**Prós:**
- PRs menores e mais fáceis de revisar
- Validação incremental
- Reduz riscos
- Permite ajustes entre fases

**Contras:**
- Múltiplos PRs
- Mais tempo total (overhead de PRs)

### Opção C: Uso Direto via Workspace
**Alternativa:**
- Manter gestao-scouter como workspace separado
- Acessar via `packages/gestao-scouter`
- Compartilhar componentes via path aliases
- Gradualmente mover componentes conforme necessário

**Prós:**
- Aproveita integração já feita
- Menor duplicação de código
- Mais rápido

**Contras:**
- Dois "apps" separados
- Pode confundir usuários

## Recomendação

Dado o escopo, recomendo **Opção B (Incremental)** ou considerar **Opção C** inicialmente.

### Próximos Passos Sugeridos:

1. **Decisão do Escopo**
   - Revisar este documento
   - Decidir abordagem (A, B ou C)
   - Priorizar funcionalidades

2. **Se escolher Opção B (Incremental)**:
   - Começar com Fase 1 (Dashboard)
   - Criar novo PR: `feat/migrate-dashboard`
   - Copiar e adaptar ~20 arquivos
   - Testar e validar
   - Merge e depois próxima fase

3. **Se escolher Opção C (Workspace)**:
   - Documentar como acessar gestao-scouter
   - Criar rotas para ambos apps
   - Migrar só o essencial
   - Manter resto no workspace

## Arquivos Já Preparados

✅ `MIGRATION_PLAN.md` - plano detalhado
✅ `src/components/dashboard/PerformanceDashboard.tsx` - copiado (precisa adaptação)

## Questões para Decisão

1. Qual opção prefere? (A, B ou C)
2. Prazo/urgência para ter funcionalidades?
3. Preferência por PRs grandes ou pequenos?
4. Quer ajudar com testes/validação entre fases?

---

**Status**: Aguardando decisão sobre abordagem
**Última atualização**: 2025-10-24
