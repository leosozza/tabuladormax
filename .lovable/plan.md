
# Adicionar Gerenciamento de Agentes de IA na Administração

## Visao Geral

Fazer a funcionalidade de Agentes de IA ficar acessivel no menu administrativo e permitir vincular usuarios a agentes diretamente na pagina de usuarios.

---

## Alteracoes Necessarias

### 1. Adicionar opcao no AdminAccessModal

**Arquivo:** `src/components/admin/AdminAccessModal.tsx`

Adicionar novo item no array `adminOptions`:

```typescript
{
  path: '/admin/ai-agents',
  icon: Bot,
  title: 'Agentes de IA',
  description: 'Gerenciar agentes de IA para WhatsApp',
  color: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
},
```

- Importar o icone `Bot` do lucide-react

---

### 2. Registrar rota no banco de dados

**Migracao SQL** para inserir a rota na tabela `app_routes`:

```sql
INSERT INTO app_routes (path, name, description, active)
VALUES ('/admin/ai-agents', 'Agentes de IA', 'Gerenciar agentes de IA para WhatsApp', true)
ON CONFLICT (path) DO NOTHING;
```

Isso garante que o sistema de permissoes reconheca a rota.

---

### 3. Adicionar coluna de Agente de IA na pagina de Usuarios

**Arquivo:** `src/pages/admin/Users.tsx`

**Mudancas:**

| Item | Descricao |
|------|-----------|
| Import | Adicionar hook `useAgentOperatorAssignments` |
| Estado | Adicionar `aiAgents` para lista de agentes |
| Estado | Adicionar dialog de edicao de agente |
| Coluna | Nova coluna "Agente IA" na tabela |
| Acao | Duplo clique para editar agente vinculado |

**Nova coluna na tabela:**
- Mostrar nome do agente vinculado ou "-" se nao houver
- Duplo clique abre dialog para selecionar agente
- Apenas usuarios com `telemarketing_id` (operadores do Bitrix) podem ter agente

**Novo dialog de edicao:**
```typescript
// Dialog para editar agente de IA
<Dialog open={editAIAgentDialogOpen} onOpenChange={setEditAIAgentDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Vincular Agente de IA</DialogTitle>
      <DialogDescription>
        Selecione o agente de IA para este operador
      </DialogDescription>
    </DialogHeader>
    <Select value={selectedAIAgentId} onValueChange={setSelectedAIAgentId}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um agente" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nenhum (usar padrao)</SelectItem>
        {aiAgents.map(agent => (
          <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <DialogFooter>
      <Button onClick={handleSaveAIAgent}>Salvar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Fluxo de Vinculacao

```text
┌─────────────────────────────────────────────────────────┐
│                    /admin/users                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Tabela de Usuarios]                                   │
│  ┌────────┬──────────┬─────────┬───────────┐           │
│  │ Email  │ Nome     │ Projeto │ Agente IA │           │
│  ├────────┼──────────┼─────────┼───────────┤           │
│  │ ...    │ Maria    │ SP      │ Vendas SP │ ◄─ Clique │
│  │ ...    │ João     │ RJ      │ -         │           │
│  └────────┴──────────┴─────────┴───────────┘           │
│                           │                             │
│                           ▼                             │
│  ┌─────────────────────────────────────────┐           │
│  │        Dialog: Vincular Agente          │           │
│  │  ┌───────────────────────────────────┐  │           │
│  │  │ Agente: [Vendas SP         ▼]     │  │           │
│  │  └───────────────────────────────────┘  │           │
│  │           [Cancelar]  [Salvar]          │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/admin/AdminAccessModal.tsx` | Adicionar opcao AI Agents |
| `src/pages/admin/Users.tsx` | Nova coluna + dialog de agente IA |
| Migration SQL | Inserir rota em app_routes |

---

## Logica de Vinculacao

1. Usuario deve ter `telemarketing_id` (ser operador Bitrix)
2. Ao vincular, usa o hook `useAgentOperatorAssignments.assignOperator(agentId, operatorBitrixId)`
3. Ao desvincular, usa `unassignOperator(assignmentId)`
4. A tabela mostra o agente vinculado buscando pelo `operator_bitrix_id`

---

## Beneficios

1. **Acesso centralizado** - Agentes de IA aparecem no menu admin
2. **Vinculacao rapida** - Vincular agentes diretamente na lista de usuarios
3. **Visibilidade** - Ver qual agente cada operador usa
4. **Permissoes** - Rota registrada no sistema de permissoes

