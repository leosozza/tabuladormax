# Configuração e Sincronização do TabuladorMax - Guia Completo

## 📋 Visão Geral

Este guia explica as melhorias implementadas no sistema de gestão de scouters para corrigir a gestão de usuários e implementar a configuração do TabuladorMax com logs detalhados.

## 🎯 Problemas Resolvidos

### 1. Gestão de Usuários
**Problema:** Usuários criados não apareciam corretamente na tabela após a criação.

**Solução:**
- ✅ Adicionado refresh automático da lista após criação/edição
- ✅ Melhorada a validação de dados ao criar usuário
- ✅ Logs detalhados em console para debug
- ✅ Tratamento de erros mais específico

**Como testar:**
1. Acesse a página **Configurações → Usuários**
2. Clique em "Convidar Usuário"
3. Preencha os dados e clique em "Criar Usuário"
4. O usuário deve aparecer imediatamente na lista

### 2. Configuração do TabuladorMax

**Problema:** Não havia interface para configurar os dados do Supabase do TabuladorMax.

**Solução:**
Criada uma interface completa de configuração com:
- ✅ Campos para Project ID, URL e Publishable Key
- ✅ Teste de conexão com diagnóstico detalhado
- ✅ Armazenamento seguro (localStorage + Supabase)
- ✅ Toggle para habilitar/desabilitar integração
- ✅ Valores padrão pré-configurados

**Dados Padrão do TabuladorMax:**
```
Project ID: gkvvtfqfggddzotxltxf
URL: https://gkvvtfqfggddzotxltxf.supabase.co
Publishable Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdnZ0ZnFmZ2dkZHpvdHhsdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDI0MzgsImV4cCI6MjA3NTQxODQzOH0.8WtKh58rp6ql2W3tQq9hLntv07ZyIFFE5kDRPcvnplU
```

**Como configurar:**
1. Acesse **Configurações → Integrações → Configuração**
2. Preencha os campos com os dados do TabuladorMax
3. Clique em "Testar Conexão" para verificar
4. Clique em "Salvar Configuração"

### 3. Logs Detalhados de Sincronização

**Problema:** Faltavam logs detalhados mostrando endpoint, tabela, status e resultados das sincronizações.

**Solução:**
Implementado sistema completo de logs com:
- ✅ Registro de endpoint utilizado
- ✅ Nome da tabela acessada
- ✅ Status da operação (sucesso/erro)
- ✅ Quantidade de registros processados
- ✅ Tempo de execução
- ✅ Mensagens de erro detalhadas
- ✅ Visualizador de logs na interface

**Onde ver os logs:**
1. **Console do navegador**: Logs em tempo real durante operações
2. **Interface**: Acesse **Configurações → Integrações → Logs**

**Logs no Console (Exemplos):**

```javascript
// Migração Inicial
🚀 [TabuladorSync] Iniciando migração inicial...
📋 [TabuladorSync] Configuração carregada: { url: "...", projectId: "..." }
📡 [TabuladorSync] Endpoint: https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/initial-sync-leads
🎯 [TabuladorSync] Tabela origem: leads (TabuladorMax)
🎯 [TabuladorSync] Tabela destino: fichas (Gestão)
📥 [TabuladorSync] Buscando TODOS os leads do TabuladorMax...
✅ [TabuladorSync] Migração concluída: { migrated: 150, total_leads: 150 }
📊 [TabuladorSync] Total de leads: 150
⏱️ [TabuladorSync] Tempo: 2345ms
```

```javascript
// Sincronização
🔄 [TabuladorSync] Iniciando sincronização manual...
📡 [TabuladorSync] Endpoint: https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/sync-tabulador
🎯 [TabuladorSync] Tabela: leads (TabuladorMax) ↔️ fichas (Gestão)
✅ [TabuladorSync] Sincronização concluída
📊 [TabuladorSync] Enviados: 5
📥 [TabuladorSync] Recebidos: 10
⏱️ [TabuladorSync] Tempo: 1234ms
```

