# Arquitetura de Sincronização TabuladorMax ↔ Gestão Scouter

## Fluxo Principal: TabuladorMax → Gestão Scouter (PUSH)

### 1. Exportação em Lote

- **Edge Function:** `export-to-gestao-scouter-batch`
- **Trigger:** Manual via UI (Sync Monitor > Gestão Scouter)
- **Interface:** `GestaoScouterExportTab.tsx`
- **Destino:** `https://[gestao-scouter].supabase.co/rest/v1/leads`
- **Autenticação:** Service Role Key do Gestão Scouter

**Recursos:**
- ✅ Processamento em lote (50 leads por vez)
- ✅ Validação de schema automática
- ✅ Mapeamento de campos customizável
- ✅ Retry automático em caso de erro
- ✅ Logs detalhados de erros
- ✅ Pausar/Retomar/Resetar jobs

### 2. Validação e Configuração

**Schema Validation:**
- `validate-gestao-scouter-schema` - Compara schemas dos dois projetos
- `reload-gestao-scouter-schema-cache` - Atualiza cache do PostgREST

**Connection Testing:**
- `validate-gestao-scouter-config` - Testa credenciais, conexão, acesso

### 3. (Opcional) Sincronização Reversa

**Webhook:** `sync-from-gestao-scouter`
- Recebe atualizações do Gestão Scouter
- Trigger no banco do Gestão Scouter chama este endpoint
- Prevenção de loop via campo `sync_source`

**⚠️ Nota:** Sincronização reversa é OPCIONAL e deve ser configurada manualmente no Gestão Scouter

---

## Edge Functions Ativas (5 funções)

1. ✅ `export-to-gestao-scouter-batch` - Exportação em lote
2. ✅ `validate-gestao-scouter-schema` - Validação de schema
3. ✅ `reload-gestao-scouter-schema-cache` - Recarregar cache
4. ✅ `validate-gestao-scouter-config` - Testar conexão
5. ✅ `sync-from-gestao-scouter` - Webhook reverso (opcional)

---

## Setup no Gestão Scouter

### Obrigatório:
1. Tabela `public.leads` com schema completo (49 campos)
2. RLS Policies permitindo acesso ao service_role

```sql
-- RLS Policy para TabuladorMax acessar
CREATE POLICY "service_role_full_access_leads" 
ON public.leads
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);
```

### Opcional (para sync reversa):
1. Trigger que chama `sync-from-gestao-scouter` em mudanças
2. Credenciais do TabuladorMax (URL e Service Key) configuradas como secrets

```sql
-- Trigger para sincronização reversa (OPCIONAL)
CREATE OR REPLACE FUNCTION notify_tabuladormax()
RETURNS TRIGGER AS $$
DECLARE
  tabuladormax_url TEXT := 'https://jstsrgyxrrlklnzgsihd.supabase.co/functions/v1/sync-from-gestao-scouter';
  tabuladormax_key TEXT := '[SUA_SERVICE_KEY_DO_TABULADORMAX]';
BEGIN
  -- Evitar loop infinito
  IF NEW.sync_source = 'tabuladormax' OR NEW.sync_source = 'supabase' THEN
    RETURN NEW;
  END IF;

  -- Chamar webhook do TabuladorMax
  PERFORM net.http_post(
    url := tabuladormax_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || tabuladormax_key
    ),
    body := jsonb_build_object(
      'lead', row_to_json(NEW),
      'source', 'gestao_scouter'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_to_tabuladormax
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION notify_tabuladormax();
```

---

## Decisões de Design

### Por que PUSH e não PULL?
- ✅ TabuladorMax é a fonte da verdade
- ✅ Gestão Scouter é um projeto de visualização/análise
- ✅ Mais simples, menos pontos de falha
- ✅ Controle total do processo de exportação
- ✅ Fácil pausar/retomar/resetar jobs

### Por que exportação em lote?
- ✅ Enviar dados históricos completos
- ✅ Re-sincronizar após mudanças de schema
- ✅ Controle granular sobre período a ser exportado
- ✅ Complementa sincronização automática (quando implementada)

