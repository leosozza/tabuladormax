# Arquitetura de Sincronização: Gestão Scouter ↔ TabuladorMax

## Visão Geral

Sistema de sincronização bidirecional entre dois projetos Supabase:
- **Gestão Scouter** (ngestyxtopvfeyenyvgt) - Aplicação principal
- **TabuladorMax** (gkvvtfqfggddzotxltxf) - Fonte de dados original

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│  GESTÃO SCOUTER (ngestyxtopvfeyenyvgt)                      │
│  - Aplicação principal                                       │
│  - Dashboard, analytics, relatórios                          │
│  - Tabela: fichas (207k+ registros)                         │
└─────────────────────────────────────────────────────────────┘
                          ↕ SYNC (5 min)
┌─────────────────────────────────────────────────────────────┐
│  EDGE FUNCTION: sync-tabulador                              │
│  - Polling a cada 5 minutos                                 │
│  - Sincronização bidirecional                               │
│  - Conflict resolution (última modificação vence)           │
│  - Logs de auditoria                                        │
└─────────────────────────────────────────────────────────────┘
                          ↕ SYNC (5 min)
┌─────────────────────────────────────────────────────────────┐
│  TABULADORMAX (gkvvtfqfggddzotxltxf)                        │
│  - Fonte de dados original                                   │
│  - Sistema legado/externo                                    │
│  - Tabela: fichas                                           │
└─────────────────────────────────────────────────────────────┘
```

## Componentes

### 1. Edge Function `sync-tabulador`
- **Localização:** `supabase/functions/sync-tabulador/index.ts`
- **Trigger:** Cron job a cada 5 minutos
- **Autenticação:** Service role keys de ambos projetos

**Fluxo:**
1. Buscar última sincronização (tabela `sync_status`)
2. Buscar registros modificados desde última sync em ambos projetos
3. Detectar conflitos (mesmo ID modificado em ambos)
4. Sincronizar Gestão → TabuladorMax (exceto conflitos)
5. Sincronizar TabuladorMax → Gestão (exceto conflitos)
6. Resolver conflitos (última modificação vence - `updated_at`)
7. Atualizar `sync_status`
8. Registrar log em `sync_logs`

### 2. Tabelas de Controle

#### `sync_logs`
Registra cada execução de sincronização:
- `id` (uuid, PK)
- `sync_direction` ('gestao_to_tabulador' | 'tabulador_to_gestao' | 'bidirectional')
- `records_synced` (integer)
- `records_failed` (integer)
- `errors` (jsonb)
- `started_at` (timestamptz)
- `completed_at` (timestamptz)
- `processing_time_ms` (integer)

#### `sync_status`
Estado atual da sincronização:
- `id` (uuid, PK)
- `project_name` ('gestao_scouter' | 'tabulador_max')
- `last_sync_at` (timestamptz)
- `last_sync_success` (boolean)
- `total_records` (integer)
- `last_error` (text)
- `updated_at` (timestamptz)

### 3. Componente de Importação Massiva

**Componente:** `BulkImportPanel.tsx`
**Localização:** `src/components/dashboard/BulkImportPanel.tsx`

**Funcionalidades:**
- Upload de CSV/XLSX até 300MB
- Processamento em chunks de 2000 registros
- Progress bar detalhada
- Mapeamento automático de aliases de campos
- Validação básica (nome obrigatório)
- Inserção direta no Supabase via `upsert`

**Campos Reconhecidos (aliases):**
- ID, id, Id
- Projetos_Comerciais, Projetos Comerciais, Projeto, projeto
- Gestao_de_Scouter, Gestão de Scouter, Scouter, scouter
- Data_de_Criacao_da_Ficha, Data de Criação da Ficha, Criado, criado, Data
- Nome, nome
- Telefone, telefone
- Email, email
- Idade, idade
- Valor_por_Fichas, Valor por Fichas, R$/Ficha, Valor, valor_ficha
- LAT, lat, latitude
- LNG, lng, longitude

## Configuração

### 1. Variáveis de Ambiente (Secrets)

**Gestão Scouter** precisa ter:
```env
TABULADOR_URL=https://gkvvtfqfggddzotxltxf.supabase.co
TABULADOR_SERVICE_KEY=<service_role_key_tabulador>
```

**TabuladorMax** precisa ter (opcional, se sincronização bidirecional):
```env
GESTAO_URL=https://ngestyxtopvfeyenyvgt.supabase.co
GESTAO_SERVICE_KEY=<service_role_key_gestao>
```

### 2. Cron Job

Configurado em `supabase/config.toml`:
```toml
[functions.sync-tabulador]
verify_jwt = false
```

**Nota:** O cron job é configurado via Supabase Dashboard → Edge Functions → Cron Jobs:
- Função: `sync-tabulador`
- Frequência: `*/5 * * * *` (a cada 5 minutos)

## Uso

### Importação Inicial (CSV)

1. Acessar Dashboard → Importação Massiva
2. Selecionar arquivo CSV/XLSX (até 300MB)
3. Clicar em "Iniciar Importação"
4. Aguardar processamento (progresso exibido em tempo real)

**Tempo estimado:** 
- 50k registros: ~2 minutos
- 200k registros: ~8 minutos

### Sincronização Contínua

Após importação inicial, a sincronização ocorre automaticamente a cada 5 minutos.

**Monitorar:**
```sql
-- Ver últimas sincronizações
SELECT * FROM sync_logs 
ORDER BY started_at DESC 
LIMIT 10;

