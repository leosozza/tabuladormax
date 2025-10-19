# Documentação da Integração Gestão Scouter

## Visão Geral

Esta documentação descreve a implementação da área de integração de sincronização bidirecional entre TabuladorMax e Gestão Scouter.

## Funcionalidades Implementadas

### 1. Nova Aba "Integração" na Central de Sincronização

- Localização: Central de Sincronização → Aba "🔗 Integração"
- Separada das abas de Monitoramento, Importações e Atualização em Lote
- Interface dedicada para gerenciar a integração com Gestão Scouter

**Nota**: A partir do PR #73, a integração usa a tabela `leads` em vez de `fichas` no gestao-scouter.

### 2. Configuração do Gestão Scouter

A seção de configuração permite gerenciar os dados de conexão:

#### Campos de Configuração:
- **URL do Projeto**: URL completa do projeto Supabase Gestão Scouter (ex: https://xxxxx.supabase.co)
- **Anon Key**: Chave pública anon para autenticação e leitura
- **Integração Ativa**: Switch para ativar/desativar a integração
- **Sincronização Automática**: Switch para habilitar sincronização bidirecional automática

#### Características:
- ✅ Carregamento automático de configurações existentes da tabela `gestao_scouter_config`
- ✅ Validação de campos antes de salvar
- ✅ Validação de formato de URL
- ✅ Status visual com badges coloridos
- ✅ Indicação de última atualização

### 3. Botão "Instruções"

Dialog modal completo com passo a passo para configurar a integração:

#### Passo 1: Criar Tabela "leads"
- Script SQL completo para criar tabela espelho da tabela `leads`
- Inclui todos os campos necessários
- Botão "Copiar" para facilitar uso

#### Passo 2: Configurar Trigger
- Script SQL do trigger para sincronização bidirecional
- Detecta mudanças na tabela `leads`
- Sincroniza automaticamente de volta para TabuladorMax
- Alertas destacando variáveis que precisam ser substituídas

#### Passo 3: Configurar Credenciais
- Instruções para encontrar URL e Anon Key no Supabase
- Localização exata das configurações no dashboard

#### Passo 4: Testar e Ativar
- Checklist final de verificação
- Passos para ativar a sincronização

### 4. Botão "Testar Integração"

Funcionalidade de teste de conexão:

#### Validações:
- ✅ Verifica se URL e Anon Key estão preenchidos
- ✅ Cria cliente temporário com as credenciais fornecidas
- ✅ Tenta conectar no projeto Gestão Scouter
- ✅ Verifica existência da tabela "leads"

#### Feedback:
- ✅ Sucesso: Toast verde com mensagem de confirmação
- ❌ Erro: Toast vermelho com detalhes do erro
- Tratamento específico para tabela não encontrada

### 5. Monitoramento Melhorado

#### SyncLogsTable com Visualização de Erros:
- ✅ Clique em erro abre dialog modal
- ✅ Informações detalhadas:
  - Data/Hora formatada
  - Tipo de evento
  - Direção da sincronização (com ícones visuais)
  - Lead ID
  - Duração em ms
  - Status
- ✅ Mensagem de erro completa em área destacada
- ✅ Detalhes adicionais quando disponíveis
- ✅ Suporte visual especial para sincronização Gestão Scouter

#### GestaoScouterMetrics:
- Já existente, mostrando métricas de sincronização
- Integra-se perfeitamente com a nova aba

### 6. Sincronização Bidirecional

#### TabuladorMax → Gestão Scouter:
- Trigger existente em `leads` chama função `sync-to-gestao-scouter`
- Edge Function valida configuração
- Cria/atualiza lead na tabela `leads`
- Resolução de conflitos baseada em `updated_at`

#### Gestão Scouter → TabuladorMax:
- Trigger configurado pelo usuário (via instruções)
- Chama função `sync-from-gestao-scouter`
- Atualiza lead na tabela `leads`
- Prevenção de loops infinitos via `sync_source`

## Arquitetura

### Componentes Criados

1. **IntegrationTab.tsx**
   - Componente principal da aba de integração
   - Gerencia estado do formulário
   - Integra com Supabase para CRUD de configurações
   - Implementa teste de conexão

2. **IntegrationInstructionsDialog.tsx**
   - Dialog modal com instruções passo a passo
   - Scripts SQL formatados e copiáveis
   - Design visual com ícones e badges
   - Organizado em cards por etapa

### Componentes Modificados

1. **SyncMonitor.tsx**
   - Adicionada nova aba "Integração"
   - Tabs reorganizados em grid de 4 colunas
   - Import do novo componente IntegrationTab

2. **SyncLogsTable.tsx**
   - Adicionado estado para erro selecionado
   - Dialog modal para visualização de erro completo
   - Botão clicável na coluna de erro
   - Formatação especial para erros de Gestão Scouter

## Schema do Banco de Dados

### Tabela: gestao_scouter_config

```sql
CREATE TABLE IF NOT EXISTS public.gestao_scouter_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_url TEXT NOT NULL,
  service_role_key_encrypted TEXT,
  anon_key TEXT,
  active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security:
- Apenas usuários com role 'admin' podem gerenciar configurações
- Policy: "Admins can manage gestao_scouter_config"

## Edge Functions

### sync-to-gestao-scouter
- **Entrada**: `{ lead, source }`
- **Saída**: `{ success, message, leadId?, gestaoScouterLeadId? }`
- **Lógica**:
  1. Evita loop verificando `source`
  2. Busca configuração ativa
  3. Cria cliente Gestão Scouter
  4. Prepara dados do lead
  5. Verifica resolução de conflitos
  6. Faz upsert na tabela `leads`
  7. Atualiza status no lead
  8. Registra evento em `sync_events`

### sync-from-gestao-scouter
- **Entrada**: `{ lead, source }`
- **Saída**: `{ success, message, leadId? }`
- **Lógica**:
  1. Evita loop verificando `source`
  2. Valida ID do lead
  3. Prepara dados do lead
  4. Verifica resolução de conflitos
  5. Faz upsert na tabela `leads`
  6. Registra evento em `sync_events`

## Segurança

### Credenciais:
- ✅ Anon Key armazenada em texto plano (é pública)
- ✅ Service Role Key deve ser criptografada (não implementado ainda)
- ✅ RLS protege acesso à configuração

### Prevenção de Loops:
- ✅ Campo `sync_source` marca origem dos dados
- ✅ Edge functions verificam origem antes de sincronizar
- ✅ Resolução de conflitos baseada em timestamp

## Testes

### Build:
- ✅ Projeto compila sem erros
- ✅ Sem warnings críticos

### Lint:
- ✅ Correção de tipos `any` para tipos específicos
- ✅ Sem erros de ESLint nos arquivos criados

### Funcionalidades:
- ⚠️ Testes funcionais requerem autenticação no sistema
- ⚠️ Validação manual recomendada com ambiente configurado

## Como Usar

### 1. Acessar a Integração
1. Login no TabuladorMax
2. Navegar para Central de Sincronização
3. Clicar na aba "🔗 Integração"

### 2. Configurar
1. Clicar em "Instruções" para ver passo a passo
2. Executar scripts SQL no projeto Gestão Scouter
3. Preencher URL e Anon Key
4. Clicar em "Testar Integração"
5. Se sucesso, ativar switches
6. Salvar configuração

### 3. Monitorar
1. Voltar para aba "📊 Monitoramento"
2. Visualizar métricas de Gestão Scouter
3. Verificar logs de sincronização
4. Clicar em erros para ver detalhes completos

## Melhorias na Exportação em Lote (PR Atual)

### Funcionalidades Adicionadas

1. **Seleção de Campos**
   - Interface com checkboxes para selecionar campos específicos
   - Opção "Selecionar Todos" (padrão)
   - Seleção é persistida no job (`fields_selected`)
   - Apenas campos selecionados são enviados ao gestao-scouter

2. **Botão Resetar**
   - Disponível em jobs pausados
   - Zera contadores e reinicia processamento
   - Limpa erros anteriores
   - Útil para reprocessar toda a exportação

3. **Botão Excluir**
   - Disponível em jobs pausados
   - Remove o job e todos os erros associados
   - Libera para criar novo job

4. **Log de Erros Detalhado**
   - Tabela `gestao_scouter_export_errors` armazena:
     - Snapshot completo do lead
     - Campos que foram enviados
     - Mensagem de erro
     - Detalhes técnicos
     - Status e corpo da resposta HTTP
   - Interface com card vermelho mostrando erros
   - Modal com detalhes completos ao clicar
   - Permite análise aprofundada de falhas

5. **Uso de Tabela leads**
   - Exportação usa `gestao-scouter.public.leads` (tabela correta)
   - ⚠️ Nota: Documentação e scripts antigos referenciavam `fichas`
   - Alinhamento com estrutura de dados do PR #73

### Schema Changes

**Tabela gestao_scouter_export_jobs:**
```sql
-- Nova coluna
fields_selected JSONB DEFAULT NULL
```

**Nova Tabela gestao_scouter_export_errors:**
```sql
CREATE TABLE gestao_scouter_export_errors (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES gestao_scouter_export_jobs(id),
  lead_id UUID REFERENCES leads(id),
  lead_snapshot JSONB NOT NULL,
  fields_sent JSONB NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Edge Function Changes

**Novas Actions:**
- `reset`: Reseta job para reprocessar
- `delete`: Exclui job pausado

**Processamento:**
- Suporta `fieldsSelected` no payload
- Filtra campos antes de exportar
- Registra erros detalhados na nova tabela
- Captura status e resposta HTTP

## Melhorias Futuras (Não Implementadas)

1. **Seletor de Mapeamento de Tabelas**
   - Permitir escolher qual tabela sincronizar com qual
   - Mapeamento customizado de campos
   - (Opcional - não implementado por simplicidade)

2. **Criptografia de Service Role Key**
   - Usar Supabase Vault para armazenar chave
   - Maior segurança para operações sensíveis

3. **Testes Automatizados**
   - Unit tests para componentes React
   - Integration tests para sincronização
   - E2E tests com autenticação

4. **Estatísticas Avançadas**
   - Dashboard com gráficos de sincronização
   - Alertas de falhas
   - Relatórios de desempenho

## Troubleshooting

### Erro ao testar integração:
- Verificar URL do projeto (deve terminar com .supabase.co)
- Verificar Anon Key (deve começar com eyJ...)
- Verificar se tabela "leads" existe no Gestão Scouter (não "fichas")

### Sincronização não funciona:
- Verificar se switches estão ativos
- Verificar logs na aba Monitoramento
- Clicar em erros para ver detalhes
- Verificar trigger no Gestão Scouter

### Loop infinito de sincronização:
- Verificar campo `sync_source` nos registros
- Verificar se trigger verifica origem antes de sincronizar
- Verificar logs para identificar padrão

### Erros na exportação em lote:
- Acessar card vermelho de erros
- Clicar em erro para ver detalhes completos
- Verificar campos enviados vs snapshot do lead
- Verificar resposta do servidor
- Corrigir dados se necessário e resetar job

## Referências

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Triggers](https://supabase.com/docs/guides/database/postgres/triggers)
- [React Query](https://tanstack.com/query/latest/docs/framework/react/overview)
- [shadcn/ui Components](https://ui.shadcn.com/)
