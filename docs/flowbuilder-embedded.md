# FlowBuilder Embedded Integration - Documentação

## Visão Geral

Esta feature integra o FlowBuilder visual diretamente nas configurações de botões (ButtonEditDialog), permitindo que administradores convertam botões existentes em flows e vice-versa. A integração segue o padrão de ferramentas como n8n, Make e Zapier.

## Funcionalidades

### 1. Visualização como Flow (Todos os usuários)

Qualquer usuário pode visualizar a automação de um botão como um flow, sem editá-lo:

- Botão **"Visualizar como Flow"** disponível no footer do ButtonEditDialog
- Converte automaticamente a configuração do botão em um Flow em memória
- Abre o FlowExecuteModal em modo read-only
- Mostra todos os steps que seriam executados
- Não persiste o flow no banco de dados

### 2. Edição no FlowBuilder (Apenas Administradores)

Administradores podem abrir o FlowBuilder completo para editar a automação:

- Botão **"Abrir no FlowBuilder"** visível apenas para admins
- Converte a configuração do botão em um Flow
- Abre o FlowBuilder em modo editável
- Permite adicionar, remover e reordenar steps
- **Opção A implementada**: Ao salvar um novo flow, o botão original é automaticamente atualizado para referenciar o flowId

## Conversão de Botão para Flow

O utilitário `createFlowFromButton` em `src/handlers/flowFromButton.ts` realiza a conversão automática com suporte aos seguintes tipos de ação:

### Tipos de Steps Suportados

1. **tabular** - Ação padrão de atualização de campos
   - Usado quando: `button.field` e `button.value` existem
   - Configura: `webhook_url`, `field`, `value`, `additional_fields`

2. **change_status** - Mudança de status do lead
   - Usado quando: `button.field === 'STATUS_ID'` ou contém "status"
   - Configura: `statusId`, `webhook_url`

3. **http_call** - Chamadas HTTP personalizadas
   - Usado quando: `button.action_type === 'http_call'`
   - Configura: `url`, `method`, `body`

4. **webhook** - Webhooks genéricos
   - Usado quando: `button.action_type === 'webhook'`
   - Configura: `url`, `method`, `body`

5. **email** - Envio de emails
   - Usado quando: `button.action_type === 'email'`
   - Configura: `to`, `subject`, `body`

6. **wait** - Pausas entre ações
   - Usado quando: `button.action_type === 'wait'`
   - Configura: `seconds`

### Sub-botões

Sub-botões são automaticamente convertidos em steps adicionais do flow:

```typescript
// Sub-botão original
{
  subLabel: "Motivo A",
  subField: "REASON",
  subValue: "reason_a",
  subWebhook: "https://..."
}

// Convertido para step
{
  id: "step-2",
  type: "tabular",
  nome: "Sub-ação: Motivo A",
  config: {
    webhook_url: "https://...",
    field: "REASON",
    value: "reason_a"
  }
}
```

## Arquitetura

### Novos Arquivos

#### src/services/flowsApi.ts
Cliente para comunicação com as Edge Functions:

```typescript
// Criar flow
const flow = await createFlow({
  nome: "Qualificação",
  descricao: "Flow de qualificação de leads",
  steps: [...],
  ativo: true
});

// Atualizar flow
const updated = await updateFlow(flowId, {
  nome: "Qualificação V2",
  steps: [...]
});

// Executar flow
const result = await executeFlow({
  flowId: "uuid",
  leadId: 12345,
  context: { user: "João" }
});
```

#### src/handlers/flowFromButton.ts
Conversor de ButtonConfig para Flow:

```typescript
const flow = createFlowFromButton(buttonConfig);
// Retorna: Flow com steps mapeados automaticamente
```

### Arquivos Modificados

#### src/types/flow.ts
Novos tipos de steps adicionados:

```typescript
export type FlowStepType = 
  | 'tabular'
  | 'http_call'
  | 'wait'
  | 'email'        // Novo
  | 'change_status' // Novo
  | 'webhook';      // Novo
```

#### src/components/ButtonEditDialog.tsx
Integração completa com FlowBuilder:

