# Guia de Sincronização TabuladorMax ↔ gestao-scouter

## Visão Geral

Este documento descreve a implementação da sincronização bidirecional automática entre o TabuladorMax e o projeto gestao-scouter via Supabase REST API.

## Arquitetura

```
┌─────────────────┐         ┌──────────────────┐
│  TabuladorMax   │◄────────┤  gestao-scouter  │
│   (leads)       │────────►│    (fichas)      │
└─────────────────┘         └──────────────────┘
        │                            │
        │    Edge Functions          │
        │    + Triggers SQL          │
        │                            │
        ▼                            ▼
   sync_events              (logs opcionais)
```

### Componentes

1. **Tabelas**
   - `leads` (TabuladorMax): Tabela principal de leads
   - `fichas` (gestao-scouter): Espelho da tabela leads
   - `gestao_scouter_config` (TabuladorMax): Configuração de sincronização
   - `sync_events` (TabuladorMax): Logs de sincronização

2. **Edge Functions**
   - `sync-to-gestao-scouter`: Sincroniza TabuladorMax → gestao-scouter
   - `sync-from-gestao-scouter`: Sincroniza gestao-scouter → TabuladorMax

3. **Triggers SQL**
   - `trigger_sync_to_gestao_scouter`: Dispara ao atualizar leads
   - `trigger_sync_to_tabuladormax`: Dispara ao atualizar fichas

4. **UI Components**
   - `GestaoScouterMetrics`: Exibe métricas de sincronização
   - `SyncLogsTable`: Logs com direções incluindo gestao-scouter
   - `SyncDirectionChart`: Gráfico com todas as direções

## Instalação e Configuração

### 1. Configurar TabuladorMax

As migrações SQL já foram criadas e devem ser aplicadas automaticamente:

```bash
# As migrações estão em:
# supabase/migrations/20251017011522_add_gestao_scouter_sync.sql
# supabase/migrations/20251017012000_add_gestao_scouter_trigger.sql
```

### 2. Criar Tabela fichas no gestao-scouter

Execute o script SQL no projeto gestao-scouter:

```bash
# Copie o conteúdo do arquivo:
docs/gestao-scouter-fichas-table.sql

# Execute via Supabase Dashboard → SQL Editor
# ou via CLI:
supabase db push
```

### 3. Configurar Credenciais

No TabuladorMax, insira a configuração do gestao-scouter:

```sql
-- Executar no TabuladorMax
INSERT INTO public.gestao_scouter_config (
  project_url,
  anon_key,
  active,
  sync_enabled
) VALUES (
  'https://[YOUR_GESTAO_SCOUTER_PROJECT].supabase.co',
  '[YOUR_GESTAO_SCOUTER_ANON_KEY]',
  true,
  true
);
```

### 4. Habilitar Extensões Necessárias

```sql
-- Executar em AMBOS os projetos
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 5. Deploy das Edge Functions

```bash
# No diretório do TabuladorMax
supabase functions deploy sync-to-gestao-scouter
supabase functions deploy sync-from-gestao-scouter
```

## Funcionamento

### Fluxo TabuladorMax → gestao-scouter

1. Lead é atualizado na tabela `leads` do TabuladorMax
2. Trigger `sync_lead_to_gestao_scouter_on_update` é disparado
3. Função `trigger_sync_to_gestao_scouter` verifica:
   - Se `sync_source` não é `gestao_scouter` (evita loop)
   - Se configuração está ativa
4. Chama Edge Function `sync-to-gestao-scouter`
5. Edge Function:
   - Busca configuração do gestao-scouter
   - Cria cliente Supabase para gestao-scouter
   - Faz UPSERT na tabela `fichas`
   - Marca `sync_source = 'tabuladormax'`
   - Registra evento em `sync_events`

### Fluxo gestao-scouter → TabuladorMax

1. Ficha é atualizada na tabela `fichas` do gestao-scouter
2. Trigger `sync_ficha_to_tabuladormax_on_update` é disparado
3. Função `trigger_sync_to_tabuladormax` verifica:
   - Se `sync_source` não é `tabuladormax` (evita loop)
4. Chama Edge Function `sync-from-gestao-scouter` do TabuladorMax
5. Edge Function:
   - Valida dados recebidos
   - Faz UPSERT na tabela `leads`
   - Marca `sync_source = 'gestao_scouter'`
   - Registra evento em `sync_events`

### Prevenção de Loops

O sistema usa o campo `sync_source` para evitar loops infinitos:

```typescript
// Exemplo no trigger
IF NEW.sync_source = 'gestao_scouter' THEN
  RAISE NOTICE 'Ignorando trigger - origem é gestao_scouter';
  NEW.sync_source := NULL;
  RETURN NEW;
