
# Sistema de Notificações e Mensagens Internas para WhatsApp Telemarketing

## Problemas Identificados

### 1. Notificações Não Chegam para Operadores do Telemarketing
**Causa raiz**: O sistema de notificações (`whatsapp_operator_notifications`) usa o `operator_id` que é um UUID da tabela `profiles`. Quando um admin convida um agente, ele está buscando na tabela `profiles` e criando notificações com esse UUID. Porém, os operadores de telemarketing logados via `/portal-telemarketing` podem não ter a sininho de notificações visível nessa rota - a página `PortalTelemarketingWhatsApp.tsx` não tem o componente `WhatsAppNotificationBell`.

### 2. Falta de Notificações no Portal de Telemarketing
A página `/portal-telemarketing/whatsapp` não possui o componente de sino de notificações (`WhatsAppNotificationBell`), então mesmo que a notificação seja criada no banco, o operador não a vê.

### 3. Falta de Mensagens Internas (Anônimas)
Não existe um sistema de "mensagens internas" entre agentes. Toda mensagem enviada vai para o cliente. Precisamos criar um canal de comunicação interno que:
- Não seja enviado ao cliente (não passa pelo Gupshup)
- Fique visível apenas para operadores participantes
- Permita comunicação sobre o atendimento

### 4. Resolução Sem Histórico
Quando um agente convidado marca como "resolvido", ele é simplesmente removido da tabela de participantes. Não há registro do que foi resolvido ou notas - o campo `notes` no dialog existe mas não é salvo.

### 5. Nome do Agente nas Mensagens
As mensagens já mostram `sender_name`, mas precisamos garantir que o nome correto do operador de telemarketing apareça.

---

## Plano de Implementação

### Parte 1: Adicionar Sino de Notificações no Portal Telemarketing

**Arquivo**: `src/pages/portal-telemarketing/PortalTelemarketingWhatsApp.tsx`

1. Importar o componente `WhatsAppNotificationBell`
2. Adicionar no header da página
3. Implementar handler para quando clicar na notificação, abrir a conversa correspondente

**Código a adicionar no header (após linha ~400)**:
```tsx
import { WhatsAppNotificationBell } from '@/components/whatsapp/WhatsAppNotificationBell';

// No header, após o Badge de Supervisor:
<WhatsAppNotificationBell 
  onNotificationClick={(phoneNumber, bitrixId) => {
    // Buscar ou criar objeto de conversa e selecionar
    const conv = conversations.find(c => 
      c.phone_number?.replace(/\D/g, '') === phoneNumber.replace(/\D/g, '')
    );
    if (conv) {
      setSelectedConversation(conv);
    } else {
      // Criar objeto mínimo para abrir conversa
      setSelectedConversation({
        lead_id: parseInt(bitrixId || '0', 10),
        bitrix_id: bitrixId || '',
        lead_name: phoneNumber,
        phone_number: phoneNumber,
        // ... outros campos
      });
    }
  }}
/>
```

---

### Parte 2: Sistema de Mensagens Internas (Notas entre Agentes)

#### 2.1 Criar nova tabela para notas internas

**Migration SQL**:
```sql
CREATE TABLE whatsapp_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  bitrix_id TEXT,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Opcional: destinatário específico (NULL = todos os participantes)
  target_operator_id UUID REFERENCES profiles(id)
);

-- Índices
CREATE INDEX idx_internal_notes_phone ON whatsapp_internal_notes(phone_number);
CREATE INDEX idx_internal_notes_created ON whatsapp_internal_notes(created_at DESC);

-- RLS
ALTER TABLE whatsapp_internal_notes ENABLE ROW LEVEL SECURITY;

-- Política: participantes podem ver notas da conversa
CREATE POLICY "Participantes podem ver notas" ON whatsapp_internal_notes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM whatsapp_conversation_participants p
    WHERE p.phone_number = whatsapp_internal_notes.phone_number
    AND p.operator_id = auth.uid()
  )
  OR
  author_id = auth.uid()
);

-- Política: usuários autenticados podem criar notas
CREATE POLICY "Usuários podem criar notas" ON whatsapp_internal_notes
FOR INSERT WITH CHECK (auth.uid() = author_id);
```

#### 2.2 Criar hook para gerenciar notas internas

**Novo arquivo**: `src/hooks/useInternalNotes.ts`
```typescript
// Funções:
// - useInternalNotes(phoneNumber): buscar notas
// - useSendInternalNote(): criar nova nota
// - Realtime subscription para novas notas
```

#### 2.3 Adicionar aba ou seção de notas internas no chat

**Arquivo**: `src/components/whatsapp/WhatsAppChatContainer.tsx`

Adicionar uma nova aba "Notas Internas" ou um botão que abre um painel lateral/modal onde agentes podem:
- Ver histórico de notas entre participantes
- Adicionar nova nota (não enviada ao cliente)
- Notificar outros participantes

---

### Parte 3: Resolver com Notas (Histórico de Resolução)

#### 3.1 Criar tabela de histórico de resolução