**Estado adicionado:**
- `isAdmin` - Verifica se o usuário é administrador
- `flowBuilderOpen` - Controla modal do FlowBuilder
- `flowExecuteModalOpen` - Controla modal de execução
- `currentFlow` - Flow atual sendo editado/visualizado

**Handlers adicionados:**
- `checkAdminStatus()` - Verifica role via tabela `user_roles`
- `handleVisualizeFlow()` - Converte e abre em read-only
- `handleOpenFlowBuilder()` - Converte e abre editável
- `handleFlowSave()` - Salva flow e atualiza botão

**UI modificada:**
```tsx
<div className="flex gap-2">
  {/* Todos os usuários */}
  <Button onClick={handleVisualizeFlow}>
    <Eye /> Visualizar como Flow
  </Button>
  
  {/* Apenas admins */}
  {isAdmin && (
    <Button onClick={handleOpenFlowBuilder}>
      <Workflow /> Abrir no FlowBuilder
    </Button>
  )}
</div>
```

#### src/components/flow/FlowBuilder.tsx
Melhorias na propagação de dados:

- `useEffect` para atualizar state quando `flow` prop muda
- `onSave` callback agora recebe o flow salvo: `onSave(savedFlow?: Flow)`
- Correção no endpoint de update: `flows-api/${flow.id}`

## Fluxo de Uso

### Cenário 1: Visualizar Automação (Qualquer usuário)

1. Usuário abre ButtonEditDialog para editar um botão
2. Clica em "Visualizar como Flow"
3. Sistema converte botão em Flow (em memória)
4. FlowExecuteModal abre mostrando todos os steps
5. Usuário pode:
   - Ver a sequência de ações
   - Executar o flow (se tiver permissão)
   - Fechar sem salvar

### Cenário 2: Editar no FlowBuilder (Admin)

1. Admin abre ButtonEditDialog
2. Clica em "Abrir no FlowBuilder"
3. Sistema converte botão em Flow
4. FlowBuilder abre em modo editável
5. Admin pode:
   - Adicionar novos steps
   - Reordenar steps
   - Remover steps
   - Configurar cada step
6. Admin clica em "Salvar Flow"
7. **Sistema cria flow no banco e atualiza botão**:
   ```typescript
   // Botão antes
   button.action_type = 'tabular'
   
   // Botão depois
   button.action_type = 'flow'
   button.action = {
     type: 'flow',
     flowId: 'uuid-do-flow-salvo'
   }
   ```

## Segurança

### Verificação de Admin

A verificação é feita via tabela `user_roles`:

```typescript
const { data } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', session.user.id)
  .maybeSingle();

const isAdmin = data?.role === 'admin';
```

### Proteção de Dados

- ✅ SUPABASE_SERVICE_ROLE_KEY **não** é exposta no frontend
- ✅ Todas as chamadas usam Edge Functions públicas
- ✅ Autorização é verificada server-side nas Edge Functions
- ✅ RLS policies protegem acesso direto às tabelas

## Edge Functions Utilizadas

### POST /functions/v1/flows-api
Cria novo flow:

```json
{
  "nome": "Flow de Qualificação",
  "descricao": "Atualiza status e envia notificação",
  "steps": [
    {
      "id": "step-1",
      "type": "tabular",
      "nome": "Atualizar Status",
      "config": {
        "webhook_url": "https://...",
        "field": "STATUS_ID",
        "value": "QUALIFIED"
      }
    }
  ],
  "ativo": true
}
```

### PUT /functions/v1/flows-api/:id
Atualiza flow existente.

### POST /functions/v1/flows-executor
Executa flow:

```json
{
  "flowId": "uuid-do-flow",
  "leadId": 12345,
  "context": {}
}
```

Ou com flow in-memory (não persistido):

```json
{
  "flow": { /* flow object completo */ },
  "leadId": 12345,
  "context": {}
}
```

## Testes Manuais

### Teste 1: Verificar Visibilidade dos Botões

**Como usuário não-admin:**
1. Abrir ButtonEditDialog
2. ✅ Verificar que apenas "Visualizar como Flow" está visível
3. ❌ "Abrir no FlowBuilder" não deve aparecer

