# Scripts de Migração e Sincronização

Este diretório contém scripts para sincronização e migração de dados entre os projetos TabuladorMax e Gestão Scouter, além de scripts para popular dados de teste.

## 📁 Arquivos

### 🆕 Scripts de Dados de Teste

#### ✅ `insertFakeLeads.sql` (RECOMENDADO para dados de teste)
Script SQL para inserir 20 leads fictícios na tabela `fichas`.

**Vantagens:**
- ✅ Funciona em qualquer ambiente (sem problemas de firewall)
- ✅ Execute diretamente no Supabase SQL Editor
- ✅ Não requer Node.js ou dependências
- ✅ Rápido e confiável

**Como usar:**
1. Abra o Supabase Dashboard → SQL Editor
2. Copie o conteúdo de `scripts/insertFakeLeads.sql`
3. Cole no editor e clique em "Run"
4. Pronto! 20 leads inseridos ✅

**Dados inseridos:**
- 5 projetos diferentes (4 leads cada)
- 5 scouters diferentes (4 leads cada)
- 3 etapas: Contato (8), Agendado (6), Convertido (6)
- Dados realistas com GPS, valores e status de aprovação

📚 **Instruções detalhadas:** [`SQL_SCRIPT_INSTRUCTIONS.md`](../SQL_SCRIPT_INSTRUCTIONS.md)

#### ⚠️ `insertFakeLeads.js` (Node.js - PODE TER PROBLEMAS DE FIREWALL)
Script Node.js alternativo para inserir leads fictícios.

**Limitações:**
- ❌ Pode ser bloqueado por firewalls corporativos
- ❌ Requer conexão direta à internet
- ❌ Não funciona em ambientes de CI/CD com restrições

**Erro comum:**
```
Tentei conectar aos seguintes endereços, mas fui bloqueado pelas regras do firewall:
ngestyxtopvfeyenyvgt.supabase.co
Comando de disparo: node scripts/insertFakeLeads.js (dns block)
```

**Solução:** Use `insertFakeLeads.sql` ao invés deste script! O SQL evita completamente problemas de firewall porque é executado através do navegador web no Supabase Dashboard.

**Quando usar:**
- Apenas se você tem acesso direto à internet sem restrições de firewall
- Em ambiente de desenvolvimento local sem proxy/firewall

**Como usar:**
```bash
node scripts/insertFakeLeads.js
```

---

### `analyzeLogs.ts` ⭐ NOVO

Script de análise automatizada de logs que diagnostica problemas de sincronização, repara JSON malformado e gera relatórios.

**Funcionalidades:**
- ✅ Repara JSON malformado automaticamente
- ✅ Detecta violações de política RLS
- ✅ Identifica padrões de erro recorrentes
- ✅ Calcula pontuação de saúde (0-100)
- ✅ Envia notificações para eventos críticos
- ✅ Gera relatórios em múltiplos formatos (JSON, Markdown, HTML, Text)
- ✅ Normaliza campos em português (carimbo de data/hora → timestamp)

**Uso:**

```bash
# Analisar logs de um arquivo
npm run analyze-logs -- --input logs.json

# Gerar relatório em Markdown
npm run analyze-logs -- --input logs.json --output report.md --format markdown

# Gerar relatório em HTML com notificações
npm run analyze-logs -- --input logs.json --output report.html --format html --notify

# Analisar logs do exemplo (sem arquivo)
npm run analyze-logs

# Mostrar ajuda
npm run analyze-logs -- --help
```

**Flags:**
- `--input, -i <file>`: Arquivo de entrada com logs (JSON ou texto)
- `--output, -o <file>`: Arquivo de saída para o relatório
- `--format, -f <type>`: Formato do relatório: json, markdown, html, text (padrão: markdown)
- `--notify, -n`: Habilita notificações para problemas críticos
- `--help, -h`: Mostra ajuda

**Exemplo de Saída:**

```
🔍 Starting Log Analysis...

📋 Step 1: Validating and normalizing logs...
✅ Status: VALID
📊 Logs Processed: 3
⚠️  WARNINGS:
   - Log 1: Critical error detected - nova linha viola a política de segurança...

🔎 Step 2: Analyzing logs...
🔴 Health Score: 26/100

🔴 CRITICAL ISSUES:
   1. RLS_POLICY_VIOLATION (1 occurrences)
      Row-Level Security policy violation detected in sync_logs_detailed table
      💡 Recommendation:
         CREATE POLICY "service_role_insert" ON sync_logs_detailed 
         FOR INSERT TO service_role USING (true);

🔔 Step 3: Checking for notifications...
✅ Sent 2 notification(s)
   - RLS Policy Violation Detected
   - System Health Critical

📊 Step 4: Generating report...
✅ Report saved to: sync-analysis-report.md
```

