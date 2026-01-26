
# Considerar Treinamento do Agente ao Gerar Resposta de IA no WhatsApp

## Problema Identificado

O sistema de geração de IA no `/whatsapp` não está usando os treinamentos vinculados ao agente do usuário porque:

1. **Na página `/whatsapp` (admin)**: O `operatorBitrixId` **não é passado** para o `WhatsAppChatContainer`
2. **O hook `useWhatsAppAI`**: Só aceita `operatorBitrixId`, **não aceita `profileId`**
3. **A edge function `whatsapp-ai-assist`**: Já suporta tanto `operatorBitrixId` quanto `profileId`, mas o hook não está passando o `profileId`

O resultado é que usuários admin (como Fabio e Paulo) não têm seus agentes vinculados detectados porque a requisição vai sem nenhum identificador.

---

## Solução

Modificar o fluxo para **automaticamente obter o `profileId` do usuário logado** quando o `operatorBitrixId` não estiver disponível.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useWhatsAppAI.ts` | Adicionar `profileId` como parâmetro e buscar automaticamente do usuário logado |
| `src/components/whatsapp/WhatsAppInput.tsx` | Adicionar `profileId` nas props e passar para o hook |
| `src/components/whatsapp/WhatsAppChatContainer.tsx` | Buscar `profileId` do usuário logado e passar para `WhatsAppInput` |
| `src/pages/WhatsApp.tsx` | Não precisa alteração (o `profileId` será obtido no `WhatsAppChatContainer`) |

---

## Alterações Detalhadas

### 1. Modificar o hook `useWhatsAppAI`

**Arquivo:** `src/hooks/useWhatsAppAI.ts`

Adicionar `profileId` como parâmetro alternativo:

```typescript
interface UseWhatsAppAIReturn {
  generateResponse: (
    messages: Message[], 
    context?: string, 
    operatorBitrixId?: number,
    profileId?: string  // NOVO
  ) => Promise<GenerateResponseResult>;
  improveText: (
    text: string, 
    context?: string, 
    operatorBitrixId?: number,
    profileId?: string  // NOVO
  ) => Promise<string | null>;
  isGenerating: boolean;
  isImproving: boolean;
}

// Na chamada da edge function:
const { data, error } = await supabase.functions.invoke('whatsapp-ai-assist', {
  body: {
    action: 'generate',
    messages: messages.slice(-10).map(m => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content,
    })),
    context,
    operatorBitrixId,
    profileId,  // NOVO - enviar profileId também
  },
});
```

---

### 2. Modificar `WhatsAppInput`

**Arquivo:** `src/components/whatsapp/WhatsAppInput.tsx`

Adicionar `profileId` nas props:

```typescript
interface WhatsAppInputProps {
  // ... props existentes
  operatorBitrixId?: number;
  profileId?: string;  // NOVO
}

// Ao chamar generateResponse e improveText:
const result = await generateResponse(chatMessages, undefined, operatorBitrixId, profileId);
const improved = await improveText(messageInput, undefined, operatorBitrixId, profileId);
```

---

### 3. Modificar `WhatsAppChatContainer`

**Arquivo:** `src/components/whatsapp/WhatsAppChatContainer.tsx`

Buscar o `profileId` do usuário logado e passar para o `WhatsAppInput`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Dentro do componente:
const [currentUserId, setCurrentUserId] = useState<string | undefined>();

useEffect(() => {
  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id);
  };
  getUser();
}, []);

// Passar para WhatsAppInput:
<WhatsAppInput
  // ... props existentes
  operatorBitrixId={operatorBitrixId}
  profileId={currentUserId}  // NOVO
/>
```

---

## Fluxo Final

```text
┌─────────────────────────────────────────────────────────┐
│                    /whatsapp (Admin)                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Usuário logado: Fabio (contato@maxfama.com.br)        │
│                                                         │
│  1. WhatsAppChatContainer busca user.id                │
│     → profileId: "uuid-do-fabio"                       │
│                                                         │
│  2. WhatsAppInput recebe profileId                     │
│                                                         │
│  3. Ao clicar "Gerar resposta com IA":                 │
│     → useWhatsAppAI.generateResponse(..., profileId)   │
│                                                         │
│  4. Edge function recebe profileId                     │
│     → Busca agent_operator_assignments.profile_id      │
│     → Encontra agente vinculado ao Fabio               │
│     → Carrega treinamentos do agente                   │
│     → Gera resposta personalizada                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Compatibilidade

- **Portal Telemarketing**: Continua funcionando normalmente com `operatorBitrixId`
- **WhatsApp Admin**: Passa a funcionar com `profileId` do usuário logado
- **WhatsApp Modal**: Passa a funcionar com `profileId` do usuário logado

A edge function já suporta ambos os identificadores, então nenhuma alteração é necessária no backend.

---

## Resumo das Mudanças

1. **Hook `useWhatsAppAI`**: Aceitar e enviar `profileId` na requisição
2. **`WhatsAppInput`**: Receber `profileId` via props e passar para o hook
3. **`WhatsAppChatContainer`**: Buscar `user.id` do usuário logado e passar como `profileId`

Com essas alterações, qualquer usuário que estiver vinculado a um agente de IA (seja por `bitrix_id` ou `profile_id`) terá as instruções de treinamento do agente aplicadas ao gerar respostas.
