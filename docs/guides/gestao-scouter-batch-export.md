# Exportação em Lote para gestao-scouter

## 📋 Visão Geral

Esta funcionalidade permite exportar leads existentes do TabuladorMax para a tabela **leads** do gestao-scouter em lotes, processando das datas mais recentes para as mais antigas, similar ao funcionamento da importação do Bitrix.

**Nota importante**: A partir do PR #73, a integração com Gestão Scouter usa a tabela `leads` em vez de `fichas` para melhor alinhamento com a estrutura de dados.

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
│  │  - Seleção de campos (checkboxes)           │    │
│  │  - Controles de pausar/retomar/resetar      │    │
│  │  - Botão de excluir job pausado              │    │
│  │  - Log de erros detalhado                    │    │
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
│  - reset: Reseta job para reprocessar tudo            │
│  - delete: Exclui job pausado                         │
│                                                        │
│  Processamento:                                        │
│  1. Busca leads por data (mais recente → antiga)      │
│  2. Batch de 100 leads por vez                        │
│  3. Aplica filtro de campos selecionados              │
│  4. Upsert em gestao-scouter.leads                    │
│  5. Registra cada lead em sync_events                 │
│  6. Registra erros em gestao_scouter_export_errors    │
│  7. Atualiza progresso no job                         │
│  8. Delay de 500ms entre lotes                        │
└────────────────────────────────────────────────────────┘
                          │
                          │ Registra em
                          ▼
┌────────────────────────────────────────────────────────┐
│  Tabela: gestao_scouter_export_jobs                    │
│  - id, status, start_date, end_date                    │
│  - processing_date, last_completed_date                │
│  - total_leads, exported_leads, error_leads            │
│  - fields_selected (JSONB - campos selecionados)       │
│  - pause_reason, paused_at                             │
│  - created_at, started_at, completed_at                │
└────────────────────────────────────────────────────────┘
                          │
                          │ Registra erros em
                          ▼