**Problema Resolvido:**

O script foi desenvolvido especificamente para resolver o problema de logs malformados do Edge Functions:

```json
{
  "event_message": "nova linha viola a política de segurança...",
  "id": "642d80d6-592a-4fe4-af48-403ea726235d",
  "log_level": "ERRO",
{
  "event_message": "desligamento",
  ...
}
```

O sistema automaticamente:
1. Repara o JSON malformado
2. Extrai objetos de log individuais
3. Normaliza campos em português
4. Detecta violações de RLS
5. Fornece soluções SQL prontas

**📚 Documentação Completa:**
- [docs/LOG_ANALYSIS.md](../docs/LOG_ANALYSIS.md) - Documentação completa (EN)
- [docs/ANALISE_LOGS_PT.md](../docs/ANALISE_LOGS_PT.md) - Documentação completa (PT)

---

### `syncDiagnostics.ts` ⭐ NOVO

Script de diagnóstico automatizado que valida configuração, conectividade e permissões para sincronização.

**Funcionalidades:**
- ✅ Valida variáveis de ambiente obrigatórias
- ✅ Testa leitura em TabuladorMax (public.leads)
- ✅ Testa leitura em Gestão Scouter (public.fichas)
- ✅ Testa escrita em Gestão Scouter (opcional, com cleanup)
- ✅ Busca amostra de leads e testa normalização
- ✅ Preview de payload (dry-run, sem gravar)
- ✅ Relatório detalhado com latências e estatísticas
- ✅ Códigos de saída (0=sucesso, 1=warnings, 2=erro fatal)

**Pré-requisitos:**

1. Variáveis de ambiente configuradas no `.env`:
   ```env
   TABULADOR_URL=https://gkvvtfqfggddzotxltxf.supabase.co
   TABULADOR_SERVICE_KEY=sua_service_role_key_tabulador
   VITE_SUPABASE_URL=https://ngestyxtopvfeyenyvgt.supabase.co
   VITE_SUPABASE_SERVICE_KEY=sua_service_role_key_gestao
   ```

2. Dependências instaladas:
   ```bash
   npm install
   ```

**Uso:**

```bash
# Usando npm scripts (recomendado)
npm run diagnostics:sync              # Dry-run (não grava)
npm run diagnostics:sync:write        # Testa escrita

# Ou diretamente com flags
npx tsx scripts/syncDiagnostics.ts --dry-run
npx tsx scripts/syncDiagnostics.ts --write-check
npx tsx scripts/syncDiagnostics.ts --sample 50 --write-check --verbose
```

**Flags:**
- `--dry-run`: Apenas simula, não grava dados (padrão: true)
- `--write-check`: Habilita teste de escrita com cleanup
- `--sample N`: Número de registros para amostra (padrão: 10)
- `--verbose`: Exibe logs detalhados
- `--help`: Mostra ajuda

**Exemplo de Saída:**

```
🔍 DIAGNÓSTICO DE SINCRONIZAÇÃO
================================================================================

[1/5] Validando Variáveis de Ambiente...
  ✅ PASS: TABULADOR_URL configurada
  ✅ PASS: TABULADOR_SERVICE_KEY configurada
  ✅ PASS: VITE_SUPABASE_URL configurada
  ✅ PASS: VITE_SUPABASE_SERVICE_KEY configurada
  ✅ PASS: URLs de projetos diferentes confirmadas

[2/5] Testando Leitura em TabuladorMax (public.leads)...
  ✅ PASS: Leitura em TabuladorMax bem-sucedida (142ms)
     Total de registros: 207458

[3/5] Testando Leitura em Gestão Scouter (public.fichas)...
  ✅ PASS: Leitura em Gestão Scouter bem-sucedida (95ms)
     Total de registros: 207000

[4/5] Teste de Escrita (SKIPPED - use --write-check)

[5/5] Buscando Amostra de Leads (10 registros)...
  ✅ PASS: Normalização concluída: 10/10 registros (234ms)

================================================================================
✅ DIAGNÓSTICO CONCLUÍDO COM SUCESSO

📊 Resumo:
  - Testes Executados: 11
  - ✅ Passou: 11
  - ❌ Falhou: 0
  - ⚠️ Avisos: 0

💡 Próximos Passos:
  1. ✅ Sistema pronto para sincronização!
  2. Execute com --write-check para testar escrita
  3. Execute npm run migrate:leads para sincronização inicial
  4. Configure triggers para sincronização em tempo real

Código de Saída: 0 (sucesso)
```

