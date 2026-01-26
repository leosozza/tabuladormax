
# Correção do Timestamp na Lista de Conversas - Problema de CSS

## Diagnóstico

Após investigação detalhada:

1. **Dados estão corretos** - O RPC `get_admin_whatsapp_conversations` retorna `last_message_at` com valores válidos (ex: `"2026-01-26T19:07:48.384923+00:00"`)
2. **Hook está mapeando corretamente** - O campo é passado para o componente
3. **O problema é CSS** - O layout flexbox está permitindo que o nome empurre o timestamp para fora da área visível

## Causa Raiz

O layout atual:
```tsx
<div className="flex items-center justify-between gap-2">
  <span className="font-medium truncate flex-1 min-w-0">  <!-- Expande sem limite -->
    {getDisplayTitle(conv)}
  </span>
  <span className="text-xs text-foreground/60 whitespace-nowrap shrink-0">  <!-- Não tem largura mínima -->
    {formatShortTime(...)}
  </span>
</div>
```

O problema: `flex-1` no nome faz ele ocupar todo espaço disponível, e apesar do `shrink-0` no timestamp, o container pai pode estar sendo comprimido pelo layout externo.

---

## Solução

### Alteração em `AdminConversationList.tsx`

**Linha ~535-542** - Ajustar o layout da Row 1:

```tsx
{/* Row 1: Name + Timestamp */}
<div className="flex items-center gap-2 w-full">
  <span className="font-medium truncate min-w-0 flex-1">
    {getDisplayTitle(conv)}
  </span>
  <span className="text-xs text-foreground/60 whitespace-nowrap shrink-0 min-w-fit">
    {conv.last_message_at ? formatShortTime(conv.last_message_at) : ''}
  </span>
</div>
```

### Mudanças específicas:

| Elemento | Antes | Depois |
|----------|-------|--------|
| Container | `justify-between` | `gap-2 w-full` (remove justify-between) |
| Nome | `truncate flex-1 min-w-0` | `truncate min-w-0 flex-1` (mesmo, ordem ajustada) |
| Timestamp | `shrink-0` | `shrink-0 min-w-fit` (adiciona min-w-fit) |

### Por que funciona:

1. **`min-w-fit`** no timestamp garante que ele nunca seja menor que seu conteúdo natural
2. **`w-full`** no container garante que ele use toda a largura disponível
3. O nome com `flex-1` preenche o espaço restante, mas o `min-w-fit` do timestamp tem prioridade
4. `truncate` no nome corta com "..." quando necessário

---

## Arquivo a Modificar

- `src/components/whatsapp/AdminConversationList.tsx` (linhas 535-542)

---

## Resultado Esperado

```text
┌─────────────────────────────────────────┐
│ [L]  Lara                        16:08 │
│  ●   → [Template enviado via...         │
│      5511936666...                       │
│      [StandBy]                           │
└─────────────────────────────────────────┘
```

O timestamp (16:08) sempre aparecerá no canto direito, mesmo quando o nome for longo.
