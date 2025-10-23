# Auto-Sync de Schema: TabuladorMax → Gestão Scouter

## 📋 Visão Geral

O **Auto-Sync de Schema** é um recurso automático que sincroniza a estrutura da tabela `leads` entre TabuladorMax e Gestão Scouter, eliminando erros de campos faltantes e garantindo compatibilidade perfeita entre os projetos.

## 🎯 Problema que Resolve

Quando o TabuladorMax tenta enviar dados para o Gestão Scouter, podem ocorrer erros como:

- `PGRST204` - Coluna não encontrada
- `42501` - Insufficient privilege
- `Schema mismatch` - Campos faltando

Isso acontece quando:
1. TabuladorMax adiciona novos campos na tabela `leads`
2. Gestão Scouter ainda não possui esses campos
3. A sincronização falha ao tentar inserir dados

## ✨ Solução Automática

O Auto-Sync **analisa ambos os schemas**, identifica diferenças e adiciona automaticamente as colunas faltantes no Gestão Scouter.

## 🚀 Como Usar

### 1. Acesse a Interface

1. Vá para **Configurações → Integrações → TabuladorMax**
2. Localize o botão **"🔄 Sincronizar Schema"**

### 2. Execute a Sincronização

1. Clique em **"Sincronizar Schema"**
2. Confirme a ação no diálogo que aparecer
3. Aguarde 5-15 segundos enquanto o sistema:
   - Chama TabuladorMax para exportar schema
   - TabuladorMax lê schema local (via service_role interno)
   - TabuladorMax envia schema para Gestão Scouter
   - Gestão Scouter identifica colunas faltantes
   - Gestão Scouter adiciona as colunas necessárias
   - Cria índices para otimização
   - Recarrega o schema cache

### 3. Resultado

Você verá um toast com o resultado:

- ✅ **Sucesso:** "X coluna(s) adicionada(s) e Y índice(s) criado(s)"
- ✅ **Já atualizado:** "Todas as colunas já estão atualizadas!"
- ❌ **Erro:** Mensagem detalhada do problema

## 🔒 Segurança: Como Funciona Sem Service Role Keys

O Auto-Sync funciona em dois passos usando Edge Functions que se comunicam via HTTP:

### Arquitetura Nova (Lovable Cloud Compatible)

```
┌────────────────────────┐
│  Gestão Scouter (UI)   │
│  Botão: "Sincronizar   │
│  Schema"               │
└────────────┬───────────┘
             │
             │ 1. POST /export-schema
             │    Auth: Bearer <tabulador_anon_key>
             │    Body: { target_url, target_api_key }
             │
             ▼
┌────────────────────────┐
│   TabuladorMax         │
│   export-schema        │
│   Edge Function        │
└────────────┬───────────┘
             │
             │ 2. Lê schema local
             │    (usa service_role INTERNO)
             │
             │ 3. POST /receive-schema-from-tabulador
             │    Auth: Bearer <gestao_anon_key>
             │    Body: { columns: [...] }
             │
             ▼
┌────────────────────────┐
│  Gestão Scouter        │
│  receive-schema        │
│  Edge Function         │
└────────────┬───────────┘
             │
             │ 4. Compara schemas
             │ 5. Executa ALTER TABLE
             │    (usa service_role INTERNO)
             │ 6. Cria índices
             │ 7. NOTIFY pgrst
             │
             ▼
          ✅ Sucesso!
```

**Vantagens desta arquitetura:**
- ✅ Service Role Keys nunca saem dos projetos (usados apenas internamente)
- ✅ Comunicação via ANON_KEYs (seguras para exposição)
- ✅ Funciona 100% no Lovable Cloud
- ✅ Sem necessidade de configuração manual de secrets
- ✅ Zero risco de vazamento de credenciais sensíveis

## 🔧 Como Funciona Internamente

### Edge Function 1: `export-schema` (TabuladorMax)

⚠️ **IMPORTANTE:** Esta função precisa ser criada manualmente no TabuladorMax.

