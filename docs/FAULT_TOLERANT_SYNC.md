# Sistema Fault-Tolerant de Sincronização

## 🎯 Objetivo

Garantir que **TODOS os leads sejam salvos**, mesmo que alguns campos individuais apresentem erros de validação ou mapeamento. O sistema nunca deve rejeitar um lead inteiro por causa de um único campo problemático.

## 🏗️ Arquitetura

### 1. Campos de Diagnóstico

Dois novos campos na tabela `leads`:

```sql
sync_errors JSONB        -- Detalhes estruturados dos erros
has_sync_errors BOOLEAN  -- Flag rápida para queries
```

**Estrutura de `sync_errors`:**
```json
{
  "timestamp": "2025-11-20T12:30:45.123Z",
  "source": "bitrix-webhook" | "bitrix-resync",
  "original_error": "Mensagem de erro original (se houver)",
  "errors": [
    {
      "field": "commercial_project_id",
      "attempted_value": "invalid-uuid",
      "error": "UUID inválido: \"invalid-uuid\"",
      "bitrix_field": "COMPANY_ID"
    }
  ]
}
```

### 2. Webhook Fault-Tolerant

**Arquivo:** `supabase/functions/bitrix-webhook/index.ts`

**Fluxo:**
1. ✅ Tentativa de upsert completo
2. ⚠️ Se falhar, modo de salvamento parcial:
   - Campos obrigatórios garantidos: `id`, `name`, `raw`, `sync_source`
   - Tentativa de adicionar cada campo opcional individualmente
   - Erros são coletados em `fieldErrors[]`
   - Se falhar validação → pular campo e registrar erro
3. 💾 Salva lead com campos válidos + `sync_errors`
4. ✅ **SEMPRE** retorna HTTP 200 ao Bitrix (não quebrar webhook)
5. 📝 Registra evento com status `partial_success` ou `error`

**Validações implementadas:**
- UUID válido para `commercial_project_id`
- Idade entre 0-150 para `age`
- (Adicione mais conforme necessário)

### 3. Resync Fault-Tolerant

**Arquivo:** `supabase/functions/bitrix-resync-leads/index.ts`

**Fluxo similar ao webhook:**
1. Tentativa de update completo
2. Se falhar → salvamento parcial campo a campo
3. Registra erros e continua processamento
4. **NUNCA pula um lead inteiro**

**Diferenças:**
- Limpa `sync_errors` se sincronização for 100% bem-sucedida
- Registra evento `resync` ao invés de `create/update`

### 4. UI - Indicadores Visuais

**Badge de Erro no Lead Card:**

```tsx
{lead.has_sync_errors && (
  <Tooltip>
    <TooltipTrigger>
      <Badge variant="destructive">
        <AlertCircle className="w-3 h-3" />
        Erro Sync
      </Badge>
    </TooltipTrigger>
    <TooltipContent>
      {/* Lista de campos com erro */}
    </TooltipContent>
  </Tooltip>
)}
```

### 5. Página de Diagnóstico

**Rota:** `/admin/sync-errors`  
**Componente:** `src/pages/admin/SyncErrors.tsx`

**Funcionalidades:**
- ✅ Lista todos os leads com `has_sync_errors = true`
- 📊 Estatísticas: total de erros, campos afetados, responsáveis
- 🔍 Detalhes expandidos de cada erro
- 🔄 Re-sincronização individual de leads
- ✔️ Marcar erro como "resolvido" (limpa flags)
- 🔗 Link direto para o lead

## 📊 Exemplos de Erros Comuns

### 1. UUID Inválido

**Causa:** `commercial_project_id` recebe valor não-UUID do Bitrix

**Erro registrado:**
```json
{
  "field": "commercial_project_id",
  "attempted_value": "123",
  "error": "UUID inválido: \"123\"",
  "bitrix_field": "COMPANY_ID"
}
```

**Solução:**
- Corrigir mapeamento em `unified_field_config`
- Ou adicionar transformação para resolver ID → UUID

### 2. Responsible Numérico

**Causa:** `responsible` com ID ao invés de nome

**Erro registrado:**
```json
{
  "field": "responsible",
  "attempted_value": "9",
  "error": "Valor numérico não permitido",
  "bitrix_field": "PARENT_ID_1144"
}
```

**Solução:**
- Já implementado: lookup em `agent_telemarketing_mapping`
- Se lookup falhar, campo é removido e erro registrado

### 3. Data Inválida

**Causa:** Formato de data brasileiro não parseado

