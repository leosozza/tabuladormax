# Como Executar o Script SQL de Leads Fictícios

## ⚠️ Problemas com Firewall?

**Se você receber erro de DNS block ou firewall ao executar `node scripts/insertFakeLeads.js`:**

O script Node.js tenta conectar diretamente ao Supabase via internet, o que pode ser bloqueado por:
- Firewalls corporativos
- Ambientes de CI/CD com restrições de rede
- Redes com políticas de segurança restritivas

**SOLUÇÃO:** Use o script SQL ao invés do Node.js! O SQL é executado diretamente no Supabase Dashboard (que você acessa pelo navegador), evitando bloqueios de firewall.

## 📋 Pré-requisitos

- Acesso ao Supabase Dashboard
- Permissões para executar SQL no projeto
- Projeto: `ngestyxtopvfeyenyvgt.supabase.co`

## 🚀 Passo a Passo

### Opção 1: Via Supabase Dashboard (✅ RECOMENDADO - Evita Firewall)

1. **Acesse o Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Faça login com suas credenciais

2. **Selecione o Projeto**
   - Projeto ID: `ngestyxtopvfeyenyvgt`
   - Nome: Gestão Scouter

3. **Abra o SQL Editor**
   - No menu lateral, clique em "SQL Editor"
   - Ou acesse diretamente: https://supabase.com/dashboard/project/ngestyxtopvfeyenyvgt/sql

4. **Execute o Script**
   - Clique em "New Query"
   - Copie o conteúdo do arquivo `scripts/insertFakeLeads.sql`
   - Cole no editor
   - Clique em "Run" (ou pressione Ctrl+Enter)

5. **Verifique o Resultado**
   - Você deve ver: "Success. No rows returned"
   - Na seção inferior, verifique os SELECTs de verificação:
     ```
     total_leads: 20
     
     projeto | quantidade
     --------|----------
     Projeto A | 4
     Projeto B | 4
     ...
     ```

6. **Visualize os Dados**
   - Vá para "Table Editor" no menu lateral
   - Selecione a tabela `fichas`
   - Você deve ver 20 novos registros

### Opção 2: Via Supabase CLI (⚠️ Pode ter problemas de firewall)

```bash
# 1. Instalar Supabase CLI (se não tiver)
npm install -g supabase

# 2. Fazer login
supabase login

# 3. Link com o projeto
supabase link --project-ref ngestyxtopvfeyenyvgt

# 4. Executar o script
supabase db execute --file scripts/insertFakeLeads.sql

# 5. Verificar
supabase db execute --sql "SELECT COUNT(*) FROM fichas;"
```

## 📊 Dados Inseridos

### Resumo Estatístico

**Total de Leads:** 20

**Por Projeto:**
- Projeto A: 4 leads (20%)
- Projeto B: 4 leads (20%)
- Projeto Teste: 4 leads (20%)
- Casting Fashion: 4 leads (20%)
- Casting Editorial: 4 leads (20%)

**Por Etapa:**
- Contato: 8 leads (40%)
- Agendado: 6 leads (30%)
- Convertido: 6 leads (30%)

**Por Scouter:**
- João Scouter: 4 leads
- Maria Scouter: 4 leads
- Pedro Scouter: 4 leads
- Ana Scouter: 4 leads
- Sistema: 4 leads

**Por Modelo:**
- Fashion: 4 leads
- Editorial: 4 leads
- Comercial: 4 leads
- Fitness: 4 leads
- Plus Size: 4 leads

**Por Status de Aprovação:**
- Aprovados (true): 12 leads (60%)
- Reprovados (false): 4 leads (20%)
- Pendentes (null): 4 leads (20%)

**Localizações:**
- São Paulo, SP: 4 leads
- Rio de Janeiro, RJ: 4 leads
- Belo Horizonte, MG: 3 leads
- Curitiba, PR: 3 leads
- Porto Alegre, RS: 3 leads
- Salvador, BA: 2 leads
- Brasília, DF: 1 lead

## 🔍 Verificação

### Queries de Teste

```sql
-- 1. Verificar total de leads
SELECT COUNT(*) as total_leads FROM public.fichas;
-- Esperado: 20 ou mais (se já havia dados)

-- 2. Verificar leads por projeto
SELECT projeto, COUNT(*) as quantidade 
FROM public.fichas 
GROUP BY projeto 
ORDER BY quantidade DESC;

-- 3. Verificar leads por etapa
SELECT etapa, COUNT(*) as quantidade 
FROM public.fichas 
GROUP BY etapa 
ORDER BY quantidade DESC;

-- 4. Verificar leads por scouter
SELECT scouter, COUNT(*) as quantidade 
FROM public.fichas 
GROUP BY scouter 
ORDER BY quantidade DESC;

-- 5. Verificar leads aprovados
SELECT aprovado, COUNT(*) as quantidade 
FROM public.fichas 
GROUP BY aprovado 
ORDER BY aprovado;

-- 6. Ver os 5 leads mais recentes
SELECT nome, telefone, projeto, etapa, criado
FROM public.fichas
ORDER BY criado DESC
LIMIT 5;
```