### Por que não sincronização bidirecional automática?
- ❌ Risco de loops infinitos
- ❌ Conflitos de dados difíceis de resolver
- ❌ Complexidade desnecessária para o caso de uso
- ❌ Mais pontos de falha e debugging difícil

---

## Fluxo de Dados

### Exportação (TabuladorMax → Gestão Scouter)

```
┌─────────────────┐
│  TabuladorMax   │
│   (fonte)       │
└────────┬────────┘
         │
         │ [1] Usuário inicia exportação
         │     via UI (data início/fim)
         │
         ▼
┌─────────────────────────────┐
│ export-to-gestao-scouter-   │
│         batch               │
│                             │
│ - Busca leads por data      │
│ - Aplica mapeamento campos  │
│ - Envia em lotes de 50      │
│ - Registra erros            │
└────────┬────────────────────┘
         │
         │ [2] POST /rest/v1/leads
         │     Authorization: Bearer [GESTAO_SERVICE_KEY]
         │     Content-Type: application/json
         │
         ▼
┌─────────────────┐
│ Gestão Scouter  │
│   (destino)     │
│                 │
│ Tabela: leads   │
│ RLS: service_   │
│      role OK    │
└─────────────────┘
```

### (Opcional) Sincronização Reversa

```
┌─────────────────┐
│ Gestão Scouter  │
│                 │
│ [Trigger on     │
│  INSERT/UPDATE  │
│  leads]         │
└────────┬────────┘
         │
         │ [3] HTTP POST Webhook
         │     (se sync_source != 'tabuladormax')
         │
         ▼
┌─────────────────────────────┐
│ sync-from-gestao-scouter    │
│                             │
│ - Valida payload            │
│ - Previne loop              │
│ - Upsert lead               │
└────────┬────────────────────┘
         │
         │ [4] UPDATE leads
         │     SET sync_source = 'gestao_scouter'
         │
         ▼
┌─────────────────┐
│  TabuladorMax   │
│                 │
│  Lead atualizado│
│  (não re-synca) │
└─────────────────┘
```

---

## Mapeamento de Campos

O sistema suporta mapeamento customizável de campos entre os dois projetos:

```json
{
  "fieldMappings": {
    "name": "name",
    "age": "age",
    "address": "address",
    "celular": "phone",
    "responsavel": "responsible"
  }
}
```

Configurado via `FieldMappingDialog` em `GestaoScouterExportTab`.

---

## Monitoramento e Logs

### Tabela: `gestao_scouter_export_jobs`
- `status`: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
- `total_leads`: Total de leads a exportar
- `exported_leads`: Leads exportados com sucesso
- `error_leads`: Leads com erro
- `processing_date`: Data atual sendo processada
- `last_completed_date`: Última data completada com sucesso

### Tabela: `gestao_scouter_export_errors`
- `job_id`: Referência ao job
- `lead_id`: Lead que falhou
- `error_message`: Mensagem de erro
- `response_status`: HTTP status code
- `response_body`: Resposta completa da API
- `lead_snapshot`: Dados do lead no momento do erro
- `fields_sent`: Campos enviados na requisição

### UI de Monitoramento
- **Componente:** `GestaoScouterExportTab.tsx`
- **Localização:** `/sync-monitor` > aba "Gestão Scouter"
- **Métricas em tempo real:**
  - Jobs ativos e histórico
  - Taxa de sucesso
  - Leads exportados vs erros
  - Logs detalhados de erros

---

## Troubleshooting

### ❌ "Schema inválido" ao exportar

**Causa:** Schema do Gestão Scouter não corresponde ao esperado

**Solução:**
1. Clique em "Validar Schema" no painel
2. Copie o SQL sugerido que aparece
3. Execute no SQL Editor do Gestão Scouter
4. Aguarde 30-60s para cache do PostgREST atualizar
5. Clique em "Recarregar Cache"
6. Clique novamente em "Validar Schema"

### ❌ Exportação pausada com erros

**Causa:** Erros recorrentes em múltiplos leads

**Solução:**
1. Veja o painel de erros detalhados
2. Identifique o padrão (ex: campo faltando, tipo incompatível)
3. Corrija no Gestão Scouter (adicionar coluna, ajustar tipo)
4. Clique em "Resetar Job" para recomeçar do início