**Erro registrado:**
```json
{
  "field": "data_agendamento",
  "attempted_value": "32/13/2025",
  "error": "Data inválida"
}
```

**Solução:**
- Revisar função `parseBrazilianDate()`
- Adicionar validação de dia/mês

### 4. ID de Lista em Campo Boolean ⚠️ **ERRO COMUM**

**Causa:** Campos booleanos recebendo IDs numéricos de listas do Bitrix24 (ex: `5492`, `5494`)

**Erro Original:**
```
invalid input syntax for type boolean: "5492"
```

**Por que acontece:**
- Campo configurado no Bitrix24 como **Lista** ao invés de **Sim/Não**
- Bitrix retorna ID da opção selecionada (ex: `5492 = "Sim"`, `5494 = "Não"`)
- PostgreSQL não aceita IDs numéricos altos como boolean

**Campos Afetados:**
- `cadastro_existe_foto` (UF_CRM_1745431662)
- `presenca_confirmada` (UF_CRM_XXXXX)
- `compareceu` (UF_CRM_XXXXX)
- `ficha_confirmada` (UF_CRM_XXXXX)

**Erro registrado:**
```json
{
  "field": "cadastro_existe_foto",
  "attempted_value": "5492",
  "error": "Valor \"5492\" parece ser ID de lista do Bitrix, não booleano",
  "bitrix_field": "UF_CRM_1745431662"
}
```

**Solução Aplicada (Automática):**
1. ✅ Validação pré-salvamento detecta IDs > 100
2. ✅ Converte automaticamente para `null` com warning
3. ✅ Registra erro em `sync_errors` para investigação
4. ✅ Lead é salvo com demais campos válidos

**Como Corrigir Permanentemente:**

**Opção A - Reconfigurar Campo no Bitrix (RECOMENDADO):**
1. Acesse Bitrix24 → CRM → Configurações → Campos Personalizados
2. Localize o campo (ex: UF_CRM_1745431662)
3. Alterar tipo de **Lista** para **Sim/Não**
4. Re-sincronizar leads afetados

**Opção B - Criar Mapeamento de IDs:**
Se não puder alterar o Bitrix, adicione transformação:
```typescript
// Em unified_field_config ou no webhook
const listIdToBool = {
  '5492': true,  // ID que significa "Sim"
  '5494': false  // ID que significa "Não"
};
```

**Monitoramento:**
```sql
-- Verificar leads com IDs em campos boolean
SELECT id, name, 
  sync_errors->>'errors' as errors
FROM leads
WHERE has_sync_errors = true
  AND sync_errors::text LIKE '%ID de lista Bitrix%'
ORDER BY updated_at DESC
LIMIT 20;
```

## 🔧 Manutenção

### Query: Listar Leads com Erros

```sql
SELECT 
  id,
  name,
  responsible,
  has_sync_errors,
  sync_errors->>'timestamp' as erro_em,
  sync_errors->'errors' as detalhes_erros
FROM leads
WHERE has_sync_errors = true
ORDER BY updated_at DESC;
```

### Query: Estatísticas de Erros

```sql
SELECT 
  sync_errors->>'source' as origem,
  COUNT(*) as total_leads_afetados,
  SUM(jsonb_array_length(sync_errors->'errors')) as total_campos_com_erro
FROM leads
WHERE has_sync_errors = true
GROUP BY origem;
```

### Query: Campos Mais Problemáticos

```sql
SELECT 
  error_detail->>'field' as campo,
  error_detail->>'error' as erro,
  COUNT(*) as ocorrencias
FROM leads,
  jsonb_array_elements(sync_errors->'errors') as error_detail
WHERE has_sync_errors = true
GROUP BY campo, erro
ORDER BY ocorrencias DESC
LIMIT 20;
```

### Limpar Erros Resolvidos Manualmente

```sql
-- Limpar erros de leads que já foram corrigidos
UPDATE leads
SET 
  sync_errors = NULL,
  has_sync_errors = false
WHERE has_sync_errors = true
  AND id IN (SELECT id FROM leads WHERE [condição de correção]);
```

## 🚨 Monitoramento

### Alertas Recomendados

1. **Mais de 50 leads com erros**
   ```sql
   SELECT COUNT(*) FROM leads WHERE has_sync_errors = true;
   ```

2. **Mesmo erro ocorrendo repetidamente**
   - Indica problema de configuração de mapeamento

3. **Erros aumentando rapidamente**
   - Pode indicar mudança no Bitrix ou API

### Dashboard de Saúde

Acessar `/admin/sync-errors` para ver:
- Total de leads com problemas
- Campos mais afetados
- Responsáveis impactados
- Tendência temporal