```typescript
// Lê schema local usando service_role INTERNO
const localClient = createClient(
  Deno.env.get('SUPABASE_URL'),           // URL do TabuladorMax (automático)
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // Service Role INTERNO (automático)
);

const { data: columns } = await localClient
  .from('information_schema.columns')
  .select('*')
  .eq('table_name', 'leads');

// Envia para Gestão Scouter
await fetch(`${target_url}/functions/v1/receive-schema-from-tabulador`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${target_api_key}`, // ANON_KEY do Gestão (seguro)
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ columns })
});
```

**📚 Guia completo:** Ver `docs/TABULADORMAX_EXPORT_SCHEMA_GUIDE.md` para instruções detalhadas de como criar esta função no TabuladorMax.

---

### Edge Function 2: `receive-schema-from-tabulador` (Gestão Scouter)

✅ **JÁ IMPLEMENTADA** no Gestão Scouter.

```typescript
// Recebe schema do TabuladorMax
const { columns } = await req.json();

// Lê schema local usando service_role INTERNO
const gestaoClient = createClient(
  Deno.env.get('SUPABASE_URL'),           // URL do Gestão (automático)
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // Service Role INTERNO (automático)
);

const { data: localColumns } = await gestaoClient
  .from('information_schema.columns')
  .select('*')
  .eq('table_name', 'leads');

// Compara e adiciona colunas faltantes
const missingColumns = columns.filter(
  col => !localColumns.find(lc => lc.column_name === col.column_name)
);