**Migration SQL**:
```sql
CREATE TABLE whatsapp_participation_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  bitrix_id TEXT,
  operator_id UUID REFERENCES profiles(id) NOT NULL,
  operator_name TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID,
  inviter_name TEXT,
  priority INTEGER
);

CREATE INDEX idx_resolutions_phone ON whatsapp_participation_resolutions(phone_number);
CREATE INDEX idx_resolutions_date ON whatsapp_participation_resolutions(resolved_at DESC);

-- RLS
ALTER TABLE whatsapp_participation_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes podem ver resoluções" ON whatsapp_participation_resolutions
FOR SELECT USING (true); -- Público para participantes verem histórico

CREATE POLICY "Usuários podem criar" ON whatsapp_participation_resolutions
FOR INSERT WITH CHECK (auth.uid() = operator_id);
```

#### 3.2 Atualizar hook de resolução

**Arquivo**: `src/hooks/useMyParticipation.ts`

Modificar `useResolveMyParticipation` para:
1. Salvar as notas na nova tabela antes de deletar
2. Copiar dados do participante (invited_by, priority, etc.)

```typescript
mutationFn: async ({ phoneNumber, participationId, notes }) => {
  // 1. Buscar dados do participante antes de deletar
  const { data: participation } = await supabase
    .from('whatsapp_conversation_participants')
    .select('*')
    .eq('id', participationId)
    .single();
  
  // 2. Inserir histórico de resolução
  await supabase.from('whatsapp_participation_resolutions').insert({
    phone_number: phoneNumber,
    bitrix_id: participation?.bitrix_id,
    operator_id: user.id,
    operator_name: profile?.display_name,
    resolution_notes: notes,
    invited_by: participation?.invited_by,
    inviter_name: participation?.inviter_name,
    priority: participation?.priority,
  });
  
  // 3. Deletar participação
  await supabase
    .from('whatsapp_conversation_participants')
    .delete()
    .eq('id', participationId);
}
```

#### 3.3 Mostrar histórico de resoluções

Criar componente `ResolutionHistory` que mostra quem já resolveu e o que foi feito, visível para todos os participantes da conversa.

---

### Parte 4: Garantir Nome do Agente nas Mensagens

O sistema já salva `sender_name` nas mensagens. Precisamos garantir que:

1. No edge function `gupshup-send-message`, o nome do operador seja buscado corretamente
2. Na exibição (`WhatsAppMessageBubble.tsx`), o nome apareça claramente

**Verificar/Atualizar**: `supabase/functions/gupshup-send-message/index.ts`
- Buscar nome do operador pelo `user.id` na tabela `profiles` ou `agent_telemarketing_mapping`

---

## Resumo de Arquivos a Modificar/Criar

### Novos Arquivos:
| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useInternalNotes.ts` | Hook para notas internas entre agentes |
| `src/components/whatsapp/InternalNotesPanel.tsx` | Painel de notas internas |
| `src/components/whatsapp/ResolutionHistory.tsx` | Histórico de resoluções |

### Arquivos a Modificar:
| Arquivo | Alteração |
|---------|-----------|
| `src/pages/portal-telemarketing/PortalTelemarketingWhatsApp.tsx` | Adicionar sino de notificações |
| `src/hooks/useMyParticipation.ts` | Salvar notas de resolução |
| `src/components/whatsapp/ResolveParticipationDialog.tsx` | Passar notas para o hook |
| `src/components/whatsapp/WhatsAppChatContainer.tsx` | Adicionar aba/botão de notas internas |
| `src/components/whatsapp/WhatsAppHeader.tsx` | Mostrar histórico de resoluções |

### Migrations (Backend):
1. Criar tabela `whatsapp_internal_notes`
2. Criar tabela `whatsapp_participation_resolutions`
3. Habilitar realtime para notas internas

---

## Fluxo Após Implementação

```text
1. Admin em /whatsapp convida operador de telemarketing
   ↓
2. Notificação criada em whatsapp_operator_notifications
   ↓
3. Operador em /portal-telemarketing/whatsapp vê sino com badge
   ↓
4. Operador clica → abre conversa do cliente
   ↓
5. Operador pode:
   - Responder cliente (mensagem normal - vai pelo Gupshup)
   - Enviar nota interna (não vai para cliente)
   ↓
6. Ao resolver, operador clica "Resolvido"
   ↓
7. Dialog pede notas → salva em whatsapp_participation_resolutions
   ↓
8. Operador original vê histórico: "Fulano resolveu: [notas]"
   ↓
9. Operador original continua atendimento com contexto
```

---

## Detalhes Técnicos

### Notificações Realtime
O hook `useWhatsAppNotifications` já tem subscription realtime para `INSERT` em `whatsapp_operator_notifications`. Só precisamos adicionar o componente na página.

### Notas Internas vs Mensagens
As notas internas ficam em tabela separada (`whatsapp_internal_notes`) e nunca passam pelo Gupshup. São renderizadas com estilo diferente (ex: fundo amarelo, ícone de nota) para diferenciar de mensagens reais.

### Identificação do Operador
O sistema usa `agent_telemarketing_mapping` para vincular:
- `tabuladormax_user_id` (UUID do profiles) → `bitrix_telemarketing_id`
- Isso permite buscar o nome do operador para exibir nas mensagens
