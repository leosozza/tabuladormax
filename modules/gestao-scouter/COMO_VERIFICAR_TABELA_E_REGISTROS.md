# 📊 Como Verificar a Tabela e Quantidade de Registros

## Logs Aprimorados no Console

Após a atualização, o sistema agora exibe informações detalhadas sobre qual tabela está sendo consultada e quantos registros existem.

### O Que Você Verá no Console do Navegador

Quando a aplicação carrega, você verá logs como estes:

```
🔌 [Supabase] Inicializando cliente Supabase
📡 [Supabase] URL: https://ngestyxtopvfeyenyvgt.supabase.co
🔑 [Supabase] Cliente configurado com persistência de sessão
🧪 [Supabase] Testando conexão...
✅ [Supabase] Conexão estabelecida com sucesso
📊 [Supabase] Total de registros na tabela "fichas": 150

🔍 [LeadsRepo] Iniciando busca de leads com filtros: {...}
🗂️  [LeadsRepo] Tabela sendo consultada: "fichas"
📅 [LeadsRepo] Aplicando filtro dataInicio: 2025-09-17
📅 [LeadsRepo] Aplicando filtro dataFim: 2025-10-17
🚀 [LeadsRepo] Executando query no Supabase...
✅ [LeadsRepo] Query executada com sucesso!
📊 [LeadsRepo] Total de registros na tabela "fichas" (com filtros): 45
📦 [LeadsRepo] Registros retornados nesta query: 45
📋 [LeadsRepo] Após normalização e filtros client-side: 45 leads
```

### Informações Importantes nos Logs

#### 1. **Nome da Tabela** 🗂️
```
🗂️  [LeadsRepo] Tabela sendo consultada: "fichas"
```
Este log confirma que a aplicação está buscando dados na tabela correta.

#### 2. **Total de Registros no Supabase** 📊
```
📊 [Supabase] Total de registros na tabela "fichas": 150
```
Este log mostra quantos registros existem na tabela, independente dos filtros.

#### 3. **Registros com Filtros Aplicados** 📦
```
📊 [LeadsRepo] Total de registros na tabela "fichas" (com filtros): 45
📦 [LeadsRepo] Registros retornados nesta query: 45
```
Estes logs mostram quantos registros correspondem aos filtros aplicados (data, scouter, projeto, etc).

#### 4. **Registros Finais Após Processamento** 📋
```
📋 [LeadsRepo] Após normalização e filtros client-side: 45 leads
```
Este log mostra quantos leads estão sendo exibidos na interface final.

### Se a Tabela Estiver Vazia

Caso a tabela "fichas" não tenha dados, você verá:

```
✅ [Supabase] Conexão estabelecida com sucesso
📊 [Supabase] Total de registros na tabela "fichas": 0
⚠️ [Supabase] A tabela "fichas" está VAZIA!
💡 [Supabase] Para adicionar dados de teste, execute no Supabase SQL Editor:

INSERT INTO fichas (nome, scouter, projeto, etapa, criado) VALUES
  ('João Silva', 'Maria Santos', 'Projeto Alpha', 'Contato', NOW()),
  ('Ana Costa', 'Pedro Lima', 'Projeto Beta', 'Agendado', NOW() - INTERVAL '1 day');
```

E ao buscar leads:

```
⚠️ [LeadsRepo] Nenhum registro encontrado na tabela "fichas"
💡 [LeadsRepo] Verifique se:
   1. A tabela "fichas" contém dados no Supabase
   2. Os filtros aplicados não estão muito restritivos
   3. As políticas RLS permitem acesso aos dados
```

## Como Visualizar os Logs

1. **Abra a aplicação** no navegador
2. **Pressione F12** para abrir o DevTools
3. **Vá para a aba Console**
4. **Procure pelos emojis**: 🔌, 🗂️, 📊, 📦, ✅, ❌

### Filtrar Logs Relevantes

No console do DevTools, você pode filtrar por:
- `[Supabase]` - Ver apenas logs de conexão
- `[LeadsRepo]` - Ver apenas logs de busca de leads
- `fichas` - Ver tudo relacionado à tabela fichas
- `📊` - Ver contagens de registros

## Exemplo Visual

Quando tudo está funcionando corretamente:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔌 [Supabase] Inicializando cliente Supabase              │
│ ✅ [Supabase] Conexão estabelecida com sucesso             │
│ 📊 [Supabase] Total de registros na tabela "fichas": 150  │
├─────────────────────────────────────────────────────────────┤
│ 🔍 [LeadsRepo] Iniciando busca de leads                    │
│ 🗂️  [LeadsRepo] Tabela sendo consultada: "fichas"         │
│ 🚀 [LeadsRepo] Executando query no Supabase...            │
│ ✅ [LeadsRepo] Query executada com sucesso!                │
│ 📊 [LeadsRepo] Total (com filtros): 45                     │
│ 📦 [LeadsRepo] Registros retornados: 45                    │
│ 📋 [LeadsRepo] Leads finais: 45                            │
└─────────────────────────────────────────────────────────────┘
```

Quando há erro:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔌 [Supabase] Inicializando cliente Supabase              │
│ ❌ [Supabase] Erro no teste de conexão: Failed to fetch   │
├─────────────────────────────────────────────────────────────┤
│ 🔍 [LeadsRepo] Iniciando busca de leads                    │
│ 🗂️  [LeadsRepo] Tabela sendo consultada: "fichas"         │
│ ❌ [LeadsRepo] Erro ao buscar leads do Supabase            │
└─────────────────────────────────────────────────────────────┘
```

## Resumo

Agora você pode facilmente:

✅ **Ver qual tabela** está sendo consultada (sempre "fichas")  
✅ **Ver quantos registros** existem na tabela total  
✅ **Ver quantos registros** correspondem aos seus filtros  
✅ **Ver quantos leads** são exibidos na interface  
✅ **Identificar** se a tabela está vazia  
✅ **Receber sugestões** de como adicionar dados de teste

Todos esses logs aparecem automaticamente no console do navegador (F12 → Console).
