# FlowBuilder Embedded Integration - Testing Guide

## Objetivo

Implementar um FlowBuilder visual embutido (estilo n8n/make/zapier) integrado nas configurações de botões (ButtonEditDialog) com integração completa e funcional.

## Instalação e Setup

```bash
# Clone o repositório
git checkout copilot/implement-flowbuilder-integration

# Instale as dependências
npm install --legacy-peer-deps

# Build do projeto
npm run build

# Execute em desenvolvimento
npm run dev
```

## Testes Manuais

### Pré-requisitos

1. Usuário com role `admin` na tabela `user_roles`
2. Botões configurados na aplicação (via LeadTab)
3. Edge Functions deployadas:
   - `flows-api`
   - `flows-executor`

### Teste 1: Verificar Visibilidade dos Botões

#### Como Usuário Não-Admin

1. Fazer login com usuário sem role admin
2. Navegar para LeadTab
3. Abrir editor de um botão existente (ButtonEditDialog)
4. **Verificar:**
   - ✅ Botão "Visualizar como Flow" está visível no footer
   - ❌ Botão "Abrir no FlowBuilder" NÃO está visível

#### Como Admin

1. Fazer login com usuário admin
2. Navegar para LeadTab
3. Abrir editor de um botão existente (ButtonEditDialog)
4. **Verificar:**
   - ✅ Botão "Visualizar como Flow" está visível
   - ✅ Botão "Abrir no FlowBuilder" está visível

### Teste 2: Visualização Read-Only (Todos os Usuários)

1. Abrir ButtonEditDialog de um botão com configurações
2. Clicar em "Visualizar como Flow"
3. **Verificar:**
   - ✅ FlowExecuteModal abre
   - ✅ Mostra nome do flow: "Flow: [nome-do-botão]"
   - ✅ Lista os steps convertidos do botão
   - ✅ Permite informar leadId
   - ✅ Tem botão "Executar"
   - ✅ Tem botão "Fechar"
4. Fechar o modal
5. **Verificar:**
   - ✅ Nenhum flow foi salvo no banco de dados
   - ✅ ButtonEditDialog ainda está aberto

### Teste 3: Conversão de Botão Simples

Usar um botão com as seguintes configurações:
- Label: "Qualificar Lead"
- Field: "STATUS_ID"
- Value: "QUALIFIED"
- Webhook: "https://bitrix.example.com/..."

1. Clicar em "Visualizar como Flow"
2. **Verificar no modal:**
   - ✅ Step 1 deve ser type: "change_status"
   - ✅ Nome: "Mudar Status: Qualificar Lead"
   - ✅ Config mostra statusId e webhook_url

### Teste 4: Conversão de Botão com Sub-botões

Usar um botão com sub-botões configurados:
- Botão principal: "Selecionar Motivo"
- Sub-botão 1: "Motivo A"
- Sub-botão 2: "Motivo B"

1. Clicar em "Visualizar como Flow"
2. **Verificar:**
   - ✅ Step 1: Ação do botão principal
   - ✅ Step 2: Sub-ação: Motivo A
   - ✅ Step 3: Sub-ação: Motivo B
   - ✅ Todos os steps têm configurações corretas

### Teste 5: Editar no FlowBuilder (Admin)

1. Como admin, abrir ButtonEditDialog
2. Clicar em "Abrir no FlowBuilder"
3. **Verificar:**
   - ✅ FlowBuilder abre
   - ✅ Mostra nome do flow gerado
   - ✅ Lista os steps convertidos
   - ✅ Permite adicionar novos steps
   - ✅ Permite reordenar steps
   - ✅ Permite editar cada step
4. Editar o nome do flow para "Qualificação v2"
5. Adicionar um novo step: Wait (5 segundos)
6. Clicar em "Salvar Flow"
7. **Verificar:**
   - ✅ Toast "Flow criado com sucesso!" aparece
   - ✅ Console mostra: `✅ Button "X" updated to reference flow: [uuid]`
   - ✅ Modal fecha
   - ✅ ButtonEditDialog ainda aberto

### Teste 6: Verificar Flow Salvo no Banco

Após o Teste 5:

1. Abrir console do Supabase SQL Editor
2. Executar query:
   ```sql
   SELECT id, nome, descricao, steps, ativo 
   FROM flows 
   WHERE nome LIKE '%Qualificação v2%'
   ORDER BY criado_em DESC 
   LIMIT 1;
   ```
3. **Verificar:**
   - ✅ Flow existe no banco
   - ✅ Nome correto: "Qualificação v2"
   - ✅ Steps incluem o step Wait adicionado
   - ✅ ativo = true

### Teste 7: Verificar Atualização do Botão

Após o Teste 5:

1. Ainda no ButtonEditDialog, inspecionar estado do botão
2. Abrir DevTools Console e executar:
   ```javascript
   // Verificar que o botão foi atualizado
   console.log(button.action_type); // Deve mostrar: 'flow'
   console.log(button.action); // Deve mostrar: { type: 'flow', flowId: 'uuid' }
   ```
