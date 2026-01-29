
# Correção: Central de Atendimento com Mensagens Misturadas e Faltando

## Problemas Identificados

### Problema 1: Mensagens de Outros Clientes Aparecendo
No hook `useWhatsAppMessages.ts`, a subscription realtime tem uma falha crítica:

```typescript
filter: bitrixId 
  ? `bitrix_id=eq.${bitrixId}` 
  : conversationId 
    ? `conversation_id=eq.${conversationId}` 
    : undefined,  // ← PROBLEMA! Sem filtro = recebe TUDO
```

Quando a conversa é identificada apenas por `phoneNumber` (sem `bitrixId` ou `conversationId`), o filtro é `undefined`. Isso faz com que o Supabase Realtime envie **todas** as mensagens de **todas** as conversas para esse cliente.

### Problema 2: Mensagens Não Chegando (indireto)
Como mensagens de outras conversas estão chegando, o operador pode não perceber as mensagens corretas, ou o componente pode estar em estado inconsistente.

---

## Solução

### Correção do Filtro Realtime

Modificar a subscription para **sempre** incluir um filtro por `phone_number`:

```typescript
filter: phoneNumber
  ? `phone_number=eq.${phoneNumber.replace(/\D/g, '')}`
  : bitrixId 
    ? `bitrix_id=eq.${bitrixId}` 
    : conversationId 
      ? `conversation_id=eq.${conversationId}` 
      : undefined,
```

### Validação Adicional no Handler

Mesmo com o filtro correto, adicionar validação no handler para garantir que a mensagem pertence à conversa atual:

```typescript
if (payload.eventType === 'INSERT') {
  const newMsg = payload.new as WhatsAppMessage;
  
  // Validar que a mensagem pertence à conversa atual
  const normalizedPhone = phoneNumber?.replace(/\D/g, '');
  const msgPhone = newMsg.phone_number?.replace(/\D/g, '');
  
  if (normalizedPhone && msgPhone !== normalizedPhone) {
    console.log('⚠️ Mensagem ignorada: telefone diferente', { expected: normalizedPhone, received: msgPhone });
    return;
  }
  
  // Evitar duplicatas
  setMessages(prev => {
    if (prev.some(m => m.id === newMsg.id || m.gupshup_message_id === newMsg.gupshup_message_id)) {
      return prev;
    }
    return [...prev, newMsg];
  });
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useWhatsAppMessages.ts` | Corrigir filtro realtime + validação de mensagens |

---

## Detalhes Técnicos

### Por que o problema ocorre?

O Supabase Realtime permite filtros simples no formato `coluna=eq.valor`. Quando o filtro é `undefined`, a subscription recebe **todos** os eventos da tabela.

A lógica atual prioriza `bitrixId` > `conversationId` > nada. Mas muitas conversas na Central de Atendimento são identificadas apenas por `phoneNumber`, especialmente conversas que:
- Vieram de contatos sem lead cadastrado
- Foram criadas antes da vinculação com Bitrix
- Têm `bitrix_id` nulo na tabela de mensagens

### Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│ ANTES (bugado):                                                  │
│                                                                  │
│ Operador abre conversa com phone: 5511999998888                  │
│ ├── bitrixId: undefined                                          │
│ ├── conversationId: undefined                                    │
│ └── filter: undefined ← RECEBE TODAS AS MENSAGENS!               │
└─────────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DEPOIS (corrigido):                                              │
│                                                                  │
│ Operador abre conversa com phone: 5511999998888                  │
│ ├── phoneNumber: 5511999998888                                   │
│ └── filter: phone_number=eq.5511999998888 ← APENAS ESSA CONVERSA│
└─────────────────────────────────────────────────────────────────┘
```

---

## Impacto da Correção

1. **Mensagens de outros clientes**: Não aparecerão mais em conversas erradas
2. **Performance**: Menos dados trafegando via WebSocket
3. **Segurança**: Operadores só verão mensagens das conversas que abriram
4. **UX**: Não será mais necessário sair e voltar para "limpar" mensagens incorretas