// Executa ALTER TABLE
await gestaoClient.rpc('exec_sql', {
  sql: `ALTER TABLE public.leads ADD COLUMN ...`
});
```

---

## 📊 Mapeamento de Tipos

| Tipo TabuladorMax | Tipo Gestão Scouter | Notas |
|-------------------|---------------------|-------|
| `text` | `TEXT` | Direto |
| `character varying` | `TEXT` | Convertido para TEXT |
| `integer` | `INTEGER` | Direto |
| `bigint` | `BIGINT` | Direto |
| `smallint` | `SMALLINT` | Direto |
| `boolean` | `BOOLEAN` | Direto |
| `numeric` | `NUMERIC` | Preserva precisão |
| `decimal` | `NUMERIC` | Convertido |
| `real` | `REAL` | Direto |
| `double precision` | `DOUBLE PRECISION` | Direto |
| `timestamp with time zone` | `TIMESTAMPTZ` | Direto |
| `timestamp without time zone` | `TIMESTAMP` | Direto |
| `date` | `DATE` | Direto |
| `time` | `TIME` | Direto |
| `uuid` | `UUID` | Direto |
| `jsonb` | `JSONB` | Direto |
| `json` | `JSONB` | Convertido para JSONB |
| `bytea` | `BYTEA` | Direto |

## 🛡️ Segurança e Proteções

### O que o Auto-Sync FAZ:
✅ Adiciona colunas faltantes  
✅ Cria índices para otimização  
✅ Recarrega schema cache  
✅ Preserva dados existentes  
✅ Usa `IF NOT EXISTS` (idempotente)  

### O que o Auto-Sync NÃO FAZ:
❌ NUNCA remove colunas existentes  
❌ NUNCA altera tipos de colunas existentes  
❌ NUNCA modifica dados  
❌ NUNCA altera constraints existentes  
❌ NUNCA executa DROP ou TRUNCATE  

### Validações Implementadas:

1. **Credenciais:** Verifica se todas as credenciais estão disponíveis
2. **Conexão:** Testa comunicação entre projetos
3. **Tipos:** Apenas adiciona colunas com tipos suportados
4. **Idempotência:** Pode ser executado múltiplas vezes sem erro
5. **Logs:** Registra todas as operações para auditoria

## 🐛 Troubleshooting

### Erro: "Erro ao chamar TabuladorMax"

**Causa:** Edge Function `export-schema` não existe no TabuladorMax.

**Solução:**
1. Consulte `docs/TABULADORMAX_EXPORT_SCHEMA_GUIDE.md`
2. Crie a Edge Function no TabuladorMax
3. Faça deploy da função
4. Tente novamente

### Erro: "target_url e target_api_key são obrigatórios"

**Causa:** Configuração incorreta na UI.

**Solução:**
1. Verifique se os secrets estão configurados corretamente
2. Confirme URLs do TabuladorMax e Gestão Scouter
3. Verifique ANON_KEYS de ambos os projetos

### Erro: "401 Unauthorized"

**Causa:** ANON_KEY incorreto ou Edge Function com `verify_jwt = true`.

**Solução:**
1. Verifique `supabase/config.toml` no TabuladorMax:
   ```toml
   [functions.export-schema]
   verify_jwt = false  # DEVE SER false
   ```
2. Confirme ANON_KEYS corretos

### Sincronização não reflete imediatamente

**Causa:** Schema cache do PostgREST ainda não foi atualizado.

**Solução:**
1. Aguarde 10-30 segundos
2. Execute `NOTIFY pgrst, 'reload schema';` manualmente
3. Ou clique em "Diagnóstico RLS" para forçar reload

## 📈 Resultados Esperados

### Antes do Auto-Sync:
```
TabuladorMax: 55 colunas
Gestão Scouter: 49 colunas
❌ Erro: 6 campos faltando
❌ Sincronização falhando
```

### Depois do Auto-Sync:
```
TabuladorMax: 55 colunas
Gestão Scouter: 55 colunas ✅
✅ Schema 100% compatível
✅ Sincronização funcionando
✅ Zero erros PGRST204
```

## 🎯 Quando Usar

### Use Auto-Sync quando:
- TabuladorMax adicionou novos campos
- Aparecem erros de "coluna não encontrada"
- Após atualização no TabuladorMax
- Sincronização começou a falhar
- Você quer garantir compatibilidade

### NÃO precisa usar quando:
- Sincronização está funcionando perfeitamente
- Não há erros de schema
- Você acabou de configurar o sistema pela primeira vez

## 📋 Checklist de Verificação

Após executar o Auto-Sync, verifique:

- [ ] Toast de sucesso apareceu
- [ ] Colunas foram adicionadas (veja detalhes no toast)
- [ ] Índices foram criados
- [ ] Nenhum erro foi reportado
- [ ] Execute "Diagnóstico RLS" para confirmar
- [ ] Teste sincronização de dados do TabuladorMax
- [ ] Verifique se dados aparecem corretamente

## 🔗 Arquivos Relacionados

### No Gestão Scouter (✅ Implementado):
- **Edge Function:** `supabase/functions/receive-schema-from-tabulador/index.ts`
- **UI Component:** `src/components/dashboard/integrations/TabuladorSync.tsx`
- **Configuração:** `supabase/config.toml`
- **Arquitetura:** `SYNC_ARCHITECTURE_GESTAO_SCOUTER.md`
- **Diagnóstico:** `docs/DIAGNOSTICO_RLS.md`

### No TabuladorMax (⚠️ Precisa ser criado):
- **Edge Function:** `supabase/functions/export-schema/index.ts`
- **Guia de Implementação:** `docs/TABULADORMAX_EXPORT_SCHEMA_GUIDE.md`

## 💡 Dicas

1. **Execute periodicamente:** Faça Auto-Sync após cada atualização no TabuladorMax
2. **Verifique logs:** Sempre confira os logs das edge functions para detalhes
3. **Idempotente:** Seguro executar múltiplas vezes
4. **Teste antes:** Use curl para testar manualmente se necessário
5. **Monitore erros:** Fique atento a erros 401 (autenticação)

## 📞 Suporte

Se o Auto-Sync não resolver seu problema:

1. Execute "Diagnóstico RLS" para análise detalhada
2. Confira os logs das edge functions no console
3. Verifique se as credenciais estão corretas
4. Consulte `SYNC_ARCHITECTURE_GESTAO_SCOUTER.md`
5. Consulte `docs/DIAGNOSTICO_RLS.md`
6. Verifique `docs/TABULADORMAX_EXPORT_SCHEMA_GUIDE.md`

---

**Última atualização:** 2025-10-21  
**Status:** ✅ Implementado no Gestão Scouter | ⚠️ Aguardando implementação no TabuladorMax