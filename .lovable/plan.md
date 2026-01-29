
# Plano de Implementação - Itens Restantes

## Visão Geral
Este plano cobre os 6 itens pendentes de média e baixa prioridade do plano de melhorias da Central de Atendimento WhatsApp.

---

## Item 1: Encerramento Automático por Template Específico (Média Prioridade)

### Contexto
Quando templates de "Não fez cadastro" (ID 8998) ou "Ver perfil" são enviados, a conversa deve ser encerrada automaticamente.

### Implementação
**Arquivo:** `supabase/functions/gupshup-send-message/index.ts`

Após o envio bem-sucedido de um template, verificar se o template_id corresponde aos templates de encerramento e inserir registro em `whatsapp_conversation_closures`:

```typescript
// Após salvar mensagem de template com sucesso
const AUTO_CLOSE_TEMPLATE_IDS = ['8998']; // IDs de templates que encerram conversa

if (AUTO_CLOSE_TEMPLATE_IDS.includes(template_id)) {
  await supabase.from('whatsapp_conversation_closures').insert({
    phone_number: normalizedPhone,
    bitrix_id: bitrix_id || null,
    closed_by: user_id || null,
    closure_reason: 'template',
    closure_notes: `Auto-encerrado: Template ${template_id}`,
  });
}
```

### Identificar IDs dos Templates
- Buscar na tabela `gupshup_templates` os templates corretos de "Não fez cadastro" e "Ver perfil"
- Confirmar com usuário quais templates devem acionar o encerramento automático

---

## Item 2: Filtro por Operador Atribuído/Convidado (Média Prioridade)

### Implementação Backend (Migração SQL)
Atualizar a RPC `get_admin_whatsapp_conversations` para adicionar parâmetro de filtro por operador:

```sql
CREATE OR REPLACE FUNCTION get_admin_whatsapp_conversations(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_window_filter TEXT DEFAULT 'all',
  p_response_filter TEXT DEFAULT 'all',
  p_etapa_filter TEXT DEFAULT NULL,
  p_deal_status_filter TEXT DEFAULT 'all',
  p_tag_filter TEXT[] DEFAULT NULL,
  p_operator_filter UUID DEFAULT NULL  -- NOVO
)
-- Adicionar filtro no WHERE:
AND (p_operator_filter IS NULL OR EXISTS (
  SELECT 1 FROM whatsapp_conversation_participants wcp
  WHERE wcp.phone_number = s.phone_number
    AND wcp.operator_id = p_operator_filter
    AND wcp.resolved_at IS NULL
))
```

### Implementação Frontend
**Arquivo:** `src/components/whatsapp/AdminConversationList.tsx`

1. Adicionar estado para filtro de operador
2. Buscar lista de operadores participantes de conversas
3. Adicionar dropdown de seleção de operador

**Arquivo:** `src/hooks/useAdminWhatsAppConversations.ts`

1. Adicionar parâmetro `operatorFilter` ao hook
2. Passar para as RPCs

---

## Item 3: Sincronização de Nome do Bitrix (Média Prioridade)

### Diagnóstico
O webhook Bitrix já recebe eventos de UPDATE e faz UPSERT. O problema pode ser:
1. Campo `name` não está sendo atualizado no UPSERT
2. Webhook não está sendo disparado para eventos de UPDATE

### Implementação
**Arquivo:** `supabase/functions/bitrix-webhook/index.ts`

Adicionar log explícito para rastrear mudanças de nome:

```typescript
// Antes do UPSERT
const { data: existingLead } = await supabase
  .from('leads')
  .select('name')
  .eq('id', leadId)
  .maybeSingle();

if (existingLead && existingLead.name !== leadData.name) {
  console.log(`📝 Nome atualizado: "${existingLead.name}" → "${leadData.name}"`);
}
```

Garantir que o campo `name` está no objeto de update conflict:

```typescript
.upsert(leadData, { 
  onConflict: 'id',
  ignoreDuplicates: false  // Força update mesmo se dados existem
})
```

---

## Item 4: Exibir Histórico de Resoluções na Conversa (Baixa Prioridade)

### Status Atual
O componente `ResolutionHistory.tsx` já existe e exibe as resoluções. 
O hook `useResolutionHistory` já busca dados de `whatsapp_participation_resolutions`.

### Implementação
**Arquivo:** `src/components/whatsapp/WhatsAppChatContainer.tsx`