**📚 Documentação Completa**: [docs/SYNC_DIAGNOSTICS.md](../docs/SYNC_DIAGNOSTICS.md)

---

### `syncLeadsToFichas.ts`

Script principal de migração inicial que copia todos os registros da tabela `leads` (TabuladorMax) para a tabela `fichas` (Gestão Scouter).

**Funcionalidades:**
- ✅ Busca todos os leads da origem
- ✅ Normaliza tipos de dados (especialmente datas)
- ✅ Processa em lotes de 1000 registros
- ✅ Backup JSON completo no campo `raw`
- ✅ Retry automático em caso de erro
- ✅ Progress bar em tempo real
- ✅ Relatório final com estatísticas

**Pré-requisitos:**

1. Variáveis de ambiente configuradas no `.env`:
   ```env
   TABULADOR_URL=https://gkvvtfqfggddzotxltxf.supabase.co
   TABULADOR_SERVICE_KEY=sua_service_role_key_tabulador
   VITE_SUPABASE_URL=https://ngestyxtopvfeyenyvgt.supabase.co
   VITE_SUPABASE_SERVICE_KEY=sua_service_role_key_gestao
   ```

2. Dependências instaladas:
   ```bash
   npm install
   ```

**Uso:**

```bash
# Usando npm script (recomendado)
npm run migrate:leads

# Ou diretamente
npx tsx scripts/syncLeadsToFichas.ts
```

**Exemplo de Saída:**

```
🚀 Iniciando migração de Leads → Fichas
================================================================================
✅ Clientes Supabase configurados
   TabuladorMax: https://gkvvtfqfggddzotxltxf.supabase.co
   Gestão Scouter: https://ngestyxtopvfeyenyvgt.supabase.co

📥 Buscando leads da tabela de origem...
✅ Total de 207000 leads encontrados

🔄 Iniciando processamento em lotes...

📊 Progresso: 207000/207000 (100.0%) | ✅ Inseridos: 207000 | ❌ Erros: 0
================================================================================
✅ MIGRAÇÃO CONCLUÍDA

📊 Estatísticas:
   Total de leads: 207000
   Processados: 207000
   Inseridos/Atualizados: 207000
   Erros: 0
   Taxa de sucesso: 100.00%
   Tempo total: 82.8s
   Taxa média: 2500.0 registros/s
================================================================================
```

### `testMigration.ts`

Script de teste e validação da função de normalização de dados.

**Funcionalidades:**
- ✅ Testa normalização de lead completo
- ✅ Testa normalização de lead mínimo
- ✅ Testa conversão de datas
- ✅ Testa conversão de tipos
- ✅ Valida backup JSON no campo `raw`

**Uso:**

```bash
npx tsx scripts/testMigration.ts
```

## 🔧 Mapeamento de Campos

| Campo Lead (origem)   | Campo Ficha (destino) | Tipo       | Observações                    |
|----------------------|----------------------|------------|--------------------------------|
| id                   | id                   | string     | Convertido para string         |
| nome                 | nome                 | string     | -                              |
| telefone             | telefone             | string     | -                              |
| email                | email                | string     | -                              |
| idade                | idade                | string     | Sempre convertido para string  |
| projeto              | projeto              | string     | -                              |
| scouter              | scouter              | string     | -                              |
| supervisor           | supervisor           | string     | -                              |
| localizacao          | localizacao          | string     | -                              |
| latitude             | latitude             | number     | -                              |
| longitude            | longitude            | number     | -                              |
| local_da_abordagem   | local_da_abordagem   | string     | -                              |
| criado               | criado               | string     | Normalizado para YYYY-MM-DD    |
| valor_ficha          | valor_ficha          | number     | -                              |
| etapa                | etapa                | string     | -                              |
| ficha_confirmada     | ficha_confirmada     | string     | -                              |
| foto                 | foto                 | string     | -                              |
| *todos*              | raw                  | jsonb      | Backup JSON completo           |
| updated_at           | updated_at           | timestamp  | Mantido ou gerado              |
| -                    | deleted              | boolean    | Sempre false na migração       |

## 📝 Notas

### Segurança
- ⚠️ Nunca commite o arquivo `.env` com credenciais reais
- ⚠️ Use service role keys apenas em scripts server-side
- ⚠️ Mantenha as credenciais em variáveis de ambiente

### Performance
- O script processa em lotes de 1000 registros
- Taxa média esperada: 2000-3000 registros/segundo
- Para 200k registros: ~80-100 segundos

### Tratamento de Erros
- Retry automático (3 tentativas) em caso de erro de rede
- Delay exponencial entre tentativas
- Estatísticas de erros no relatório final

