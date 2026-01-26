

# Vincular Usuarios a Agentes de IA - Correcoes e Melhorias

## Problema Identificado

Os usuarios `contato@maxfama.com.br` (Fabio) e `paulo.ybrasil@gmail.com` (Paulo) nao possuem `bitrix_telemarketing_id` no banco de dados. O sistema atual **exige** que o usuario tenha um operador Bitrix vinculado para poder ser associado a um agente de IA.

**Dados atuais no banco:**
```
contato@maxfama.com.br  -> bitrix_telemarketing_id: NULL
paulo.ybrasil@gmail.com -> bitrix_telemarketing_id: NULL
```

## Solucao Proposta

### 1. Modificar a tabela `agent_operator_assignments`

Atualmente a tabela usa `operator_bitrix_id` (INTEGER) para vincular. Precisamos adicionar uma coluna alternativa `profile_id` (UUID) para permitir vincular usuarios que nao tem Bitrix.

```sql
ALTER TABLE public.agent_operator_assignments
ADD COLUMN profile_id UUID REFERENCES public.profiles(id);

-- Criar indice para buscas
CREATE INDEX idx_agent_operator_assignments_profile_id 
ON public.agent_operator_assignments(profile_id);

-- Permitir vincular por profile_id OU operator_bitrix_id
ALTER TABLE public.agent_operator_assignments
ADD CONSTRAINT check_assignment_target 
CHECK (profile_id IS NOT NULL OR operator_bitrix_id IS NOT NULL);
```

### 2. Modificar funcoes de vinculacao

**Arquivo:** `src/hooks/useAIAgents.ts`

Atualizar a funcao `assignOperator` para aceitar `profileId` como alternativa:

```typescript
const assignOperator = useCallback(async (
  agentId: string, 
  operatorBitrixId?: number,
  profileId?: string
) => {
  // Deactivar assignments existentes
  if (operatorBitrixId) {
    await supabase
      .from('agent_operator_assignments')
      .update({ is_active: false })
      .eq('operator_bitrix_id', operatorBitrixId);
  }
  if (profileId) {
    await supabase
      .from('agent_operator_assignments')
      .update({ is_active: false })
      .eq('profile_id', profileId);
  }

  // Criar novo assignment
  const { error } = await supabase
    .from('agent_operator_assignments')
    .insert({
      agent_id: agentId,
      operator_bitrix_id: operatorBitrixId || null,
      profile_id: profileId || null,
      // ...
    });
};
```

### 3. Atualizar pagina de Usuarios

**Arquivo:** `src/pages/admin/Users.tsx`

#### 3.1 Corrigir funcao `getAssignedAgent`

```typescript
const getAssignedAgent = (user: UserWithRole) => {
  // Buscar por telemarketing_id OU por profile_id
  const assignment = aiAssignments.find(a => 
    (user.telemarketing_id && a.operator_bitrix_id === user.telemarketing_id) ||
    (a.profile_id === user.id)
  );
  return assignment?.agent || null;
};
```

#### 3.2 Remover restricao de Bitrix

```typescript
const openEditAIAgentDialog = (user: UserWithRole) => {
  // REMOVER esta verificacao:
  // if (!user.telemarketing_id) {
  //   toast.error('Este usuário não tem operador Bitrix vinculado');
  //   return;
  // }
  
  setEditingAIAgentUser(user);
  const currentAgent = getAssignedAgent(user);
  setSelectedAIAgentId(currentAgent?.id || "none");
  setEditAIAgentDialogOpen(true);
};
```

#### 3.3 Atualizar funcao `handleSaveAIAgent`

```typescript
const handleSaveAIAgent = async () => {
  if (!editingAIAgentUser) return;
  
  const operatorId = editingAIAgentUser.telemarketing_id || undefined;
  const profileId = !operatorId ? editingAIAgentUser.id : undefined;
  
  setSavingAIAgent(true);
  try {
    if (selectedAIAgentId === "none") {
      // Desvincular
      const currentAssignment = aiAssignments.find(a => 
        (operatorId && a.operator_bitrix_id === operatorId) ||
        (profileId && a.profile_id === profileId)
      );
      if (currentAssignment) {
        await unassignOperator(currentAssignment.id);
      }
    } else {
      // Vincular
      await assignOperator(selectedAIAgentId, operatorId, profileId);
    }
    // ...
  }
};
```

### 4. Adicionar Vinculacao em Lote

**Arquivo:** `src/pages/admin/Users.tsx`

#### 4.1 Adicionar ao menu de edicao em lote

```typescript
const handleBatchEditFieldChange = async (field: 'project' | 'supervisor' | 'role' | 'department' | 'ai_agent') => {
  // ... codigo existente ...
  
  if (field === 'ai_agent') {
    // Carregar agentes disponiveis (ja carregado pelo hook)
  }
};
```

#### 4.2 Adicionar opcao "Agente IA" no dialog de batch edit

```tsx
<SelectItem value="ai_agent">Agente de IA</SelectItem>

{batchEditField === 'ai_agent' && (
  <Select value={batchEditValue} onValueChange={setBatchEditValue}>
    <SelectTrigger>
      <SelectValue placeholder="Selecione um agente" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Nenhum (remover vinculo)</SelectItem>
      {aiAgents.filter(a => a.is_active).map(agent => (
        <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

#### 4.3 Implementar funcao de vinculo em lote

```typescript
const handleBatchEdit = async () => {
  // ... codigo existente ...
  
  if (batchEditField === 'ai_agent') {
    const selectedUsers = users.filter(u => selectedUserIds.has(u.id));
    
    for (const user of selectedUsers) {
      const operatorId = user.telemarketing_id || undefined;
      const profileId = !operatorId ? user.id : undefined;
      
      if (batchEditValue === "none") {
        // Desvincular
        const assignment = aiAssignments.find(a => 
          (operatorId && a.operator_bitrix_id === operatorId) ||
          (profileId && a.profile_id === profileId)
        );
        if (assignment) {
          await unassignOperator(assignment.id);
        }
      } else {
        // Vincular
        await assignOperator(batchEditValue, operatorId, profileId);
      }
    }
    
    toast.success(`Agente IA atualizado para ${selectedUsers.length} usuario(s)`);
  }
};
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Migration SQL | Adicionar coluna `profile_id` |
| `src/hooks/useAIAgents.ts` | Atualizar funcoes para suportar `profile_id` |
| `src/pages/admin/Users.tsx` | Remover restricao de Bitrix + adicionar batch edit |
| `supabase/functions/whatsapp-ai-assist` | Buscar agente por `profile_id` tambem |

---

## Fluxo Final

```text
┌─────────────────────────────────────────────────────────┐
│                    /admin/users                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [✓] contato@maxfama.com.br  Fabio     [Agente IA: -]  │
│  [✓] paulo.ybrasil@gmail.com Paulo     [Agente IA: -]  │
│                                                         │
│  [Editar Selecionados ▼]                               │
│    - Projeto                                            │
│    - Supervisor                                         │
│    - Funcao                                             │
│    - Departamento                                       │
│    - Agente de IA  ◄─── NOVO                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Resumo das Mudancas

1. **Banco de dados**: Nova coluna `profile_id` na tabela `agent_operator_assignments`
2. **Hook**: Suporte a vincular por `profile_id` ou `operator_bitrix_id`
3. **UI Individual**: Remover restricao que exigia Bitrix operator
4. **UI Lote**: Adicionar opcao "Agente de IA" no batch edit
5. **Edge Function**: Buscar agente por ambos os campos