O componente `ResolutionHistory` já está importado e usado (linha 20, 102).
Verificar se está sendo renderizado corretamente na aba de notas ou no header.

**Melhoria sugerida:** Adicionar indicador visual no header quando há resoluções:

```tsx
// No WhatsAppHeader.tsx
const { data: resolutions = [] } = useResolutionHistory(phoneNumber);

{resolutions.length > 0 && (
  <Badge variant="secondary" className="gap-1 text-xs bg-blue-100 text-blue-700">
    <UserCheck className="h-3 w-3" />
    {resolutions.length} resolução(ões)
  </Badge>
)}
```

---

## Item 5: Mostrar Histórico Completo de Mensagens (Baixa Prioridade)

### Diagnóstico
Verificar a RPC `get_telemarketing_whatsapp_messages` para identificar limites.

### Implementação
1. Aumentar LIMIT da RPC de 100 para 500 ou implementar paginação
2. Adicionar botão "Carregar mensagens anteriores" no `WhatsAppMessageList.tsx`

```tsx
{hasMoreMessages && (
  <Button 
    variant="ghost" 
    size="sm" 
    onClick={loadMoreMessages}
    disabled={loadingMore}
  >
    <ChevronUp className="h-4 w-4 mr-1" />
    Carregar mensagens anteriores
  </Button>
)}
```

---

## Item 6: Prevenção de Conversas Duplicadas (Baixa Prioridade)

### Diagnóstico
Verificar se há race conditions na criação de mensagens e se a normalização de telefone está sendo aplicada consistentemente.

### Implementação
1. **Migration SQL:** Adicionar constraint UNIQUE mais rigorosa em `whatsapp_messages`
2. **Função de Normalização:** Garantir que `normalizePhone()` seja idêntica em todos os pontos de entrada
3. **Merge de Duplicatas:** Criar RPC para identificar e mesclar conversas duplicadas

```sql
-- Identificar duplicatas
SELECT phone_number, COUNT(*) as variations
FROM (
  SELECT DISTINCT RIGHT(phone_number, 9) as phone_number
  FROM whatsapp_messages
) sub
GROUP BY phone_number
HAVING COUNT(*) > 1;
```

---

## Resumo de Arquivos a Modificar

| Item | Arquivos | Tipo |
|------|----------|------|
| 1. Encerramento Automático | `gupshup-send-message/index.ts` | Edge Function |
| 2. Filtro por Operador | `AdminConversationList.tsx`, `useAdminWhatsAppConversations.ts`, Nova Migration | Frontend + DB |
| 3. Sincronização Nome | `bitrix-webhook/index.ts` | Edge Function |
| 4. Histórico Resoluções | `WhatsAppHeader.tsx` | Frontend |
| 5. Histórico Completo | `WhatsAppMessageList.tsx`, RPC `get_telemarketing_whatsapp_messages` | Frontend + DB |
| 6. Deduplicação | Nova Migration, `gupshup-webhook/index.ts` | DB + Edge Function |

---

## Ordem de Implementação Sugerida

1. **Item 1** - Encerramento automático (impacto médio, esforço baixo)
2. **Item 2** - Filtro por operador (impacto médio, esforço médio)
3. **Item 3** - Sincronização nome (diagnóstico + correção)
4. **Item 4** - Indicador de resoluções (impacto baixo, esforço baixo)
5. **Item 5** - Histórico completo (impacto baixo, esforço médio)
6. **Item 6** - Deduplicação (requer análise de dados existentes)

---

## Seção Técnica Detalhada

### Diagrama de Fluxo - Encerramento Automático

```text
[Operador envia template]
        ↓
[gupshup-send-message] → [Gupshup API]
        ↓
[Template enviado com sucesso]
        ↓
[Verificar se template_id está em AUTO_CLOSE_TEMPLATES]
        ↓ (Sim)
[INSERT em whatsapp_conversation_closures]
        ↓
[Conversa encerrada automaticamente]
```

### Queries para Diagnóstico

```sql
-- Verificar templates de encerramento
SELECT id, element_name, template_id 
FROM gupshup_templates 
WHERE element_name ILIKE '%cadastro%' 
   OR element_name ILIKE '%perfil%';

-- Verificar conversas duplicadas
SELECT RIGHT(phone_number, 9) as phone_suffix, 
       COUNT(DISTINCT phone_number) as variations
FROM whatsapp_messages
GROUP BY RIGHT(phone_number, 9)
HAVING COUNT(DISTINCT phone_number) > 1
LIMIT 20;
```
