
# Ajustes na Lista de Conversas - Estilo WhatsApp

## Problemas Identificados

### 1. Timestamp da Última Mensagem
**Situação atual:** O horário aparece na mesma linha do preview da mensagem, pouco visível
**Esperado (como WhatsApp):** Timestamp no canto superior direito, ao lado do nome, bem visível

### 2. Indicador "Sem Resposta"
**Situação atual:** Badge colorido com texto (ex: "Aguardando resposta", "Sem resposta")
**Esperado (como WhatsApp):** Bolinha verde simples indicando mensagens não lidas (como unread indicator)

---

## Solucao Proposta

### Mudanca 1: Reorganizar Layout do Item

Inspirado nas imagens de referencia do WhatsApp:

```text
┌────────────────────────────────────────────────────┐
│ [Avatar]  Nome do Cliente              14:51    │
│    ●      Última mensagem preview...      (2)   │
│           StandBy | Lead respondeu              │
└────────────────────────────────────────────────────┘
```

- Timestamp movido para o canto superior direito (ao lado do nome)
- Badge de nao lidas permanece como está (já está correto)
- Indicador de resposta muda de badge para dot

### Mudanca 2: Substituir Badge de Status por Dot

Em vez de:
```tsx
<span className="text-[10px] px-1.5 py-0.5 rounded...">
  <Icon /> Sem resposta
</span>
```

Usar dot simples:
```tsx
// Dot colorido baseado no status
// Verde = Lead respondeu (resposta recebida)
// Amarelo = Aguardando resposta (esperando cliente)
// Vermelho = Sem resposta (nunca respondeu)
```

---

## Implementacao Tecnica

### Arquivo: `src/components/whatsapp/AdminConversationList.tsx`

**1. Mover timestamp para linha do nome (linhas 378-391)**

Antes:
```tsx
<div className="flex items-center justify-between gap-2">
  <div className="flex flex-col min-w-0">
    <span className="font-medium truncate">
      {conv.deal_title || conv.lead_name || ...}
    </span>
    ...
  </div>
  {conv.unread_count > 0 && (
    <Badge>...</Badge>
  )}
</div>
```

Depois:
```tsx
<div className="flex items-center justify-between gap-2">
  <span className="font-medium truncate flex-1 min-w-0">
    {conv.deal_title || conv.lead_name || ...}
  </span>
  <span className="text-xs text-muted-foreground whitespace-nowrap">
    {formatTime(conv.last_message_at)}
  </span>
</div>
```

**2. Mover badge de nao lidas para linha do preview (linhas 394-402)**

```tsx
<div className="flex items-center justify-between gap-2 mt-0.5">
  <p className="text-xs text-muted-foreground truncate flex-1">
    {conv.last_message_direction === "inbound" ? "← " : "→ "}
    {conv.last_message_preview || "Sem mensagens"}
  </p>
  {conv.unread_count > 0 && (
    <Badge variant="default" className="bg-green-500 h-5 min-w-5">
      {conv.unread_count}
    </Badge>
  )}
</div>
```

**3. Substituir badge de response_status por dot (linhas 439-451)**

Remover o badge atual e adicionar dot ao lado do avatar ou como indicador sutil:

```tsx
// Adicionar dot de status de resposta ao lado do dot de janela
{conv.response_status === 'waiting' && (
  <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-background" />
)}
{conv.response_status === 'never' && (
  <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
)}
```

---

## Resultado Visual Esperado

```text
┌─────────────────────────────────────────────────┐
│ [JN]  Juliana                      há 2 min    │
│  ●    → Template enviado via...         🔴     │
│  ●    5511997000807                             │
│       StandBy                                   │
│       👤 Maria                                  │
└─────────────────────────────────────────────────┘

Legenda:
● (verde inferior) = Janela 24h aberta
🔴 (superior) = Status de resposta (aguardando/sem/respondeu)
ou badge verde com número = mensagens não lidas
```

---

## Cores dos Dots de Status

| Status | Cor | Significado |
|--------|-----|-------------|
| `replied` | Verde (`bg-green-500`) | Lead respondeu |
| `waiting` | Amarelo (`bg-amber-500`) | Aguardando resposta do lead |
| `never` | Vermelho (`bg-red-500`) | Lead nunca respondeu |

---

## Arquivos Alterados

- `src/components/whatsapp/AdminConversationList.tsx` - Único arquivo a ser modificado