## ⚠️ Notas Importantes

### Dados Fictícios
- Todos os dados são FICTÍCIOS para fins de teste
- Telefones, emails e nomes são gerados aleatoriamente
- NÃO use estes dados em ambiente de produção real
- Coordenadas GPS são aproximadas de cidades brasileiras

### Limpeza (Se Necessário)
Para remover APENAS os leads fictícios criados por este script:

```sql
-- CUIDADO: Isso remove leads específicos. Verifique antes!
DELETE FROM public.fichas
WHERE telefone IN (
  '(11) 98765-4321',
  '(21) 97654-3210',
  '(31) 96543-2109',
  -- ... adicione os outros telefones se necessário
);
```

Para remover TODOS os leads (⚠️ PERIGO):

```sql
-- PERIGO: Isso remove TODOS os leads da tabela!
-- USE APENAS EM AMBIENTE DE DESENVOLVIMENTO!
TRUNCATE TABLE public.fichas RESTART IDENTITY CASCADE;
```

## 🐛 Solução de Problemas

### ❌ Erro: DNS block / Firewall bloqueou ngestyxtopvfeyenyvgt.supabase.co

**Sintoma:** 
```
Tentei conectar aos seguintes endereços, mas fui bloqueado pelas regras do firewall:
ngestyxtopvfeyenyvgt.supabase.co
Comando de disparo: node scripts/insertFakeLeads.js (dns block)
```

**Causa:** 
Seu ambiente (rede corporativa, CI/CD, etc.) bloqueia conexões diretas ao Supabase.

**Solução:** 
**NÃO é possível impedir o firewall de bloquear diretamente.** Em vez disso, use o **script SQL** que funciona através do navegador:

1. ✅ **Use `scripts/insertFakeLeads.sql` ao invés de `.js`**
2. Execute pelo Supabase Dashboard (web browser)
3. O navegador já tem acesso permitido, então não há bloqueio

**Por que isso funciona?**
- O script Node.js (`insertFakeLeads.js`) tenta conectar diretamente ao Supabase via código
- O script SQL é executado no navegador, que já passou pela autenticação web
- Firewalls geralmente permitem tráfego HTTPS do navegador, mas bloqueiam scripts

**Alternativas se precisar usar Node.js:**
1. Configure um proxy ou VPN
2. Execute em um ambiente sem restrições de rede
3. Peça ao administrador de rede para adicionar `*.supabase.co` na whitelist
4. Use um ambiente de desenvolvimento local sem firewall restritivo

### Erro: "permission denied for table fichas"
**Solução:** Verifique se você tem permissões adequadas no Supabase. Você pode precisar:
1. Verificar Row Level Security (RLS) policies
2. Usar Service Role Key ao invés de Anon Key
3. Contatar o administrador do projeto

### Erro: "duplicate key value violates unique constraint"
**Solução:** Alguns leads já existem no banco. Você pode:
1. Modificar os valores únicos (telefone, email) no script
2. Excluir os leads existentes primeiro
3. Usar UPSERT ao invés de INSERT

### Nenhum Registro Aparece na Interface
**Possíveis Causas:**
1. RLS policies bloqueando visualização
2. Filtros aplicados na página de Leads
3. Cache do browser - tente fazer hard refresh (Ctrl+Shift+R)
4. Verificar console do browser para erros

**Solução:**
```sql
-- Verificar se os dados estão no banco
SELECT COUNT(*) FROM public.fichas;

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'fichas';
```

## 📱 Validação na Interface

Após executar o script:

1. **Acesse a Aplicação**
   - URL: http://localhost:8080 (dev) ou URL de produção
   - Faça login se necessário

2. **Navegue para Leads**
   - Menu lateral → "Leads"
   - Ou acesse diretamente: /leads

3. **Verifique os Cards de Resumo**
   - Total de Leads: deve mostrar 20 (ou mais se havia dados)
   - Convertidos: deve mostrar 6
   - Agendados: deve mostrar 6
   - Aprovados: deve mostrar 12

4. **Verifique a Tabela**
   - Deve listar os 20 leads fictícios
   - Teste a busca e filtros
   - Teste a paginação (se houver mais de 10 leads)

5. **Teste a Exportação**
   - Clique no botão "Exportar" no DataTable
   - Verifique se o CSV contém os dados corretos

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do console (F12 → Console)
2. Verifique os logs do Supabase Dashboard
3. Consulte a documentação: `LEADS_IMPROVEMENTS_DOCUMENTATION.md`
4. Abra uma issue no GitHub com detalhes do erro

---

**Última atualização:** 2025-10-17  
**Versão do Script:** 1.0  
**Autor:** GitHub Copilot
