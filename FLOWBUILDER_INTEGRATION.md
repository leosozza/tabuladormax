# FlowBuilder Integration - Implementação

Este documento descreve a implementação da integração do FlowBuilder visual nas configurações de botões.

## Visão Geral

A integração permite que administradores visualizem e editem as configurações de botões como flows visuais, facilitando a compreensão e manutenção de automações complexas.

## Arquivos Criados

### Tipos e Interfaces
- `src/types/flow.ts` - Tipos expandidos incluindo email, change_status, webhook

### Serviços
- `src/services/flowsApi.ts` - Serviço para integração com Edge Functions
  - `createFlow(flow)` - Cria um novo flow
  - `updateFlow(flowId, flow)` - Atualiza um flow existente
  - `executeFlow(payload)` - Executa um flow

### Handlers
- `src/handlers/flowFromButton.ts` - Conversor de configuração de botão para flow
  - Suporta conversão automática de múltiplos tipos de ações
  - Mapeia tipos: tabular, http_call, wait, email, change_status, webhook

### Hooks
- `src/hooks/useIsAdmin.ts` - Hook para verificar permissões de administrador

## Componentes Modificados

### FlowBuilder
- Adicionado suporte para novos tipos de steps: email, change_status, webhook
- Callback `onSave` agora retorna o flow salvo com ID

### ButtonEditDialog
- Integração com FlowBuilder através de modal
- Dois botões de ação:
  - "Visualizar como Flow" - Disponível para todos os usuários
  - "Abrir no FlowBuilder" - Disponível apenas para administradores
- Ao salvar flow, atualiza botão com `action_type='flow'` e `value=flowId`

### FlowList
- Atualizado para nova assinatura do callback onSave

## Fluxo de Uso

1. Usuário clica em "Editar" em um botão
2. No dialog de edição, aparecem os botões de integração com FlowBuilder
3. Ao clicar em "Visualizar como Flow" ou "Abrir no FlowBuilder":
   - Configuração atual do botão é convertida em flow
   - Modal do FlowBuilder é aberto
4. Usuário pode editar o flow (se for admin)
5. Ao salvar:
   - Flow é criado/atualizado via Edge Function
   - Botão é atualizado com referência ao flow
   - Modal é fechado

## Tipos de Steps Suportados

- **tabular** - Ação de tabulação com webhook
- **http_call** - Chamada HTTP genérica
- **wait** - Aguardar tempo em segundos
- **email** - Enviar email
- **change_status** - Alterar status do lead
- **webhook** - Chamar webhook customizado

## Integração com Edge Functions

A implementação assume que as seguintes Edge Functions existem:

- `flows-api` - CRUD de flows
  - POST /flows-api - Criar flow
  - PUT /flows-api/{id} - Atualizar flow
  - GET /flows-api - Listar flows
  - GET /flows-api/{id} - Obter flow
  - DELETE /flows-api/{id} - Deletar flow

- `flows-executor` - Execução de flows
  - POST /flows-executor - Executar flow

## Permissões

- Visualização de flows: Todos os usuários
- Edição de flows: Apenas administradores
- Verificação através do hook `useIsAdmin` que consulta a tabela `user_roles`

## Notas de Implementação

- Conversão automática de botão para flow baseada em heurísticas
- Fallback para tipo webhook quando tipo não pode ser determinado
- Action type do botão salvo como 'flow' com flowId no campo value
- UI simples baseada em listas (não usa react-flow-renderer no MVP)
test