## 📝 Logs

### Logs de Sucesso Parcial

```
⚠️ Lead 12345 salvo PARCIALMENTE (2 campos com erro, 15 campos ok)
```

### Logs de Falha Total (raro)

```
❌ FALHA CRÍTICA ao salvar lead 12345: [erro]
```

**Nota:** Mesmo em falha total, webhook retorna HTTP 200 para não quebrar integração.

## 🔄 Re-sincronização

### Manual (UI)

1. Ir em `/admin/sync-errors`
2. Localizar lead problemático
3. Clicar em "Re-sync"
4. Sistema tenta novamente com lógica fault-tolerant

### Programática (API)

```typescript
const { error } = await supabase.functions.invoke('bitrix-resync-leads', {
  body: {
    action: 'create',
    config: {
      filter_criteria: { lead_ids: [12345] },
      batch_size: 1
    }
  }
});
```

### Em Lote

Re-sincronizar todos os leads com erros:

```typescript
const { data: errorLeads } = await supabase
  .from('leads')
  .select('id')
  .eq('has_sync_errors', true);

const leadIds = errorLeads?.map(l => l.id) || [];

// Chamar resync em lotes de 50
for (let i = 0; i < leadIds.length; i += 50) {
  const batch = leadIds.slice(i, i + 50);
  await supabase.functions.invoke('bitrix-resync-leads', {
    body: {
      action: 'create',
      config: {
        filter_criteria: { lead_ids: batch },
        batch_size: 50
      }
    }
  });
}
```

## 📋 Mapeamento de Enumerações Bitrix → Boolean

### Problema
Campos boolean no Supabase podem ser mapeados de campos **enumeration** (lista) no Bitrix24, que retornam IDs numéricos ao invés de valores true/false.

**Exemplo:** Campo `cadastro_existe_foto` (boolean) mapeado de `UF_CRM_1745431662` (enumeration):
- Bitrix retorna: `"5492"` (ID da opção "SIM")
- Supabase espera: `true` ou `false`
- **Resultado sem mapeamento:** Erro `invalid input syntax for type boolean: "5492"`

### Campos Mapeados

| Campo Supabase | Campo Bitrix | Tipo Bitrix | Mapeamento |
|----------------|--------------|-------------|------------|
| `cadastro_existe_foto` | `UF_CRM_1745431662` | enumeration | `5492` → `true` (SIM)<br>`5494` → `false` (NAO) |
| `ficha_confirmada` | `UF_CRM_1737378043893` | enumeration | `1878` → `true` (Sim)<br>`1880` → `null` (Aguardando)<br>`4892` → `false` (Não confirmada) |
| `presenca_confirmada` | `UF_CRM_1746816298253` | boolean | Nativo (0/1) |
| `compareceu` | Campo boolean nativo | boolean | Nativo (0/1) |

### Como Funciona

**1. Configuração nos Edge Functions:**

Dicionários de mapeamento em `bitrix-webhook/index.ts` e `bitrix-resync-leads/index.ts`:

```typescript
const BITRIX_ENUM_TO_BOOLEAN: Record<string, Record<string, boolean | null>> = {
  'UF_CRM_1745431662': {  // Cadastro Existe Foto?
    '5492': true,   // SIM
    '5494': false,  // NAO
  },
  'UF_CRM_1737378043893': {  // Ficha confirmada
    '1878': true,   // Sim
    '1880': null,   // Aguardando (incerto)
    '4892': false,  // Não confirmada
  },
};
```

**2. Conversão Automática:**

Durante sincronização (webhook ou resync):
1. ✅ Detecta campo boolean no Supabase
2. 🔍 Identifica campo Bitrix correspondente
3. 🔄 Busca ID no dicionário de mapeamento
4. ✨ Converte para `true`, `false` ou `null`
5. 📝 Registra erro em `sync_errors` se ID não encontrado

**3. Logs de Debug:**

```
✓ Campo cadastro_existe_foto: "5492" → true
⚠️ Erro ao converter campo ficha_confirmada (UF_CRM_1737378043893): 
   ID de enumeração "9999" não encontrado no mapeamento. IDs válidos: 1878, 1880, 4892
```

### Como Adicionar Novos Mapeamentos

**Passo 1:** Verificar tipo do campo no Bitrix

Procurar no arquivo `fields_bitrix.txt` ou via API:
```json
{
  "UF_CRM_XXXXXX": {
    "type": "enumeration",
    "items": [
      { "ID": "1234", "VALUE": "SIM" },
      { "ID": "1236", "VALUE": "NAO" }
    ]
  }
}
```