┌────────────────────────────────────────────────────────┐
│  Tabela: gestao_scouter_export_errors                  │
│  - id, job_id, lead_id                                 │
│  - lead_snapshot (snapshot completo do lead)           │
│  - fields_sent (campos que foram enviados)             │
│  - error_message, error_details                        │
│  - response_status, response_body                      │
│  - created_at                                          │
└────────────────────────────────────────────────────────┘
```

## 📊 Fluxo de Exportação

### 1. Criação do Job

```typescript
POST /functions/v1/export-to-gestao-scouter-batch
{
  "action": "create",
  "startDate": "2025-10-17",  // Data mais recente
  "endDate": "2024-01-01",    // Data mais antiga (opcional)
  "fieldsSelected": ["name", "celular", "etapa"] // Campos a exportar (opcional, null = todos)
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
            paused → running (via resume)
              ↓
            reset → pending → running
              ↓
            deleted (só se paused)
```

## 🆕 Novas Funcionalidades (PR Atual)

### 1. Seleção de Campos

**Interface:**
- Checkbox "Selecionar Todos os Campos" (padrão: ativo)
- Lista de campos individuais com checkboxes
- Contador de campos selecionados
- Campos sempre incluídos: `id`, `updated_at`, `sync_source`, `last_sync_at`

**Comportamento:**
- Se "Todos" estiver marcado: exporta todos os campos disponíveis
- Se campos específicos selecionados: exporta apenas os campos marcados (+ campos obrigatórios)
- Seleção é persistida no job (`fields_selected` em JSONB)

**Campos Disponíveis:**
- name, responsible, age, address, scouter
- celular, telefone_trabalho, telefone_casa
- etapa, fonte, nome_modelo, local_abordagem
- ficha_confirmada, presenca_confirmada, compareceu
- valor_ficha, horario_agendamento, data_agendamento
- gerenciamento_funil, status_fluxo, etapa_funil, etapa_fluxo
- funil_fichas, status_tabulacao

### 2. Botão Resetar

**Localização:** Card de exportação em andamento (apenas quando pausado)

**Funcionalidade:**
- Zera todos os contadores (total_leads, exported_leads, error_leads)
- Limpa processing_date e last_completed_date
- Remove todos os erros registrados para o job
- Marca job como 'pending'
- Reinicia o processamento do zero

**Uso:** Quando você quer reprocessar toda a exportação novamente

### 3. Botão Excluir

**Localização:** Card de exportação em andamento (apenas quando pausado)

**Funcionalidade:**
- Exclui o job de exportação pausado
- Remove todos os erros associados (CASCADE)
- Libera para criar um novo job

**Restrição:** Só funciona em jobs com status 'paused'

### 4. Log de Erros Detalhado

**Interface:**
- Card vermelho exibindo erros da exportação em andamento
- Lista de erros clicáveis (até 50 mais recentes)
- Dialog modal com detalhes completos ao clicar

**Informações no Modal:**
- Mensagem de erro
- Lead ID
- Status HTTP (se disponível)
- Data/Hora do erro
- Campos que foram enviados (JSON)
- Snapshot completo do lead (JSON)
- Detalhes técnicos do erro (JSON)
- Resposta do servidor (JSON, se disponível)

**Armazenamento:**
- Tabela: `gestao_scouter_export_errors`
- Relacionado ao job via `job_id`
- Permite análise pós-exportação

### 5. Tabela de Destino: leads (não fichas)

**Mudança (PR #73):**
- Antes: exportava para `gestao-scouter.public.fichas`
- Agora: exporta para `gestao-scouter.public.leads`
- Melhor alinhamento com estrutura de dados
- Evita confusão de nomenclatura

## 🎨 Interface do Usuário

### Localização
`/sync-monitor` → Tab "Importações" → Sub-tab "Gestão Scouter"

### Elementos da Interface

**Card Principal: "Exportação em Lote"**
- 📅 Campo: Data Inicial (mais recente)
- 📅 Campo: Data Final (mais antiga, opcional)
- ☑️ Checkbox: Selecionar Todos os Campos
- 📋 Lista: Campos individuais para seleção
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
- 🔄 Botão: "Resetar" (se paused)
- 🗑️ Botão: "Excluir" (se paused)

**Card de Erros (quando há erros):**
- 🚨 Lista de erros clicáveis
- 📄 Modal com detalhes completos do erro
- 🔍 Snapshot do lead
- 📤 Campos enviados
- ⚠️ Detalhes técnicos
- 📡 Resposta do servidor

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

2. **Tabela leads criada no gestao-scouter:**
A tabela `leads` deve existir no projeto gestao-scouter com a mesma estrutura da tabela `leads` do TabuladorMax.

3. **Edge Function deployada:**
```bash
supabase functions deploy export-to-gestao-scouter-batch
```

4. **Migration aplicada:**
```bash
# Aplicar a migration 20251018_gestao_scouter_batch_enhancements.sql
# Adiciona fields_selected e tabela de erros
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
   - **Campos**: 
     - Marque "Selecionar Todos" para exportar todos os campos
     - Ou desmarque e selecione campos específicos

3. **Iniciar:**
   - Clique em "Iniciar Exportação"
   - Aguarde confirmação de sucesso

4. **Monitorar:**
   - Acompanhe o progresso em tempo real
   - Veja quantos leads foram exportados
   - Verifique a data sendo processada
   - Visualize erros no card vermelho (se houver)

5. **Controlar:**
   - **Pausar**: Se precisar interromper temporariamente
   - **Retomar**: Continue de onde parou
   - **Resetar**: Reprocesse tudo novamente (disponível quando pausado)
   - **Excluir**: Remova o job pausado (disponível quando pausado)

6. **Analisar Erros:**
   - Clique em qualquer erro no card vermelho
   - Veja detalhes completos do erro
   - Analise o snapshot do lead e campos enviados
   - Identifique a causa raiz do problema

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

### Logs de Erros Detalhados

Erros são registrados com informações completas em `gestao_scouter_export_errors`:

```sql
-- Ver erros de um job específico
SELECT 
  e.id,
  e.lead_id,
  e.error_message,
  e.created_at
FROM gestao_scouter_export_errors e
WHERE e.job_id = '[job_id]'
ORDER BY e.created_at DESC;

-- Ver erros mais comuns
SELECT 
  error_message,
  COUNT(*) as occurrences
FROM gestao_scouter_export_errors
WHERE job_id = '[job_id]'
GROUP BY error_message
ORDER BY occurrences DESC;

-- Ver detalhes completos de um erro específico
SELECT 
  lead_snapshot,
  fields_sent,
  error_message,
  error_details,
  response_status,
  response_body
FROM gestao_scouter_export_errors
WHERE id = '[error_id]';
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

### Analisar erros de exportação

```sql
-- Ver todos os erros de um job
SELECT 
  error_message,
  COUNT(*) as total,
  array_agg(lead_id) as affected_leads
FROM gestao_scouter_export_errors
WHERE job_id = '[job_id]'
GROUP BY error_message
ORDER BY total DESC;

-- Ver campos que mais causam erros
SELECT 
  jsonb_object_keys(fields_sent) as field_name,
  COUNT(*) as error_count
FROM gestao_scouter_export_errors
WHERE job_id = '[job_id]'
GROUP BY field_name
ORDER BY error_count DESC;
```

### Resetar job para reprocessar

1. **Via Interface:**
   - Pause o job (se estiver running)
   - Clique em "Resetar"
   - Aguarde reinício automático

2. **Via SQL (se necessário):**
```sql
-- Resetar manualmente
UPDATE gestao_scouter_export_jobs
SET 
  status = 'pending',
  processing_date = NULL,
  last_completed_date = NULL,
  total_leads = 0,
  exported_leads = 0,
  error_leads = 0,
  pause_reason = NULL,
  paused_at = NULL,
  started_at = NULL,
  completed_at = NULL
WHERE id = '[job_id]';

-- Limpar erros
DELETE FROM gestao_scouter_export_errors
WHERE job_id = '[job_id]';
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
