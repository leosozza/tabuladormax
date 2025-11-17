# 🔄 Guia de Resincronização de Leads - Sistema Híbrido

## 📋 Visão Geral

Sistema completo para atualizar leads com campos NULL através de duas abordagens:
1. **Importação CSV** (rápida, para carga inicial)
2. **Resincronização Automática via API** (contínua, para manutenção)

---

## 🎯 FASE 1: Importação CSV (Carga Inicial)

### Passo 1: Exportar do Bitrix
1. Acesse Bitrix24 → CRM → Leads
2. Selecione **todos os 253k leads**
3. Exporte CSV com **todos os campos**
4. Garanta que inclua:
   - `ID`, `NAME`, `ADDRESS`, `PHONE`
   - `UF_CRM_*` (campos customizados)
   - `ASSIGNED_BY_NAME`, `STATUS_ID`
   - Especialmente: `UF_CRM_1762868715` (telefone_casa), `UF_CRM_VALORFICHA` (valor)

### Passo 2: Importar no TabuladorMax
1. Acesse interface de importação CSV existente
2. Upload do arquivo exportado
3. **IMPORTANTE**: ❌ Desmarque "Sincronizar com Bitrix"
4. Aguarde processamento (1-2 horas para 253k leads)

### Passo 3: Validar Importação
Execute no Supabase SQL Editor:
```sql
SELECT 
  COUNT(*) as total_leads,
  COUNT(address) as com_address,
  COUNT(telefone_casa) as com_telefone_casa,
  COUNT(valor_ficha) as com_valor_ficha,
  (COUNT(address)::float / COUNT(*) * 100) as percentual_address
FROM leads;
```

**Resultado esperado:**
- Total: 253.827 leads
- Campos preenchidos: 90-95%+

---

## 🔄 FASE 2: Resincronização Automática via API

### Acesso
1. Menu Admin → **Resincronização Leads**
2. Ou navegue para: `/admin/lead-resync`

### Configurar Nova Resincronização

#### 1. Selecionar Filtros
- ✅ **Leads com endereço NULL** (~253.800 leads)
- ✅ **Leads com telefones NULL** (~190.000 leads)
- ✅ **Leads com valor_ficha NULL** (~232.000 leads)
- ⬜ **Leads com responsável NULL** (~3.000 leads)

#### 2. Configurar Batch Size
- **Recomendado**: 50-100 leads por lote
- **Performance**: 100-200 para maior velocidade
- **Estabilidade**: 50 para máxima confiabilidade

#### 3. Iniciar Resincronização
- Clique em **"Iniciar Resincronização"**
- Sistema processará automaticamente
- Monitoramento em tempo real

---

## 📊 Monitoramento em Tempo Real

### Dashboard Ativo
Durante a resincronização, você verá:
- **Progress Bar**: % de leads processados
- **Processados**: Total de leads analisados
- **Atualizados**: Leads com campos atualizados (verde)
- **Ignorados**: Leads que já estavam completos (azul)
- **Erros**: Leads com falha no processamento (vermelho)
- **Batch Atual**: Número do lote em processamento

### Controles
- **⏸ Pausar**: Interrompe processamento (retomável)
- **▶️ Retomar**: Continue de onde parou
- **❌ Cancelar**: Finaliza job (não retomável)

### Log de Erros
- Últimos 5 erros exibidos em tempo real
- Lead ID e mensagem de erro detalhada

---

## ⚙️ Como Funciona (Técnico)

### Fluxo de Processamento
```
1. Job criado com filtros → status: 'pending'
2. Edge Function ativada → status: 'running'
3. Para cada lote de leads:
   a. Buscar IDs no Supabase (filtrados)
   b. Buscar dados completos no Bitrix API
   c. Aplicar mapeamentos de campos
   d. Atualizar lead no Supabase
   e. Log em sync_events
4. Job completado → status: 'completed'
```

### Mapeamentos de Campos
Os seguintes campos do Bitrix são mapeados automaticamente:

| Campo Bitrix | Campo TabuladorMax | Transformação |
|--------------|-------------------|---------------|
| `ADDRESS` | `address` | Direto |
| `ADDRESS_CITY` | `local_abordagem` | Direto |
| `UF_CRM_1762868715` | `telefone_casa` | Direto |
| `UF_CRM_VALORFICHA` | `valor_ficha` | "R$ 6,00" → 6.00 |
| `UF_CRM_1729776113` | `ficha_confirmada` | "Confirmada" → true |
| `UF_CRM_1729776132` | `presenca_confirmada` | Boolean |
| `UF_CRM_1742391351` | `gerenciamento_funil` | Direto |
| `UF_CRM_1742391480` | `etapa_funil` | Direto |
| `UF_CRM_1742410301` | `status_tabulacao` | Direto |