### ❌ "Unauthorized" ou "403 Forbidden"

**Causa:** Credenciais inválidas ou RLS bloqueando

**Solução:**
1. Verifique se `project_url` está correto em Config > Integrações
2. Confirme que `anon_key` é o Service Role Key (não o Anon Key público)
3. No Gestão Scouter, verifique RLS na tabela `leads`:
   ```sql
   -- Deve ter política para service_role
   SELECT * FROM pg_policies WHERE tablename = 'leads';
   ```

### ❌ Sincronização reversa não funciona

**Causa:** Trigger não criado ou credenciais erradas

**Solução:**
1. Verifique se trigger `sync_to_tabuladormax` existe no Gestão Scouter
2. Confirme que URL do TabuladorMax está correta no trigger
3. Teste webhook manualmente:
   ```bash
   curl -X POST https://jstsrgyxrrlklnzgsihd.supabase.co/functions/v1/sync-from-gestao-scouter \
     -H "Authorization: Bearer [SERVICE_KEY]" \
     -H "Content-Type: application/json" \
     -d '{"lead": {...}, "source": "gestao_scouter"}'
   ```
4. Cheque logs da função no TabuladorMax

### ❌ Loop infinito de sincronização

**Causa:** Campo `sync_source` não sendo respeitado

**Solução:**
1. Verifique se trigger no Gestão Scouter tem:
   ```sql
   IF NEW.sync_source = 'tabuladormax' OR NEW.sync_source = 'supabase' THEN
     RETURN NEW;
   END IF;
   ```
2. No TabuladorMax, confirme que `sync-from-gestao-scouter` define:
   ```typescript
   sync_source: 'gestao_scouter'
   ```
3. Se loop persistir, desative temporariamente o trigger reverso

---

## Performance

### Exportação em Lote
- **Batch size:** 50 leads por requisição
- **Timeout:** 30s por batch
- **Retry:** 3 tentativas com backoff exponencial
- **Rate limiting:** Respeita limites do PostgREST

### Otimizações
- Index em `leads.updated_at` para queries de data
- Index em `leads.criado` para filtros de período
- Cache de schema validado por 5 minutos
- Processamento em background via Edge Function

---

## Segurança

### Autenticação
- ✅ Service Role Key armazenada como secret
- ✅ HTTPS obrigatório em todas as requisições
- ✅ JWT validation nos webhooks
- ✅ RLS policies em todas as tabelas

### Prevenção de Loops
- ✅ Campo `sync_source` em cada registro
- ✅ Verificação antes de cada sync
- ✅ Timeout de 30s por operação
- ✅ Logs completos de todas as operações

### Dados Sensíveis
- ✅ Credenciais nunca logadas
- ✅ PII não exposta em mensagens de erro
- ✅ Acesso via service_role apenas
- ✅ Audit trail completo

---

## Manutenção

### Backup antes de grandes exportações
```sql
-- No Gestão Scouter
CREATE TABLE leads_backup AS SELECT * FROM leads;
```

### Limpeza de logs antigos
```sql
-- Manter apenas últimos 90 dias
DELETE FROM gestao_scouter_export_errors 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Monitoramento de saúde
```sql
-- Jobs travados há mais de 1 hora
SELECT * FROM gestao_scouter_export_jobs
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '1 hour';
```

---

## Roadmap Futuro

### Curto Prazo (Opcional)
- [ ] Sincronização automática agendada (cron)
- [ ] Notificações por email em caso de erro
- [ ] Dashboard de métricas de sincronização
- [ ] Export/Import de configurações de mapeamento

### Longo Prazo (Se necessário)
- [ ] Sincronização incremental em tempo real
- [ ] Resolução automática de conflitos
- [ ] Multi-tenant support
- [ ] API pública de sincronização

---

## Referências

- [Documentação Export Batch](./guides/gestao-scouter-batch-export.md)
- [Guia de Sincronização](./guides/gestao-scouter-sync-guide.md)
- [Field Mapping](./FIELD_MAPPING_VISUAL_SUMMARY.md)
- [Troubleshooting Schema](./SCHEMA_CACHE_TROUBLESHOOTING.md)