### Normalização de Datas
- Formatos aceitos: ISO 8601, Date objects
- Formato de saída: YYYY-MM-DD
- Datas inválidas: undefined (com warning no console)

## 🔗 Documentação Relacionada

- [README principal](../README.md) - Instruções de uso geral
- [SYNC_ARCHITECTURE.md](../SYNC_ARCHITECTURE.md) - Arquitetura de sincronização
- [Trigger SQL](../supabase/functions/trigger_sync_leads_to_fichas.sql) - Sincronização automática

## 🆘 Troubleshooting

### "Erro de configuração: TABULADOR_URL não configurada"
- Verifique se o arquivo `.env` existe na raiz do projeto
- Confirme que todas as variáveis estão definidas corretamente
- Execute `npm run diagnostics:sync` para validar configuração

### "Erro ao buscar leads: permission denied"
- Verifique se a service role key está correta
- Confirme que a service role key tem permissões para acessar a tabela `leads`
- Execute `npm run diagnostics:sync` para testar conectividade

### "Connection refused" ou "Invalid JWT"
- Verifique as URLs dos projetos no `.env`
- Confirme que as service keys são válidas
- Copie novamente as credenciais do Supabase Dashboard
- Execute `npm run diagnostics:sync` para diagnóstico completo

### "Erro ao processar lote após 3 tentativas"
- Verifique a conectividade com o Supabase
- Confirme que a tabela `fichas` existe no projeto de destino
- Verifique os logs do Supabase para mais detalhes

### Taxa de processamento muito baixa
- Verifique a latência de rede
- Considere aumentar o `BATCH_SIZE` no script (padrão: 1000)
- Verifique se há rate limiting ativo no Supabase

### Diagnóstico Automatizado

**Sempre execute o diagnóstico antes de reportar problemas:**

```bash
# Diagnóstico completo
npm run diagnostics:sync

# Com teste de escrita
npm run diagnostics:sync:write

# Com logs detalhados
npx tsx scripts/syncDiagnostics.ts --verbose
```

**Interpretação dos Códigos de Saída:**
- `0` = ✅ Tudo OK, pode prosseguir
- `1` = ⚠️ Warnings, revisar antes de prosseguir
- `2` = ❌ Erro fatal, corrigir antes de prosseguir

**Documentação Completa de Troubleshooting:**
- [docs/ANALISE_SYNC_TABULADOR.md](../docs/ANALISE_SYNC_TABULADOR.md#troubleshooting)
- [docs/SYNC_DIAGNOSTICS.md](../docs/SYNC_DIAGNOSTICS.md#ações-recomendadas)

---

### `validate-migration-setup.ts` ⭐ NOVO

**Purpose:** Validates that the TabuladorMax migration setup is complete and correct.

**Usage:**
```bash
npm run validate:migration
```

**What it validates:**
- ✅ SQL migration scripts exist
- ✅ Documentation is complete (TABULADORMAX_MIGRATION_GUIDE.md, etc.)
- ✅ Environment variables are defined (.env.example)
- ✅ Code uses correct column names (updated_at, not atualizado_at)
- ✅ No typos in column names across all files
- ✅ Edge Functions are present and compatible
- ✅ Sync scripts reference correct fields
- ✅ All migrations properly applied

**Exit Codes:**
- `0` - ✅ All validations passed
- `1` - ❌ One or more validations failed

**Example Output:**
```
================================================================================
📋 VALIDATION REPORT: TabuladorMax Migration Setup
================================================================================

✅ 1. File: TabuladorMax Incremental Sync Setup SQL
   Status: PASS
   File exists: scripts/sql/tabuladormax_incremental_sync_setup.sql

✅ 2. Content: SQL script targets public.leads table
   Status: PASS
   Contains expected content: "ALTER TABLE public.leads..."

...

✅ 16. Typo Check: No atualizado_at found
   Status: PASS
   All files use correct column name "updated_at"

================================================================================
📊 SUMMARY: 18 passed | 0 warnings | 0 failed
================================================================================

✅ All validations passed! Migration setup is ready.
```

**Related Documentation:**
- [TABULADORMAX_MIGRATION_GUIDE.md](../TABULADORMAX_MIGRATION_GUIDE.md) - Complete migration guide
- [MIGRATION_CLARIFICATION.md](../MIGRATION_CLARIFICATION.md) - Column name typo explanation

---

## 📧 Suporte

Para questões ou problemas:
1. Verifique a documentação acima
2. Consulte os logs do script para detalhes do erro
3. Verifique os logs do Supabase Dashboard
4. Abra uma issue no GitHub se o problema persistir