**Passo 2:** Adicionar ao dicionário

Em **ambos** os arquivos (`bitrix-webhook/index.ts` e `bitrix-resync-leads/index.ts`):

```typescript
const BITRIX_ENUM_TO_BOOLEAN: Record<string, Record<string, boolean | null>> = {
  // ... mapeamentos existentes ...
  
  'UF_CRM_XXXXXX': {  // Nome do novo campo
    '1234': true,     // ID que representa "SIM"
    '1236': false,    // ID que representa "NAO"
  }
};
```

**Passo 3:** Adicionar ao mapeamento reverso (se necessário)

```typescript
const SUPABASE_TO_BITRIX_ENUM: Record<string, string> = {
  // ... mapeamentos existentes ...
  'novo_campo_boolean': 'UF_CRM_XXXXXX',
};
```

**Passo 4:** Testar

1. Reprocessar lead com valor problemático
2. Verificar logs: deve aparecer `✓ Campo novo_campo_boolean: "1234" → true`
3. Confirmar ausência de erros de sintaxe boolean

### Diagnóstico de Problemas

**Erro: "ID de enumeração não encontrado"**
```
⚠️ ID de enumeração "9999" não encontrado no mapeamento de UF_CRM_1745431662
```

**Causa:** Bitrix adicionou novo valor à lista que não está mapeado

**Solução:**
1. Verificar no Bitrix qual valor corresponde ao ID 9999
2. Adicionar ao dicionário: `'9999': true` (ou false/null)
3. Reprocessar leads afetados

**Erro: "Valor não pode ser convertido para boolean"**
```
⚠️ Valor "texto_aleatorio" não pode ser convertido para boolean (campo UF_CRM_XXX)
```

**Causa:** Campo não é enumeration nem boolean nativo

**Solução:**
1. Verificar tipo do campo no Bitrix
2. Se for `string`, alterar tipo no Supabase para `text`
3. Ou adicionar mapeamento específico se tiver valores padronizados

### Queries de Verificação

**Listar leads com erros de conversão de enumeração:**
```sql
SELECT 
  id,
  cadastro_existe_foto,
  ficha_confirmada,
  sync_errors->'errors'
FROM leads
WHERE has_sync_errors = true
  AND sync_errors::text LIKE '%enumeração%';
```

**Estatísticas de campos boolean problemáticos:**
```sql
SELECT 
  error->>'field' as field,
  COUNT(*) as occurrences,
  ARRAY_AGG(DISTINCT error->>'attempted_value') as problematic_values
FROM leads,
  jsonb_array_elements(sync_errors->'errors') as error
WHERE error->>'error' LIKE '%enumeração%'
GROUP BY error->>'field'
ORDER BY occurrences DESC;
```

### Manutenção

**Frequência de revisão:** Mensal ou quando houver erros recorrentes

**Checklist:**
- [ ] Verificar se novos campos enumeration foram adicionados no Bitrix
- [ ] Conferir logs por IDs não mapeados
- [ ] Atualizar dicionários se necessário
- [ ] Reprocessar leads com erros de conversão

---

## 🎓 Princípios de Design

1. **Nunca Rejeitar Lead Completo**
   - Campo ruim ≠ lead ruim
   - Salvar o máximo possível

2. **Visibilidade Total**
   - Todos os leads ficam visíveis
   - Erros claramente marcados
   - Detalhes acessíveis

3. **Diagnóstico Fácil**
   - Estrutura padronizada de erros
   - Informações completas (campo + valor + erro)
   - Rastreabilidade temporal

4. **Recuperação Simples**
   - Re-sync individual ou em lote
   - Limpeza manual de flags
   - Integração não quebra

5. **Performance**
   - Índice em `has_sync_errors`
   - Queries otimizadas
   - Salvamento parcial rápido

## 🔐 Segurança

**RLS Policies:** Leads com erros seguem as mesmas políticas de acesso:

- Agents veem apenas seus leads (com ou sem erro)
- Admins/Managers veem todos
- Erros não expõem dados sensíveis

## 📚 Referências

- `supabase/functions/bitrix-webhook/index.ts` - Implementação webhook
- `supabase/functions/bitrix-resync-leads/index.ts` - Implementação resync
- `src/pages/admin/SyncErrors.tsx` - Interface de diagnóstico
- `src/components/gestao/LeadCard.tsx` - Badge de erro no card

---

**Última Atualização:** 2025-11-20  
**Versão:** 1.0  
**Status:** ✅ Implementado e Ativo
