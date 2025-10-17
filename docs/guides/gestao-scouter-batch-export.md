# Exportação em Lote para gestao-scouter

## 📋 Visão Geral

Esta funcionalidade permite exportar leads existentes do TabuladorMax para a tabela fichas do gestao-scouter em lotes, processando das datas mais recentes para as mais antigas, similar ao funcionamento da importação do Bitrix.

## 🎯 Casos de Uso

- **Carga Inicial**: Enviar dados históricos do TabuladorMax para o gestao-scouter pela primeira vez
- **Reprocessamento**: Re-exportar leads de períodos específicos
- **Recuperação**: Sincronizar leads que não foram capturados pela sincronização automática
- **Migração Controlada**: Mover dados em lotes com controle de pausar/retomar

## 🏗️ Arquitetura

### Componentes Implementados

```
┌────────────────────────────────────────────────────────┐
│                  UI: SyncMonitor                       │
│         Tab "Importações" → "Gestão Scouter"           │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  GestaoScouterExportTab.tsx                  │    │
│  │  - Seleção de datas                          │    │
│  │  - Controles de pausar/retomar               │    │
│  │  - Monitoramento em tempo real               │    │
│  │  - Histórico de exportações                  │    │
│  └──────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────┘
                          │
                          │ HTTP POST
                          ▼
┌────────────────────────────────────────────────────────┐
│        Edge Function: export-to-gestao-scouter-batch   │
│                                                        │
│  Actions:                                              │
│  - create: Cria novo job de exportação                │
│  - pause: Pausa job em execução                       │
│  - resume: Retoma job pausado                         │
│                                                        │
│  Processamento:                                        │
│  1. Busca leads por data (mais recente → antiga)      │
│  2. Batch de 100 leads por vez                        │
│  3. Upsert em gestao-scouter.fichas                   │
│  4. Registra cada lead em sync_events                 │
│  5. Atualiza progresso no job                         │
│  6. Delay de 500ms entre lotes                        │
└────────────────────────────────────────────────────────┘
                          │
                          │ Registra em
                          ▼
┌────────────────────────────────────────────────────────┐
│  Tabela: gestao_scouter_export_jobs                    │
│  - id, status, start_date, end_date                    │
│  - processing_date, last_completed_date                │
│  - total_leads, exported_leads, error_leads            │
│  - pause_reason, paused_at                             │
│  - created_at, started_at, completed_at                │
└────────────────────────────────────────────────────────┘
```

## 📊 Fluxo de Exportação

### 1. Criação do Job

```typescript
POST /functions/v1/export-to-gestao-scouter-batch
{
  "action": "create",
  "startDate": "2025-10-17",  // Data mais recente
  "endDate": "2024-01-01"     // Data mais antiga (opcional)
}
```

### 2. Processamento

```
Data Inicial: 2025-10-17 (hoje)
    ↓
Buscar leads de 2025-10-17
    ↓
Exportar batch de 100 leads → gestao-scouter
    ↓
Registrar em sync_events
    ↓
Atualizar progresso do job
    ↓
Data Anterior: 2025-10-16
    ↓
Repetir até chegar em endDate (ou até o começo se endDate = null)
```

### 3. Estados do Job

```
pending → running → completed
              ↓
            paused → running
              ↓
            failed
```

## 🎨 Interface do Usuário

### Localização
`/sync-monitor` → Tab "Importações" → Sub-tab "Gestão Scouter"

### Elementos da Interface

**Card Principal: "Exportação em Lote"**
- 📅 Campo: Data Inicial (mais recente)
- 📅 Campo: Data Final (mais antiga, opcional)
- 🚀 Botão: "Iniciar Exportação"
- ℹ️ Alert: Informações sobre o uso

**Card de Progresso (quando job ativo):**
- 📊 Barra de progresso visual
- 📈 Total de leads processados
- ✅ Leads exportados com sucesso
- ❌ Erros durante exportação
- 📅 Data sendo processada atualmente
- ⏸️ Botão: "Pausar" (se running)
- ▶️ Botão: "Retomar" (se paused)

**Card de Histórico:**
- 📋 Últimos 10 jobs de exportação
- Status com cores (running, completed, paused, failed)
- Contadores de exportados/erros
- Data e hora de criação

## 🔧 Configuração e Uso

### Pré-requisitos

1. **Configuração do gestao-scouter ativa:**
```sql
SELECT * FROM gestao_scouter_config 
WHERE active = true AND sync_enabled = true;
```

2. **Tabela fichas criada no gestao-scouter:**
Execute o script: `docs/gestao-scouter-fichas-table.sql`

3. **Edge Function deployada:**
```bash
supabase functions deploy export-to-gestao-scouter-batch
```

### Passo a Passo de Uso

1. **Acessar Interface:**
   - Vá para `/sync-monitor`
   - Clique na aba "Importações"
   - Selecione "Gestão Scouter"

2. **Configurar Exportação:**
   - **Data Inicial**: Escolha a data mais recente (ex: hoje)
   - **Data Final**: 
     - Deixe vazio para exportar TUDO desde o início
     - Ou especifique até onde quer exportar (ex: 2024-01-01)

3. **Iniciar:**
   - Clique em "Iniciar Exportação"
   - Aguarde confirmação de sucesso

4. **Monitorar:**
   - Acompanhe o progresso em tempo real
   - Veja quantos leads foram exportados
   - Verifique a data sendo processada

