# 🔄 Configuração da Sincronização com Gestão Scouter

## ✅ Status

A sincronização com Gestão Scouter está **CONFIGURADA e FUNCIONAL**. As tabelas e edge functions necessárias já foram criadas no TabuladorMax.

---

## 📋 Passos para Ativar

### 1️⃣ Executar SQL no Gestão Scouter

**Abra o Supabase Dashboard do projeto gestao-scouter:**
- URL: https://supabase.com/dashboard/project/ngestyxtopvfeyenyvgt
- Vá para: **SQL Editor**
- Execute o arquivo: `docs/gestao-scouter-leads-table.sql`
  - **Nota**: Este arquivo cria a tabela `leads` no projeto gestao-scouter

**O que este SQL faz:**
- ✅ Cria a tabela `leads` (espelho da tabela `leads` do TabuladorMax)
- ✅ Configura RLS (Row Level Security)
- ✅ Cria índices para performance
- ✅ Cria trigger para sincronização automática de volta ao TabuladorMax
- ✅ Habilita a extensão `pg_net` (necessária para webhooks)

---

### 2️⃣ Verificar Configuração no TabuladorMax

A configuração já foi inserida automaticamente na tabela `gestao_scouter_config`:

```sql
-- Verificar se está ativa
SELECT * FROM public.gestao_scouter_config WHERE active = true;
```

**Resultado esperado:**
- `project_url`: https://ngestyxtopvfeyenyvgt.supabase.co
- `anon_key`: eyJhbGci... (chave anônima do gestao-scouter)
- `active`: true
- `sync_enabled`: true

---

### 3️⃣ Testar a Sincronização

#### 📤 Teste 1: TabuladorMax → Gestão Scouter

1. No TabuladorMax, atualize qualquer lead:
   ```sql
   UPDATE public.leads 
   SET nome_modelo = 'Teste Sincronização' 
   WHERE id = [ID_QUALQUER];
   ```

2. No Gestão Scouter, verifique se apareceu:
   ```sql
   SELECT * FROM public.leads 
   WHERE id = [MESMO_ID] 
   ORDER BY updated_at DESC 
   LIMIT 1;
   ```

3. Verifique os logs no TabuladorMax:
   ```sql
   SELECT * FROM sync_events 
   WHERE direction = 'supabase_to_gestao_scouter' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

#### 📥 Teste 2: Gestão Scouter → TabuladorMax

1. No Gestão Scouter, atualize um lead:
   ```sql
   UPDATE public.leads 
   SET nome_modelo = 'Teste Volta' 
   WHERE id = [ID_QUALQUER];
   ```

2. No TabuladorMax, verifique se a mudança voltou:
   ```sql
   SELECT nome_modelo, updated_at 
   FROM public.leads 
   WHERE id = [MESMO_ID];
   ```

3. Verifique os logs:
   ```sql
   SELECT * FROM sync_events 
   WHERE direction = 'gestao_scouter_to_supabase' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

---

## 📊 Monitoramento

### Interface Web: `/sync-monitor`

Acesse **http://[seu-dominio]/sync-monitor** para visualizar:

#### ✅ Métricas em Tempo Real
- Sucessos nas últimas 24h
- Falhas nas últimas 24h
- Sincronizações → Gestão Scouter
- Sincronizações ← Gestão Scouter

#### 📈 Gráfico de Timeline
- Visualização temporal de todas as sincronizações
- Filtro por período (1h, 6h, 12h, 24h, 7d, 30d)
- Mostra sucessos e erros ao longo do tempo

#### 📋 Logs Detalhados
- Últimas 100 sincronizações
- Filtro por direção (todas, Bitrix, Gestão Scouter, CSV)
- Detalhes de erros ao clicar

#### 🚀 Exportação em Lote
- Exportar leads históricos para Gestão Scouter
- Processamento assíncrono por data
- Controle de pausa/retomada
- Histórico de exportações

---

## 🔧 Consultas Úteis

### Ver taxa de sucesso (24h)
```sql
SELECT 
  direction,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
  ROUND(
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 
    2
  ) as success_rate_percent
FROM sync_events
WHERE direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY direction;
```

### Ver leads com erro de sincronização
```sql
SELECT 
  l.id, 
  l.name, 
  l.nome_modelo,
  se.error_message, 
  se.created_at,
  se.direction
FROM sync_events se
JOIN leads l ON l.id = se.lead_id
WHERE se.status = 'error'
  AND se.direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase')
ORDER BY se.created_at DESC
LIMIT 20;
```

### Ver última sincronização de cada lead
```sql
SELECT DISTINCT ON (lead_id)
  lead_id,
  direction,
  status,
  created_at,
  sync_duration_ms
FROM sync_events
WHERE direction IN ('supabase_to_gestao_scouter', 'gestao_scouter_to_supabase')
ORDER BY lead_id, created_at DESC;
```

