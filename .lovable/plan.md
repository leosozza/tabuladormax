
# Correção: Operadores Convidados Não Recebem Notificações e Mensagens

## Problema Relatado
O administrador Paulo convidou a supervisora Vitória para uma conversa, mas ela:
1. **Não recebeu a notificação** de convite
2. **Não consegue ver a conversa** para a qual foi convidada

## Análise do Problema

### Dados no Banco (Corretos)
| Verificação | Resultado |
|-------------|-----------|
| Convite criado | ✅ `whatsapp_conversation_participants` tem registro |
| Notificação criada | ✅ 3 notificações para Vitória (operator_id correto) |
| Mapeamento de usuário | ✅ Vitória autenticada (last_sign_in 12:18) |
| RLS configurado | ✅ Políticas permitem SELECT por operator_id |
| Realtime habilitado | ✅ Tabela na publicação supabase_realtime |

### Causa Raiz: Portal Telemarketing Não Suporta Convites

O `PortalTelemarketingWhatsApp.tsx` (usado pela Vitória como supervisora) tem duas limitações críticas:

**1. Notificações dependem de sessão Supabase ativa**
```typescript
// useWhatsAppNotifications.ts linha 23-24
const { data: { user } } = await supabase.auth.getUser();
if (!user) return []; // ← Retorna vazio se sessão expirada!
```

**2. Conversas convidadas não aparecem na lista**
```typescript
// useTelemarketingConversations.ts linha 187-188
.eq('bitrix_telemarketing_id', bitrixTelemarketingId)
// ← Filtra apenas leads atribuídos, IGNORA convites!
```

O hook `useMyInvitedConversations` existe mas é usado **apenas** na Central de Atendimento admin (`AdminConversationList.tsx`), não no Portal Telemarketing.

---

## Solução Proposta

### Parte 1: Mostrar Conversas Convidadas no Portal Telemarketing

Modificar `PortalTelemarketingWhatsApp.tsx` para:
1. Importar e usar `useMyInvitedConversations`
2. Mesclar conversas atribuídas com conversas convidadas
3. Adicionar indicador visual de "Convidado por [nome]"
4. Adicionar seção/filtro para conversas convidadas

### Parte 2: Robustez nas Notificações

Modificar `useWhatsAppNotifications.ts` para:
1. Tentar recuperar sessão automaticamente se expirada
2. Log de diagnóstico quando usuário não está autenticado
3. Fallback para buscar via agent_telemarketing_mapping se sessão falhar

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/portal-telemarketing/PortalTelemarketingWhatsApp.tsx` | Integrar conversas convidadas na lista |
| `src/hooks/useTelemarketingConversations.ts` | Adicionar parâmetro opcional para incluir convites |
| `src/hooks/useWhatsAppNotifications.ts` | Adicionar diagnóstico e fallback de sessão |

---

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│ ANTES (quebrado):                                                │
│                                                                  │
│ Paulo convida Vitória → Notificação criada no banco              │
│                      → Vitória não vê (sessão expirada OU        │
│                         hook não buscou convites)                │
└─────────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DEPOIS (corrigido):                                              │
│                                                                  │
│ Paulo convida Vitória → Notificação criada + Realtime dispara    │
│                      → Hook verifica sessão, tenta refresh       │
│                      → Sino mostra badge com contagem            │
│                      → Lista de conversas inclui "Convidadas"    │
│                      → Vitória vê conversa com badge "Convidada" │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Integração de Conversas Convidadas

```typescript
// Em PortalTelemarketingWhatsApp.tsx
import { useMyInvitedConversations } from '@/hooks/useMyInvitedConversations';

// No componente:
const { data: invitedConversations = [] } = useMyInvitedConversations();

// Mesclar com a lista principal
const allConversations = useMemo(() => {
  const invitedAsConv = invitedConversations.map(inv => ({
    lead_id: parseInt(inv.bitrix_id || '0', 10),
    bitrix_id: inv.bitrix_id || '',
    lead_name: `Conversa ${inv.phone_number}`,
    phone_number: inv.phone_number,
    // ... outros campos
    isInvited: true,
    inviterName: inv.inviter_name,
    priority: inv.priority,
  }));
  
  // Evitar duplicatas (já está na lista normal E foi convidado)
  const existingPhones = new Set(conversations.map(c => c.phone_number));
  const onlyInvited = invitedAsConv.filter(c => !existingPhones.has(c.phone_number));
  
  return [...conversations, ...onlyInvited];
}, [conversations, invitedConversations]);
```

### Fallback de Sessão para Notificações

```typescript
// Em useWhatsAppNotifications.ts
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  console.warn('[Notifications] No authenticated user, attempting session refresh...');
  
  // Tentar refresh
  const { data: refreshData } = await supabase.auth.refreshSession();
  
  if (!refreshData?.session?.user) {
    console.error('[Notifications] Session refresh failed - notifications will not load');
    return [];
  }
  
  // Usar usuário do refresh
  return await fetchNotificationsFor(refreshData.session.user.id);
}
```

---

## Impacto Esperado

1. **Notificações visíveis**: Vitória verá o sino com badge ao receber convites
2. **Conversas acessíveis**: Conversas convidadas aparecerão na lista com destaque
3. **Colaboração funcional**: Sistema de convites funcionará end-to-end no Portal
4. **Diagnóstico melhorado**: Logs ajudarão a identificar problemas de sessão

---

## Teste de Validação

Após implementação:
1. Paulo convida Vitória para uma nova conversa
2. Vitória deve ver badge no sino imediatamente
3. Ao clicar, conversa deve aparecer na lista
4. Conversa deve ter indicador "Convidada por Paulo"