-- Ver status atual
SELECT * FROM sync_status;

-- Ver registros modificados recentemente
SELECT id, nome, projeto, scouter, updated_at 
FROM fichas 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

## Resolução de Conflitos

**Regra:** Última modificação vence (`updated_at` mais recente)

**Exemplo:**
- Ficha ID=123 modificada em Gestão às 10:00
- Mesma ficha ID=123 modificada em TabuladorMax às 10:05
- **Resultado:** Versão do TabuladorMax (10:05) sobrescreve Gestão

## Troubleshooting

### Sincronização não está acontecendo

1. Verificar logs da Edge Function:
   - Supabase Dashboard → Edge Functions → sync-tabulador → Logs

2. Verificar secrets configurados:
   ```sql
   -- No Gestão Scouter
   SELECT * FROM sync_status WHERE project_name = 'tabulador_max';
   ```

3. Verificar erros recentes:
   ```sql
   SELECT * FROM sync_logs 
   WHERE records_failed > 0 
   ORDER BY started_at DESC 
   LIMIT 5;
   ```

### Dados não aparecem após importação

1. Verificar se importação foi bem-sucedida:
   ```sql
   SELECT COUNT(*) FROM fichas WHERE deleted = false;
   ```

2. Verificar campo `criado` (deve estar em formato ISO):
   ```sql
   SELECT criado FROM fichas LIMIT 10;
   ```

3. Limpar cache do browser (Ctrl+Shift+R)

### Performance lenta

1. Verificar quantidade de registros:
   ```sql
   SELECT COUNT(*) FROM fichas;
   ```

2. Criar índices adicionais (se necessário):
   ```sql
   CREATE INDEX IF NOT EXISTS idx_fichas_projeto ON fichas(projeto);
   CREATE INDEX IF NOT EXISTS idx_fichas_scouter ON fichas(scouter);
   CREATE INDEX IF NOT EXISTS idx_fichas_criado ON fichas(criado);
   ```

3. Otimizar queries no dashboard (adicionar filtros de data)

## Segurança

### RLS Policies

Todas as tabelas têm Row Level Security ativado:
- `fichas`: Acesso baseado em roles (admin, supervisor, scouter, telemarketing)
- `sync_logs`: Apenas admins podem visualizar
- `sync_status`: Apenas admins podem visualizar

### Service Role Keys

**IMPORTANTE:** Nunca expor service role keys no frontend!
- Usar apenas em Edge Functions
- Armazenar em Supabase Secrets (Dashboard → Settings → Edge Functions → Secrets)

## Backup e Recuperação

### Backup Manual

```sql
-- Exportar fichas para CSV
COPY (SELECT * FROM fichas WHERE deleted = false) 
TO '/tmp/fichas_backup.csv' 
WITH CSV HEADER;
```

### Restaurar de Backup

Usar componente `BulkImportPanel` para reimportar CSV.

## Próximas Melhorias

1. **Realtime Sync:** Usar Supabase Realtime em vez de polling
2. **Conflict UI:** Interface para resolver conflitos manualmente
3. **Audit Trail:** Histórico completo de modificações (quem, quando, o quê)
4. **Alertas:** Notificações quando sync falha
5. **Dashboard de Sync:** Visualização gráfica do status de sincronização