5. **Controlar:**
   - **Pausar**: Se precisar interromper temporariamente
   - **Retomar**: Continue de onde parou

## 📈 Métricas e Logs

### Monitoramento em Tempo Real

**Na Interface:**
- Total de leads processados
- Leads exportados com sucesso
- Quantidade de erros
- Data sendo processada
- Porcentagem de conclusão

**No Banco:**
```sql
-- Ver job ativo
SELECT * FROM gestao_scouter_export_jobs 
WHERE status IN ('running', 'paused')
ORDER BY created_at DESC LIMIT 1;

-- Ver histórico
SELECT 
  status,
  start_date,
  end_date,
  exported_leads,
  error_leads,
  completed_at - started_at as duration
FROM gestao_scouter_export_jobs
ORDER BY created_at DESC;
```

### Logs Detalhados

Todos os leads exportados são registrados em `sync_events`:

```sql
-- Ver exportações recentes
SELECT * FROM sync_events
WHERE direction = 'supabase_to_gestao_scouter'
ORDER BY created_at DESC
LIMIT 100;

-- Taxa de sucesso
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
FROM sync_events
WHERE direction = 'supabase_to_gestao_scouter'
  AND created_at > NOW() - INTERVAL '1 day';
```

## 🔒 Segurança

### RLS Policies

```sql
-- Usuários podem ver seus próprios jobs
CREATE POLICY "Users can view own export jobs"
  ON gestao_scouter_export_jobs FOR SELECT
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Usuários podem criar jobs
CREATE POLICY "Users can create export jobs"
  ON gestao_scouter_export_jobs FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Usuários podem atualizar seus próprios jobs
CREATE POLICY "Users can update own export jobs"
  ON gestao_scouter_export_jobs FOR UPDATE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));
```

### Autenticação

- Edge Function requer JWT válido (`verify_jwt = true`)
- Verificação de usuário autenticado antes de criar job
- Service Role Key para operações internas

## ⚠️ Considerações Importantes

### Performance

- **Batch Size**: 100 leads por vez (ajustável)
- **Delay**: 500ms entre lotes (evita sobrecarga)
- **Duração Estimada**: ~1 segundo por 100 leads
  - 1.000 leads ≈ 10 segundos
  - 10.000 leads ≈ 100 segundos (1,7 minutos)
  - 100.000 leads ≈ 1.000 segundos (16,7 minutos)

### Limites

- Supabase Edge Functions têm timeout de 150 segundos por requisição
- O processamento é feito em background (não bloqueia a requisição inicial)
- Jobs podem ser pausados e retomados sem perda de progresso

### Erros Comuns

**"Configuração do gestao-scouter não encontrada"**
- Solução: Inserir configuração ativa em `gestao_scouter_config`

**"Erro ao buscar leads"**
- Solução: Verificar permissões RLS na tabela leads

**"Erro ao exportar lead"**
- Solução: Verificar se tabela fichas existe no gestao-scouter
- Verificar anon_key na configuração

## 🔄 Diferença: Sincronização Automática vs Exportação em Lote

| Aspecto | Sincronização Automática | Exportação em Lote |
|---------|-------------------------|-------------------|
| **Quando** | Tempo real (cada UPDATE) | Sob demanda (manual) |
| **Direção** | TabuladorMax ↔ gestao-scouter | TabuladorMax → gestao-scouter |
| **Volume** | 1 lead por vez | 100 leads por lote |
| **Uso** | Manter sincronizado | Carga inicial / histórico |
| **Controle** | Automático | Manual (pausar/retomar) |
| **Trigger** | SQL Trigger | Edge Function batch |

**Recomendação:**
- Use **Sincronização Automática** para manter os sistemas em sincronia diária
- Use **Exportação em Lote** para:
  - Primeira carga de dados
  - Reprocessar períodos específicos
  - Recuperar leads não sincronizados

## 📝 Troubleshooting

### Job não inicia

```sql
-- Verificar se há job ativo
SELECT * FROM gestao_scouter_export_jobs 
WHERE status IN ('running', 'paused');

-- Pausar job ativo se necessário
UPDATE gestao_scouter_export_jobs 
SET status = 'paused' 
WHERE id = '[job_id]';
```

### Job travou

```sql
-- Verificar logs do Edge Function
-- Via Supabase Dashboard → Edge Functions → Logs

-- Marcar job como failed para permitir novo
UPDATE gestao_scouter_export_jobs 
SET status = 'failed', 
    pause_reason = 'Job travou - marcado manualmente'
WHERE id = '[job_id]';
```

### Ver leads não exportados

```sql
-- Leads que não têm registro em sync_events
SELECT l.id, l.name, l.updated_at
FROM leads l
LEFT JOIN sync_events se ON se.lead_id = l.id 
  AND se.direction = 'supabase_to_gestao_scouter'
WHERE se.id IS NULL
ORDER BY l.updated_at DESC
LIMIT 100;
```

## 🚀 Próximas Melhorias Possíveis

1. **Filtros Avançados**
   - Exportar apenas leads de projetos específicos
   - Filtrar por status ou etapa

2. **Scheduling**
   - Agendar exportações automáticas
   - Exportação incremental diária

3. **Relatórios**
   - Dashboard de estatísticas de exportação
   - Alertas por email em caso de falha

4. **Otimizações**
   - Aumentar batch size dinamicamente
   - Processamento paralelo de múltiplos dias

---

**Versão**: 1.0  
**Data**: 2025-10-17  
**Commit**: a3b1c89