3. **Verificar:**
   - ✅ action_type mudou para 'flow'
   - ✅ action.flowId contém UUID válido

### Teste 8: Executar Flow Salvo

1. Navegar para a aba "Flows" (botão Workflow no LeadTab)
2. Localizar o flow "Qualificação v2" criado no Teste 5
3. Clicar em "Executar"
4. Informar um leadId válido
5. Clicar em "Executar"
6. **Verificar:**
   - ✅ Modal mostra "Executando..."
   - ✅ Logs aparecem em tempo real
   - ✅ Cada step mostra resultado
   - ✅ Status final: "Concluída" ou "Falhou"

### Teste 9: Atualizar Flow Existente (Admin)

1. Abrir ButtonEditDialog do botão que já tem flowId
2. Clicar em "Abrir no FlowBuilder"
3. **Verificar:**
   - ✅ FlowBuilder carrega o flow salvo (não converte do botão)
   - ✅ Mostra os steps salvos anteriormente
4. Adicionar outro step
5. Clicar em "Salvar Flow"
6. **Verificar:**
   - ✅ Toast "Flow atualizado com sucesso!"
   - ✅ Botão NÃO é atualizado (já tinha flowId)

### Teste 10: Conversão de Tipos Especiais

#### Teste 10.1: HTTP Call
1. Criar botão com action_type = "http_call"
2. Visualizar como flow
3. **Verificar:** Step type = "http_call"

#### Teste 10.2: Webhook
1. Criar botão com action_type = "webhook"
2. Visualizar como flow
3. **Verificar:** Step type = "webhook"

#### Teste 10.3: Email (Futuro)
1. Criar botão com action_type = "email"
2. Visualizar como flow
3. **Verificar:** Step type = "email"

## Checklist de Aceite

- [ ] Botões aparecem corretamente (todos vs admin)
- [ ] Visualização read-only funciona
- [ ] Conversão de botão simples funciona
- [ ] Conversão com sub-botões funciona
- [ ] Edição no FlowBuilder funciona
- [ ] Salvamento de novo flow funciona
- [ ] Botão é atualizado com flowId (Option A)
- [ ] Flow aparece na lista de flows
- [ ] Flow pode ser executado
- [ ] Atualização de flow existente funciona
- [ ] Tipos especiais são convertidos corretamente
- [ ] Segurança: apenas admins veem "Abrir no FlowBuilder"
- [ ] Build passa sem erros
- [ ] Lint passa sem novos erros

## Troubleshooting

### Erro: "Failed to create flow"

**Causa:** Edge Function não encontrada ou erro de permissão

**Solução:**
1. Verificar que edge functions estão deployadas:
   ```bash
   supabase functions list
   ```
2. Verificar logs da edge function no Supabase Dashboard
3. Verificar RLS policies na tabela `flows`

### Botão "Abrir no FlowBuilder" não aparece

**Causa:** Usuário não é admin

**Solução:**
```sql
-- Verificar role do usuário
SELECT * FROM user_roles WHERE user_id = 'seu-user-id';

-- Se necessário, adicionar role admin
INSERT INTO user_roles (user_id, role)
VALUES ('seu-user-id', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

### Flow não aparece após salvar

**Causa:** Callback não está atualizando o botão

**Solução:**
1. Abrir console do navegador
2. Verificar se há mensagem: `✅ Button "X" updated to reference flow: uuid`
3. Se não aparecer, verificar implementação de `onUpdate` no componente pai

### Erro de TypeScript no build

**Causa:** Tipos incompatíveis

**Solução:**
1. Verificar que todos os imports estão corretos
2. Executar: `npm run build` para ver erro detalhado
3. Verificar tipagem em `ButtonConfig.action`

## Arquivos Modificados/Criados

### Novos Arquivos
- `src/services/flowsApi.ts`
- `src/handlers/flowFromButton.ts`
- `docs/flowbuilder-embedded.md`
- `docs/TESTING.md` (este arquivo)

### Arquivos Modificados
- `src/types/flow.ts`
- `src/components/ButtonEditDialog.tsx`
- `src/components/flow/FlowBuilder.tsx`

## Próximos Passos

Após os testes manuais passarem:

1. [ ] Merge do PR
2. [ ] Deploy das mudanças
3. [ ] Verificar em produção
4. [ ] Treinar usuários admin
5. [ ] Coletar feedback
6. [ ] Iterar melhorias

## Notas Importantes

- Esta é uma integração MVP - features avançadas (condicionais, loops, etc) virão em iterações futuras
- A conversão é "best-effort" - alguns tipos de botões podem precisar de ajustes manuais no FlowBuilder
- Sempre testar com dados não-críticos primeiro
- Fazer backup do banco antes de testes extensivos

## Contato

Para dúvidas ou issues:
- Abrir issue no GitHub
- Consultar documentação em `docs/flowbuilder-embedded.md`
- Verificar logs das Edge Functions
