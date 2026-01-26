
# Correção do Timestamp na Lista de Conversas

## Problema Identificado

O timestamp não aparece porque a função `formatDistanceToNow` gera textos longos como:
- "há aproximadamente 2 minutos" (26 caracteres)
- "há cerca de 1 hora" (18 caracteres)

Isso ocupa muito espaço e pode não caber na área disponível, especialmente quando o nome do cliente é longo.

---

## Solução Proposta

### 1. Usar Formato Compacto de Timestamp

Em vez de "há aproximadamente 2 minutos", usar formato curto:
- Menos de 1 hora: `14:30` (horário exato)
- Hoje: `14:30`
- Ontem: `Ontem`
- Esta semana: `Seg`, `Ter`, etc.
- Mais antigo: `12/01`

Este formato é idêntico ao usado no WhatsApp real e ocupa muito menos espaço (máximo 5-6 caracteres).

### 2. Garantir Largura Mínima para o Timestamp

Adicionar `min-w-fit` ao span do timestamp para garantir que ele nunca seja cortado:

```tsx
<span className="text-xs text-foreground/60 whitespace-nowrap shrink-0 min-w-fit">
```

---

## Alterações Técnicas

### Arquivo: `src/components/whatsapp/AdminConversationList.tsx`

**Mudança 1: Nova função `formatShortTime` (substituir `formatTime`)**

```tsx
const formatShortTime = (dateStr: string | null) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Hoje: mostrar horário (14:30)
    if (diffDays === 0 && date.getDate() === now.getDate()) {
      return format(date, 'HH:mm', { locale: ptBR });
    }
    
    // Ontem
    if (diffDays === 1 || (diffDays === 0 && date.getDate() !== now.getDate())) {
      return 'Ontem';
    }
    
    // Esta semana: dia da semana (Seg, Ter, etc)
    if (diffDays < 7) {
      return format(date, 'EEE', { locale: ptBR }); // "seg", "ter"
    }
    
    // Mais antigo: data curta (12/01)
    return format(date, 'dd/MM', { locale: ptBR });
  } catch {
    return "";
  }
};
```

**Mudança 2: Usar `formatShortTime` no JSX**

```tsx
<span className="text-xs text-foreground/60 whitespace-nowrap shrink-0">
  {conv.last_message_at ? formatShortTime(conv.last_message_at) : ''}
</span>
```

---

## Resultado Visual Esperado

```text
┌─────────────────────────────────────────────┐
│ [EL]  Elisângela                   14:30   │
│  ●●   → [Template enviado]                  │
│       5511992223277                         │
│       [Agendados]                           │
│       👤 Hayer Many                         │
└─────────────────────────────────────────────┘
```

O timestamp compacto (14:30, Ontem, Seg, 12/01) sempre caberá no espaço disponível.

---

## Importação Necessária

Adicionar `format` ao import de `date-fns`:

```tsx
import { formatDistanceToNow, format } from 'date-fns';
```

---

## Arquivos a Modificar

- `src/components/whatsapp/AdminConversationList.tsx`
  - Adicionar `format` ao import
  - Criar função `formatShortTime`
  - Substituir chamada de `formatTime` por `formatShortTime`