**Como admin:**
1. Abrir ButtonEditDialog
2. ✅ Ambos os botões devem estar visíveis

### Teste 2: Visualização Read-Only

1. Clicar em "Visualizar como Flow"
2. ✅ FlowExecuteModal abre
3. ✅ Mostra steps do botão convertidos
4. ✅ Permite executar mas não editar
5. Fechar modal
6. ✅ Nenhum dado é salvo

### Teste 3: Edição e Salvamento (Admin)

1. Como admin, clicar em "Abrir no FlowBuilder"
2. ✅ FlowBuilder abre com steps do botão
3. Adicionar um novo step (ex: Wait 5 segundos)
4. Editar nome do flow
5. Clicar em "Salvar Flow"
6. ✅ Toast de sucesso aparece
7. ✅ Console mostra: "Button 'X' updated to reference flow: uuid"
8. Verificar no banco:
   ```sql
   SELECT id, nome, steps FROM flows WHERE nome LIKE '%nome-do-flow%';
   ```
9. ✅ Flow criado com todos os steps

### Teste 4: Conversão de Sub-botões

1. Editar botão que tem sub-botões
2. Clicar em "Visualizar como Flow"
3. ✅ Verificar que cada sub-botão virou um step adicional
4. ✅ Ordem dos steps: [step principal, sub-button-1, sub-button-2, ...]

### Teste 5: Conversão de Tipos Especiais

**Status Change:**
1. Criar botão com field = "STATUS_ID"
2. Visualizar como flow
3. ✅ Step deve ser type: "change_status"

**HTTP Call:**
1. Criar botão com action_type = "http_call"
2. Visualizar como flow
3. ✅ Step deve ser type: "http_call"

## Troubleshooting

### Botão não mostra "Abrir no FlowBuilder"

**Causa:** Usuário não é admin

**Solução:** Verificar role na tabela user_roles:
```sql
SELECT * FROM user_roles WHERE user_id = 'uuid-do-usuario';
```

Se não existir registro, criar:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('uuid-do-usuario', 'admin');
```

### Erro ao salvar flow

**Causa 1:** Edge Function não encontrada

**Solução:** Verificar que edge functions estão deployadas:
```bash
supabase functions list
```

**Causa 2:** Permissões RLS

**Solução:** Verificar policies da tabela flows:
```sql
SELECT * FROM pg_policies WHERE tablename = 'flows';
```

### Flow não aparece após salvar

**Causa:** Botão não foi atualizado com flowId

**Solução:** Verificar console do navegador para mensagem:
```
✅ Button "X" updated to reference flow: uuid
```

Se não aparecer, verificar se `onUpdate` está funcionando corretamente.

## Próximos Passos

### Melhorias Futuras

1. **Preview de Execução**: Mostrar preview do que cada step fará antes de executar
2. **Versionamento de Flows**: Manter histórico de mudanças nos flows
3. **Templates de Flows**: Biblioteca de flows pré-configurados
4. **Validação de Steps**: Validar configuração antes de salvar
5. **Testes Automatizados**: Adicionar testes E2E com Playwright
6. **Drag & Drop Visual**: Interface visual estilo n8n com react-flow-renderer

### Integrações

1. **Bitrix24**: Expandir tipos de ações Bitrix
2. **Notificações**: Email, SMS, WhatsApp steps
3. **Condicionais**: If/else logic nos flows
4. **Loops**: Repetir steps N vezes ou para cada item
5. **Variáveis**: Sistema de variáveis entre steps

## Referências

- Edge Functions: `supabase/functions/flows-api/` e `flows-executor/`
- Documentação original: `docs/flows.md`
- Handlers: `src/handlers/tabular.ts` e `httpCall.ts`
- Types: `src/types/flow.ts`

## Suporte

Para dúvidas ou problemas:
1. Verificar console do navegador para erros
2. Verificar logs das Edge Functions no Supabase Dashboard
3. Consultar tabela `flows_runs` para histórico de execuções
4. Verificar permissões na tabela `user_roles`