```javascript
// Teste de Conexão
🧪 [TabuladorSync] Testando conexão com TabuladorMax...
📋 [TabuladorSync] Usando configuração: { url: "...", projectId: "..." }
📡 [TabuladorSync] Endpoint de teste: https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/test-tabulador-connection
🎯 [TabuladorSync] Tabela alvo: leads
✅ [TabuladorSync] Conexão bem-sucedida!
📊 [TabuladorSync] Resultado: { status: "✅", total: 150 }
```

### 4. Tratamento de Erro 406

**Problema:** Requisições retornavam erro 406 sem informações de diagnóstico.

**Solução:**
- ✅ Adicionado header `Prefer: return=representation` em todas as requisições
- ✅ Tratamento específico para erro 406
- ✅ Mensagens de troubleshooting contextuais
- ✅ Logs detalhados de requisições

**Mensagens de Troubleshooting:**

Quando ocorre erro 406, o sistema agora exibe:
```
Erro 406: Provavelmente falta o header "Prefer: return=representation" 
ou há problema com o Content-Type. Verifique as configurações de CORS 
e headers no Supabase.
```

Outros erros comuns tratados:
- `PGRST116`: Tabela não encontrada
- `42501`: Permissão negada
- Erros de rede e timeout

## 📁 Estrutura de Arquivos Criados/Modificados

### Novos Arquivos

```
src/repositories/
├── tabuladorConfigRepo.ts      # Gerenciamento de configuração do TabuladorMax
├── syncLogsRepo.ts              # Gerenciamento de logs de sincronização
└── types.ts                     # Atualizado com novos tipos

src/components/dashboard/integrations/
├── TabuladorMaxConfigPanel.tsx  # Interface de configuração
├── SyncLogsViewer.tsx           # Visualizador de logs
├── TabuladorSync.tsx            # Atualizado com logs detalhados
└── IntegrationsPanel.tsx        # Reorganizado com novas abas
```

### Arquivos Modificados

```
src/components/auth/
└── UsersPanel.tsx               # Corrigido refresh de usuários

supabase/functions/
├── test-tabulador-connection/index.ts  # Melhorado com logs e erro 406
├── initial-sync-leads/index.ts         # Adicionados headers e logs
└── sync-tabulador/index.ts             # Adicionados headers e logs
```

## 🔧 Configuração Técnica

### Headers Adicionados nas Edge Functions

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
};

// Cliente Supabase com headers personalizados
const client = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'Prefer': 'return=representation',
      'Content-Type': 'application/json',
    },
  },
});
```

### Armazenamento de Configuração

A configuração do TabuladorMax é armazenada em dois locais:

1. **localStorage** (acesso rápido):
```javascript
localStorage.getItem('tabuladormax_config')
```

2. **Supabase** (tabela `tabulador_config`, se existir):
```sql
CREATE TABLE tabulador_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  url TEXT NOT NULL,
  publishable_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Logs de Sincronização

Os logs são armazenados em:

1. **localStorage** (últimos 100 logs):
```javascript
localStorage.getItem('sync_logs_detailed')
```