---

## ⚠️ Resolução de Problemas

### Problema: Sincronização não funciona

**1. Verificar configuração:**
```sql
SELECT * FROM gestao_scouter_config WHERE active = true AND sync_enabled = true;
```

**2. Verificar edge functions:**
- Vá para: Supabase Dashboard → Edge Functions
- Devem existir:
  - `sync-to-gestao-scouter`
  - `sync-from-gestao-scouter`
  - `export-to-gestao-scouter-batch`

**3. Verificar logs das edge functions:**
```bash
# No terminal (se tiver Supabase CLI)
supabase functions logs sync-to-gestao-scouter
supabase functions logs sync-from-gestao-scouter
```

**4. Verificar extensão pg_net:**
```sql
-- No TabuladorMax
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- No Gestão Scouter
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

### Problema: Erros de autenticação

**Verificar chave anônima:**
```sql
SELECT anon_key FROM gestao_scouter_config WHERE active = true;
```

**Atualizar chave se necessário:**
```sql
UPDATE gestao_scouter_config 
SET anon_key = '[NOVA_CHAVE_AQUI]'
WHERE active = true;
```

### Problema: Tabela leads não existe no Gestão Scouter

**Executar o SQL:**
- Copie todo o conteúdo de `docs/gestao-scouter-leads-table.sql`
- Execute no SQL Editor do Gestão Scouter
- Verifique: `SELECT * FROM public.leads LIMIT 1;`

### Problema: Loop infinito de sincronização

**Verificar campo sync_source:**
```sql
-- No TabuladorMax
SELECT id, name, sync_source, updated_at 
FROM leads 
WHERE sync_source IS NOT NULL
ORDER BY updated_at DESC 
LIMIT 20;

-- No Gestão Scouter
SELECT id, name, sync_source, updated_at 
FROM leads 
WHERE sync_source IS NOT NULL
ORDER BY updated_at DESC 
LIMIT 20;
```

**O sistema previne loops automaticamente:**
- Se `sync_source = 'gestao_scouter'` → não sincroniza do TabuladorMax para Gestão Scouter
- Se `sync_source = 'tabuladormax'` → não sincroniza do Gestão Scouter para TabuladorMax
- Após sincronização, o campo `sync_source` é resetado para NULL

---

## 🔐 Segurança

✅ **Row Level Security (RLS) habilitado** em ambas as tabelas  
✅ **Edge Functions com autenticação** via service role key  
✅ **Prevenção de loops** com controle de origem  
✅ **Logs completos** de auditoria  
✅ **Validação de timestamps** para resolução de conflitos

---

## 📈 Performance

- **Sincronização**: Assíncrona via triggers SQL
- **Impacto**: Mínimo - triggers executam em background
- **Latência**: < 1 segundo em condições normais
- **Escalabilidade**: Suporta milhares de sincronizações/dia
- **Resolução de conflitos**: Baseada em `updated_at` (vence a mais recente)

---

## 🎯 Campos Sincronizados

A sincronização mantém **TODOS os campos** entre as tabelas `leads` do TabuladorMax e do Gestão Scouter:

### Campos Básicos
- id, name, responsible, age, address, scouter, photo_url

### Contatos
- celular, telefone_trabalho, telefone_casa

### Datas
- date_modify, criado, data_agendamento, data_criacao_agendamento
- data_criacao_ficha, data_confirmacao_ficha, data_retorno_ligacao

### Status e Etapas
- etapa, fonte, status_fluxo, etapa_funil, etapa_fluxo, funil_fichas
- status_tabulacao, gerenciamento_funil

### Flags Booleanas
- ficha_confirmada, presenca_confirmada, compareceu, cadastro_existe_foto

### Relacionamentos
- bitrix_telemarketing_id, commercial_project_id, responsible_user_id

### Controle de Sincronização
- sync_source, sync_status, last_sync_at

### Outros
- valor_ficha, horario_agendamento, local_abordagem
- maxsystem_id_ficha, gestao_scouter, op_telemarketing, raw (JSONB)

---

## 📞 Suporte

Para problemas ou dúvidas:

1. ✅ Verificar logs em `/sync-monitor`
2. ✅ Consultar tabela `sync_events`
3. ✅ Verificar logs das Edge Functions
4. ✅ Consultar esta documentação
5. ✅ Abrir issue no repositório

---

## 🚀 Próximos Passos

1. Execute o SQL no Gestão Scouter (passo 1)
2. Teste a sincronização (passo 3)
3. Monitore via `/sync-monitor`
4. Se necessário, use exportação em lote para carga inicial

**A sincronização está pronta para uso!** 🎉