END IF;
```

## Monitoramento

### 1. Página /sync-monitor

Acesse `http://[seu-dominio]/sync-monitor` para visualizar:

- **Métricas em Tempo Real - Bitrix**: Sincronização com Bitrix (existente)
- **Sincronização com Gestão Scouter**: 
  - Sucessos e falhas (24h)
  - Contador de sincronizações → Gestão Scouter
  - Contador de sincronizações ← Gestão Scouter
  - Status (Ativo/Inativo)
- **Gráfico de Direções**: Inclui todas as 5 direções
- **Logs Detalhados**: Últimas 100 sincronizações com filtro

### 2. Consultas SQL Úteis

```sql
-- Ver últimas sincronizações com gestao-scouter
SELECT * FROM sync_events
WHERE direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase')
ORDER BY created_at DESC
LIMIT 50;

-- Ver taxa de sucesso (últimas 24h)
SELECT 
  direction,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
  ROUND(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as success_rate
FROM sync_events
WHERE direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY direction;

-- Ver leads com erro de sincronização
SELECT l.id, l.name, se.error_message, se.created_at
FROM sync_events se
JOIN leads l ON l.id = se.lead_id
WHERE se.status = 'error'
  AND se.direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase')
ORDER BY se.created_at DESC
LIMIT 20;

-- Verificar configuração
SELECT * FROM gestao_scouter_config WHERE active = true;
```

## Resolução de Problemas

### Sincronização não está funcionando

1. **Verificar configuração**:
```sql
SELECT * FROM gestao_scouter_config WHERE active = true AND sync_enabled = true;
```

2. **Verificar Edge Functions**:
```bash
supabase functions list
# Devem aparecer: sync-to-gestao-scouter, sync-from-gestao-scouter
```

3. **Verificar logs**:
```bash
supabase functions logs sync-to-gestao-scouter
supabase functions logs sync-from-gestao-scouter
```

4. **Verificar extensão pg_net**:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

### Erros comuns

#### "Sync disabled"
- Verificar `gestao_scouter_config.active` e `sync_enabled`
- Inserir configuração se não existir

#### "Loop detection"
- Normal - significa que a prevenção de loops está funcionando
- Não requer ação

#### "Authentication failed"
- Verificar `anon_key` na configuração
- Verificar RLS policies na tabela `fichas`

#### "Table fichas does not exist"
- Executar script `gestao-scouter-fichas-table.sql` no projeto gestao-scouter

## Manutenção

### Desabilitar Sincronização Temporariamente

```sql
-- Desabilitar sem remover configuração
UPDATE gestao_scouter_config 
SET sync_enabled = false 
WHERE active = true;
```

### Reabilitar Sincronização

```sql
UPDATE gestao_scouter_config 
SET sync_enabled = true 
WHERE active = true;
```

### Limpar Logs Antigos

```sql
-- Deletar logs com mais de 30 dias
DELETE FROM sync_events
WHERE created_at < NOW() - INTERVAL '30 days'
  AND direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase');
```

## Campos Sincronizados

A sincronização mantém **todos os campos** entre `leads` e `fichas`:

- Campos básicos: id, name, responsible, age, address, scouter, photo_url
- Contatos: celular, telefone_trabalho, telefone_casa
- Datas: date_modify, criado, data_agendamento, etc.
- Status: etapa, fonte, status_fluxo, etapa_funil
- Flags: ficha_confirmada, presenca_confirmada, compareceu
- Relacionamentos: bitrix_telemarketing_id, commercial_project_id
- Controle: sync_source, sync_status, last_sync_at

## Segurança

- ✅ RLS habilitado em ambas as tabelas
- ✅ Edge Functions com autenticação
- ✅ Prevenção de loops de sincronização
- ✅ Logs completos de auditoria
- ✅ Validação de origem dos dados

## Performance

- **Sincronização**: Assíncrona via triggers
- **Impacto**: Mínimo - triggers executam em background
- **Latência**: < 1 segundo em condições normais
- **Escalabilidade**: Suporta milhares de sincronizações/dia

## Suporte

Para problemas ou dúvidas:
1. Verificar logs em `/sync-monitor`
2. Consultar tabela `sync_events`
3. Verificar logs das Edge Functions
4. Abrir issue no repositório
