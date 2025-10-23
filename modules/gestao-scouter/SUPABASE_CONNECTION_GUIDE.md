# Guia de Diagnóstico - Conexão Supabase

## 🎯 Problema Identificado

A aplicação **Gestão Scouter** está configurada corretamente, mas as requisições ao Supabase podem falhar por diversos motivos. Este guia ajuda a diagnosticar e resolver problemas de conexão.

## ✅ O que foi Corrigido

1. **Sistema de Logging Completo**: Todos os erros agora são registrados no console com detalhes
2. **Mensagens de Erro Visíveis**: Usuários veem claramente quando há problemas
3. **Botão Tentar Novamente**: Permite retry manual sem recarregar a página
4. **Teste Automático de Conexão**: Verifica conectividade ao iniciar

## 🔍 Diagnóstico Passo a Passo

### Etapa 1: Verificar Logs no Console do Navegador

1. Abra a aplicação no navegador
2. Pressione `F12` para abrir DevTools
3. Vá para a aba "Console"
4. Procure por mensagens com emojis:
   - `🔌 [Supabase] Inicializando cliente Supabase` ✅
   - `🧪 [Supabase] Testando conexão...` 
   - `✅ [Supabase] Conexão estabelecida` ✅ (se aparecer, conexão OK!)
   - `❌ [Supabase] Erro no teste de conexão` ❌ (indica problema)

### Etapa 2: Verificar Variáveis de Ambiente

Confirme que o arquivo `.env` contém:

```env
VITE_SUPABASE_URL=https://ngestyxtopvfeyenyvgt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Importante**: Após alterar `.env`, reinicie o servidor dev:
```bash
npm run dev
```

### Etapa 3: Verificar Dados no Supabase

Acesse o [Supabase Dashboard](https://supabase.com/dashboard) e execute:

```sql
-- Verificar se a tabela existe
SELECT COUNT(*) FROM fichas;

-- Ver dados de exemplo
SELECT id, nome, scouter, projeto, criado 
FROM fichas 
ORDER BY criado DESC 
LIMIT 10;
```

**Resultado Esperado**: Deve retornar registros. Se retornar 0, não há dados!

### Etapa 4: Verificar RLS (Row Level Security)

No Supabase Dashboard:
1. Vá para **Table Editor** > `fichas`
2. Clique em **RLS Policies**
3. Verifique se existe uma política que permite **SELECT** para usuários anônimos

**Exemplo de política necessária:**
```sql
-- Permitir leitura pública da tabela fichas
CREATE POLICY "Enable read access for all users" ON "public"."fichas"
AS PERMISSIVE FOR SELECT
TO public
USING (true);
```

Se não existir, crie uma política de leitura ou desabilite RLS temporariamente:
```sql
ALTER TABLE fichas DISABLE ROW LEVEL SECURITY;
```

### Etapa 5: Verificar CORS e Rede

**Possíveis bloqueadores:**
- ❌ Ad blockers (uBlock Origin, AdBlock Plus)
- ❌ Extensões de privacidade (Privacy Badger)
- ❌ Firewall corporativo
- ❌ VPN ou Proxy

**Como testar:**
1. Abra navegador em **modo anônimo/incógnito**
2. Desabilite temporariamente extensões
3. Teste em rede diferente (WiFi, 4G)

### Etapa 6: Testar Conexão Diretamente

Abra o Console do navegador (F12) e execute:

```javascript
// Testar fetch direto ao Supabase
fetch('https://ngestyxtopvfeyenyvgt.supabase.co/rest/v1/fichas?select=id&limit=1', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nZXN0eXh0b3B2ZmV5ZW55dmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTM0MjEsImV4cCI6MjA3NTQyOTQyMX0.Vk22kFAD0GwVMmcJgHkNnz0P56_gK1wFQcw7tus8syc',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nZXN0eXh0b3B2ZmV5ZW55dmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTM0MjEsImV4cCI6MjA3NTQyOTQyMX0.Vk22kFAD0GwVMmcJgHkNnz0P56_gK1wFQcw7tus8syc'
  }
})
.then(r => r.json())
.then(data => console.log('✅ Sucesso:', data))
.catch(err => console.error('❌ Erro:', err));
```

**Resultado Esperado**: Deve retornar dados JSON. Se falhar, o problema é de rede/permissão.

## 🛠️ Soluções Comuns

### Problema: "Failed to fetch" ou "ERR_BLOCKED_BY_CLIENT"

**Solução 1: Desabilitar Ad Blocker**
1. Clique no ícone do ad blocker
2. Desabilite para `localhost` e `supabase.co`
3. Recarregue a página

**Solução 2: Adicionar Exceção no Bloqueador**
```
# Adicionar estas URLs à whitelist:
*.supabase.co
ngestyxtopvfeyenyvgt.supabase.co
```

### Problema: "No rows returned" ou "0 fichas encontradas"

**Solução: Adicionar Dados de Teste**

Execute no Supabase SQL Editor:

```sql
-- Inserir dados de teste
INSERT INTO fichas (nome, scouter, projeto, etapa, criado) VALUES
  ('João Silva', 'Maria Santos', 'Projeto Alpha', 'Contato', NOW() - INTERVAL '1 day'),
  ('Ana Costa', 'Pedro Lima', 'Projeto Alpha', 'Agendado', NOW() - INTERVAL '2 days'),
  ('Carlos Souza', 'Maria Santos', 'Projeto Beta', 'Convertido', NOW() - INTERVAL '3 days'),
  ('Juliana Oliveira', 'Pedro Lima', 'Projeto Beta', 'Contato', NOW() - INTERVAL '4 days'),
  ('Roberto Alves', 'Maria Santos', 'Projeto Alpha', 'Convertido', NOW() - INTERVAL '5 days');