2. **Supabase** (tabela `sync_logs_detailed`, se existir):
```sql
CREATE TABLE sync_logs_detailed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  table_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  request_params JSONB,
  response_data JSONB,
  error_message TEXT,
  records_count INTEGER,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 Como Usar

### Passo 1: Configurar TabuladorMax

1. Acesse **Configurações → Integrações → Configuração**
2. Os campos já vêm preenchidos com os valores padrão
3. Clique em **"Testar Conexão"** para validar
4. Se bem-sucedido, clique em **"Salvar Configuração"**

### Passo 2: Executar Migração Inicial

1. Acesse **Configurações → Integrações → Sincronização**
2. Clique no botão **"Migração Inicial"**
3. Aguarde o processo (pode levar alguns minutos para muitos registros)
4. Acompanhe os logs no console e na interface

### Passo 3: Sincronização Contínua

1. Use o botão **"Sincronizar Agora"** para sincronização manual
2. A sincronização bidirecional acontece automaticamente a cada 5 minutos
3. Monitore os logs em **Integrações → Logs**

### Passo 4: Visualizar Logs

1. Acesse **Configurações → Integrações → Logs**
2. Veja histórico completo de operações
3. Expanda detalhes para ver parâmetros e respostas
4. Use o botão "Atualizar" para recarregar
5. Use o botão "Limpar" para apagar logs antigos

## 🔍 Diagnóstico de Problemas

### Erro 406 - Not Acceptable

**Causa:** Falta de headers apropriados na requisição.

**Solução:**
1. Verifique se as edge functions foram atualizadas com os novos headers
2. Confirme que o TabuladorMax aceita o header `Prefer: return=representation`
3. Verifique configurações de CORS no Supabase

**Logs para verificar:**
```javascript
❌ [Sync] Erro 406 ao buscar de TabuladorMax: Verifique os headers da requisição
```

### Tabela não encontrada (PGRST116)

**Causa:** A tabela `leads` não existe no projeto TabuladorMax.

**Solução:**
1. Acesse o Supabase do TabuladorMax
2. Verifique se a tabela `leads` existe
3. Confirme as permissões RLS da tabela

### Permissão negada (42501)

**Causa:** A service key não tem permissão para acessar a tabela.

**Solução:**
1. Verifique se está usando a **service role key** (não a anon key)
2. Confirme as políticas RLS no Supabase
3. Teste as permissões no SQL Editor do Supabase

### Usuário não aparece na lista

**Solução:**
1. Verifique o console do navegador para erros
2. Confirme que o email de confirmação foi enviado
3. Verifique a tabela `users` no Supabase
4. Force um refresh da página

## 📊 Monitoramento

### Console Logs

Todos os componentes principais geram logs estruturados:

```
🔍 = Buscando/Pesquisando
📡 = Endpoint/URL
🎯 = Tabela alvo
📥 = Recebendo dados
📤 = Enviando dados
✅ = Sucesso
❌ = Erro
⚠️ = Aviso
📊 = Estatísticas
⏱️ = Tempo de execução
🔄 = Sincronizando
🚀 = Iniciando operação
```

### Interface de Logs

A interface mostra:
- Status visual (ícones coloridos)
- Timestamp com hora relativa
- Endpoint completo
- Tabela utilizada
- Quantidade de registros
- Tempo de execução
- Detalhes expandíveis (parâmetros, resposta, erros)

## 🔐 Segurança

### Armazenamento de Credenciais

- As credenciais são armazenadas no localStorage (lado do cliente)
- Para produção, considere usar variáveis de ambiente no servidor
- Nunca exponha service role keys no frontend
- Use apenas publishable keys (anon) no frontend

### Recomendações

1. Configure RLS (Row Level Security) em todas as tabelas
2. Use service role keys apenas em Edge Functions
3. Implemente rate limiting nas Edge Functions
4. Monitore logs de acesso no Supabase

## 📚 Referências

- [Documentação Supabase](https://supabase.com/docs)
- [Guia de Edge Functions](https://supabase.com/docs/guides/functions)
- [Configuração de CORS](https://supabase.com/docs/guides/api/cors)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 Suporte

Em caso de problemas:

1. Verifique os logs no console do navegador
2. Acesse a aba **Logs** na interface
3. Consulte a documentação do Supabase
4. Verifique as Edge Functions no Supabase Dashboard

## ✅ Checklist de Validação

- [ ] Configuração do TabuladorMax salva com sucesso
- [ ] Teste de conexão retorna sucesso
- [ ] Migração inicial executa sem erros
- [ ] Sincronização manual funciona
- [ ] Logs aparecem na interface
- [ ] Logs aparecem no console
- [ ] Usuários criados aparecem na lista
- [ ] Sem erros 406 nas requisições
- [ ] Headers corretos em todas as requisições
