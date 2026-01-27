
# Remover Prévia de Mensagem da Listagem de Conversas

## Objetivo

Ocultar completamente a linha de prévia da última mensagem enviada/recebida em todas as listas de conversas, mantendo apenas:
- Nome do contato
- Horário da última mensagem
- Badge de mensagens não lidas

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/whatsapp/AdminConversationList.tsx` | Remover Row 2 (preview) e mover badge para Row 1 |
| `src/pages/portal-telemarketing/PortalTelemarketingWhatsApp.tsx` | Remover exibição do `last_message_preview` |

---

## Alterações Detalhadas

### 1. AdminConversationList.tsx (Central de Atendimento)

**Antes (linhas 540-563):**
```text
Row 1: Nome + Horário
Row 2: Prévia da mensagem + Badge não lidas
```

**Depois:**
```text
Row 1: Nome + Badge não lidas + Horário
(Row 2 removida completamente)
```

Mudanças:
- Remover a div da linha 550-563 que contém `formatPreviewText(conv)`
- Mover o Badge de não lidas para a Row 1, entre o nome e o horário
- Remover a função `formatPreviewText` (não será mais utilizada)

### 2. PortalTelemarketingWhatsApp.tsx (Tabulador)

**Antes (linhas 578-594):**
```text
Row com: Prévia da mensagem + Badge não lidas
```

**Depois:**
```text
Row com: Telefone (sem prévia) + Badge não lidas
```

Mudanças:
- Remover `conv.last_message_preview ||` da exibição
- Mostrar apenas o telefone como fallback (ou etapa do lead)

---

## Layout Final Esperado

```text
┌──────────────────────────────────────────────┐
│ [Avatar]  Nome do Contato    🟢3   14:30     │
│           5535991234567                      │
│           [StandBy]                          │
│           👤 Operador                        │
└──────────────────────────────────────────────┘
```

Onde:
- 🟢3 = Badge verde de mensagens não lidas
- 14:30 = Horário compacto
- Sem linha de prévia da mensagem

---

## Benefícios

- Layout mais limpo e menos poluído
- Não expõe conteúdo das mensagens na listagem
- Mantém informações importantes (hora e contagem de não lidas)
- Consistente em todas as áreas do sistema