-- Verificar inserção
SELECT COUNT(*) FROM fichas;
```

### Problema: Erro de Autenticação

**Solução: Verificar Chaves**

1. No Supabase Dashboard, vá para **Settings** > **API**
2. Copie a **URL** e **anon/public key**
3. Atualize o arquivo `.env`:

```env
VITE_SUPABASE_URL=<URL copiada>
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key copiada>
```

4. Reinicie o servidor: `npm run dev`

## 📊 Interpretando os Logs

### Logs de Sucesso ✅

```
🔌 [Supabase] Inicializando cliente Supabase
📡 [Supabase] URL: https://ngestyxtopvfeyenyvgt.supabase.co
🔑 [Supabase] Cliente configurado com persistência de sessão
🧪 [Supabase] Testando conexão...
✅ [Supabase] Conexão estabelecida com sucesso
🔍 [LeadsRepo] Iniciando busca de leads com filtros: {...}
📅 [LeadsRepo] Aplicando filtro dataInicio: 2025-09-17
📅 [LeadsRepo] Aplicando filtro dataFim: 2025-10-17
🚀 [LeadsRepo] Executando query no Supabase...
✅ [LeadsRepo] Dados recebidos com sucesso: 150 registros
📊 [LeadsRepo] Após normalização e filtros: 150 leads
```

### Logs de Erro ❌

```
❌ [Supabase] Erro no teste de conexão: {message: "Failed to fetch"}
❌ [LeadsRepo] Erro ao buscar leads do Supabase: {...}
❌ [Dashboard] Erro ao carregar dados: Error: Erro ao buscar dados do Supabase
```

**O que fazer:**
1. Copie a mensagem de erro completa
2. Verifique as soluções acima baseado no tipo de erro
3. Se persistir, contacte o suporte com os logs

## 🔧 Ferramentas de Diagnóstico

### Script de Teste Incluído

Execute o script de diagnóstico:

```bash
node scripts/test-connection.js
```

Este script testa:
- ✅ Conexão com Supabase
- ✅ Acesso à tabela fichas
- ✅ Filtros de data
- ✅ Scouters e projetos únicos
- ✅ Status de autenticação

## 📞 Suporte

Se após seguir todos os passos o problema persistir:

1. **Abra uma issue** com:
   - Screenshots dos erros no console
   - Resultado do script de teste
   - Navegador e versão
   - Resultado do SQL `SELECT COUNT(*) FROM fichas;`

2. **Informações úteis para debug**:
   - Versão do Node.js: `node --version`
   - Versão do npm: `npm --version`
   - Sistema operacional
   - Está usando VPN/Proxy?
   - Rede corporativa ou doméstica?

## 📚 Recursos Adicionais

- [Documentação Supabase](https://supabase.com/docs)
- [Troubleshooting RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Community](https://github.com/supabase/supabase/discussions)

---

**Última atualização**: 2025-10-17  
**Versão da aplicação**: v1.1
