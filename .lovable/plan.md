
# Sistema Avançado de Gestão de Conversas WhatsApp

## Resumo das Funcionalidades

Este plano adiciona 4 novas funcionalidades à Central de Atendimento:

1. **Status "Em Atendimento"** - Automático quando agente humano responde
2. **Sistema de Etiquetas** - Tags coloridas para categorizar conversas
3. **Prioridade de Atendimento** - Nível 0-5 ao convidar agentes
4. **Destaque de Convites** - Indicador visual para conversas onde o agente foi convidado

---

## 1. Novo Status "Em Atendimento"

### Lógica
- Quando um operador humano envia uma mensagem (`sent_by = 'operador'`), a conversa automaticamente muda para status `in_progress`
- Novo filtro no dropdown de "Status de Resposta"

### Alteracoes no Banco
```text
Nova coluna em mv_whatsapp_conversation_stats:
- attendance_status: 'idle' | 'in_progress' | 'waiting' | 'closed'

Trigger: Ao detectar mensagem outbound de operador humano, 
marca a conversa como 'in_progress'
```

### Filtro no Frontend
Adicionar opção ao filtro de Response:
- Todas
- Aguardando
- Sem resposta  
- Respondeu
- **Em Atendimento** (novo)

---

## 2. Sistema de Etiquetas (Tags)

### Nova Tabela: `whatsapp_conversation_tags`
```text
id: UUID
name: TEXT (ex: "Urgente", "VIP", "Reclamação")
color: TEXT (ex: "#FF5733", "#3B82F6")
created_by: UUID (referência ao operador)
created_at: TIMESTAMP
```

### Nova Tabela: `whatsapp_conversation_tag_assignments`
```text
id: UUID
phone_number: TEXT
bitrix_id: TEXT (nullable)
tag_id: UUID (referência à tag)
assigned_by: UUID
assigned_at: TIMESTAMP
```

### Interface
- Botão de etiqueta no header da conversa
- Modal para selecionar/criar etiquetas
- Tags exibidas na lista de conversas (badges coloridos)
- Filtro por etiqueta na lista

---

## 3. Prioridade de Atendimento

### Alteração na Tabela `whatsapp_conversation_participants`
```text
Nova coluna: priority INTEGER DEFAULT 0 (0-5)
```

### Interface de Convite
- Slider ou select para escolher prioridade (0-5)
- 0 = Baixa, 5 = Urgente
- Exibir na notificação do agente

### Lista de Conversas
- Badge visual indicando prioridade (cores: cinza -> vermelho)
- Ordenação opcional por prioridade

---

## 4. Destaque de Convites para Agentes

### Lógica
- Quando um agente é convidado, a conversa aparece destacada na sua lista
- Mostrar badge "Você foi convidado" + nome de quem convidou

### Implementação

**Nova Query/Hook**: `useMyInvitedConversations`
- Busca conversas onde o operador logado está em `whatsapp_conversation_participants`

**Visual na Lista**:
```text
┌────────────────────────────────────────────────┐
│ 🔔 CONVIDADO POR: João Silva                   │
│ ├─ [Avatar] Nome do Cliente    🟢2   14:30    │
│ │           5535991234567                      │
│ │           [StandBy] [🔴 Prioridade: 5]       │
│ └────────────────────────────────────────────  │
└────────────────────────────────────────────────┘
```

### Alteração na Tabela de Participantes
```text
Adicionar: inviter_name TEXT (desnormalizado para performance)
```

---

## Arquivos a Criar/Modificar

### Banco de Dados (Migrations)
| Arquivo | Descrição |
|---------|-----------|
| Nova migration | Criar tabelas de tags e assignments |
| Nova migration | Adicionar `priority` e `inviter_name` em participants |
| Atualizar MV | Adicionar `attendance_status` na materialized view |
| Atualizar RPCs | Incluir dados de convite e prioridade |

### Frontend - Novos Componentes
| Componente | Descrição |
|------------|-----------|
| `ConversationTagsManager.tsx` | Modal para gerenciar etiquetas |
| `TagBadge.tsx` | Badge colorido de etiqueta |
| `PrioritySelector.tsx` | Seletor de prioridade 0-5 |
| `InvitedBadge.tsx` | Indicador de convite |

### Frontend - Modificações
| Arquivo | Alteração |
|---------|-----------|
| `useAdminWhatsAppConversations.ts` | Adicionar campos de prioridade e convite |
| `InviteAgentDialog.tsx` | Adicionar seletor de prioridade |
| `AdminConversationList.tsx` | Exibir tags, prioridade e destaque de convite |
| `WhatsAppHeader.tsx` | Botão de gerenciar etiquetas |

### Hooks Novos
| Hook | Descrição |
|------|-----------|
| `useConversationTags.ts` | CRUD de etiquetas |
| `useMyInvitedConversations.ts` | Conversas onde fui convidado |

---

## Fluxo de Dados

```text
1. Agente A convida Agente B para conversa com Cliente X
   ↓
2. Agente A seleciona prioridade (ex: 4 - Alta)
   ↓
3. Sistema insere em whatsapp_conversation_participants:
   - operator_id: B
   - invited_by: A
   - inviter_name: "Agente A"
   - priority: 4
   ↓
4. Sistema cria notificação para Agente B
   ↓
5. Agente B vê conversa destacada na sua lista:
   - Badge "Convidado por: Agente A"
   - Badge de prioridade vermelho (4)
   ↓
6. Agente B responde → status muda para "Em Atendimento"
```

---

## Estimativa de Complexidade

| Funcionalidade | Complexidade | Prioridade |
|----------------|--------------|------------|
| Status "Em Atendimento" | Média | Alta |
| Sistema de Etiquetas | Alta | Média |
| Prioridade de Atendimento | Baixa | Alta |
| Destaque de Convites | Média | Alta |

**Total estimado**: ~4-5 iterações de desenvolvimento

---

## Considerações de Performance

1. **Desnormalização**: Armazenar `inviter_name` diretamente para evitar JOINs extras
2. **Índices**: Criar índices em `tag_id`, `phone_number` para buscas rápidas
3. **Cache**: Usar React Query com `staleTime` adequado para tags (raramente mudam)
4. **Materialized View**: Atualizar MV para incluir contagem de tags e status de atendimento