---

## 📈 Estimativas de Performance

### CSV Import (Fase 1)
- **Tempo**: 1-2 horas
- **Volume**: 253.827 leads
- **Taxa**: ~2.000-4.000 leads/min
- **Cobertura**: 90-95% dos campos

### API Resync (Fase 2)
Com batch_size = 50:
- **Tempo**: ~84 horas (3,5 dias)
- **Taxa**: ~50 leads/min

Com batch_size = 100:
- **Tempo**: ~42 horas (1,75 dias)
- **Taxa**: ~100 leads/min

Com batch_size = 200:
- **Tempo**: ~21 horas (< 1 dia)
- **Taxa**: ~200 leads/min

---

## 🎯 Estratégia Recomendada

### 1. Carga Inicial (CSV)
```
Dia 1:
- Exportar CSV do Bitrix
- Importar 253k leads
- Validar cobertura
```

### 2. Resincronização de Gaps (API)
```
Dia 2:
- Resincronizar leads com address NULL (5-10%)
- Batch size: 100
- Tempo estimado: 4-8 horas
```

### 3. Manutenção Contínua
```
Semanal:
- Criar job com todos os filtros
- Batch size: 50
- Processar novos leads NULL
```

---

## 🔍 Troubleshooting

### Job Travado
Se job ficar em "running" por muito tempo:
1. Verificar logs da Edge Function
2. Pausar e retomar job
3. Reduzir batch_size para 50

### Taxa Alta de Erros (>5%)
Possíveis causas:
- Bitrix API instável → Pausar e retomar
- Leads deletados no Bitrix → Normal, ignorar
- Rate limit → Reduzir batch_size

### Campos Não Atualizados
1. Verificar se campo existe no Bitrix
2. Verificar mapeamento em `bitrix_field_mappings`
3. Consultar `sync_events` para logs

---

## 📊 Consultas Úteis

### Verificar Cobertura de Campos
```sql
SELECT 
  COUNT(*) as total,
  COUNT(address) as com_address,
  COUNT(telefone_casa) as com_telefone_casa,
  COUNT(valor_ficha) as com_valor_ficha,
  COUNT(responsible) as com_responsible,
  (COUNT(address)::float / COUNT(*) * 100)::numeric(5,2) as perc_address,
  (COUNT(telefone_casa)::float / COUNT(*) * 100)::numeric(5,2) as perc_telefone,
  (COUNT(valor_ficha)::float / COUNT(*) * 100)::numeric(5,2) as perc_valor
FROM leads;
```

### Leads Processados Hoje
```sql
SELECT 
  COUNT(*) as total_resincronizados,
  COUNT(DISTINCT sync_source) as fontes
FROM leads 
WHERE sync_source = 'bitrix_resync' 
  AND last_sync_at > NOW() - INTERVAL '1 day';
```

### Histórico de Jobs
```sql
SELECT 
  status,
  COUNT(*) as total_jobs,
  SUM(updated_leads) as total_atualizados,
  SUM(error_leads) as total_erros
FROM lead_resync_jobs
GROUP BY status
ORDER BY status;
```

---

## 🚨 Avisos Importantes

1. **Não execute múltiplos jobs simultâneos** - pode sobrecarregar API do Bitrix
2. **CSV import desativa sincronização automática** - checkbox "Sincronizar com Bitrix" deve estar desmarcado
3. **Jobs pausados permanecem até serem retomados ou cancelados**
4. **Erros em leads individuais não param o job inteiro**
5. **Campos já preenchidos não são sobrescritos** - sistema pula leads completos

---

## ✅ Checklist de Implementação

- [x] Tabela `lead_resync_jobs` criada
- [x] Edge Function `bitrix-resync-leads` implementada
- [x] Mapeamentos Bitrix atualizados
- [x] Interface administrativa criada
- [x] Hook `useLeadResyncJobs` implementado
- [x] Rota `/admin/lead-resync` configurada
- [x] Monitoramento em tempo real
- [x] Controle de pausar/retomar
- [x] Log de erros detalhado
- [x] Histórico de jobs

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique logs da Edge Function em `/admin/logs`
2. Consulte `sync_events` para histórico de sincronizações
3. Verifique `lead_resync_jobs` para status dos jobs
