# Gestão Scouter - Dashboard Analytics

> **Workspace Module**: Este módulo foi integrado ao monorepo tabuladormax como workspace package.  
> Repositório original: https://github.com/leosozza/gestao-scouter

Sistema de gestão e análise de desempenho para scouters com sincronização em tempo real com TabuladorMax.

## 🏗️ Workspace Integration

Este módulo está integrado como um workspace no monorepo tabuladormax. Para executá-lo:

```bash
# Da raiz do monorepo
npm run dev:gestao-scouter        # Desenvolvimento
npm run build:gestao-scouter      # Build

# Diretamente no workspace
npm run dev --workspace=packages/gestao-scouter
npm run build --workspace=packages/gestao-scouter
```

**Configuração de Ambiente**: Crie um arquivo `.env` em `packages/gestao-scouter/` com as variáveis necessárias (veja `.env.example`).

## 🚀 Funcionalidades Principais

- **📊 Dashboard Analítico**: Métricas em tempo real com gráficos interativos
- **📥 Importação Massiva**: Upload de CSV/XLSX até 300MB (200k+ registros)
- **🔄 Sincronização Automática**: Supabase ↔ TabuladorMax (bidirecional, a cada 5 min)
- **🗺️ Mapas Interativos**: Geolocalização em tempo real, heatmaps e clusters
- **💰 Sistema de Pagamentos**: Gestão financeira com controle de ajuda de custo
- **📈 Sistema IQS 2.0**: Índice de Qualidade do Scouter com pesos configuráveis
- **🤖 Análise por IA**: Relatórios inteligentes baseados nos dados
- **🎯 Sistema de Projeções**: Previsões e metas personalizadas
- **👥 Controle de Equipes**: Gestão de scouters, supervisores e telemarketing
- **🔐 Segurança**: Row Level Security (RLS) com permissões granulares

## 🛠️ Tecnologias

### Frontend
- React 18 + TypeScript + Vite 7
- shadcn/ui + Tailwind CSS
- React Query (TanStack Query)
- ApexCharts + Recharts
- Leaflet + OpenStreetMap (100% gratuito)
- XLSX (processamento de planilhas)

### Backend
- Supabase (PostgreSQL + Auth + Realtime)
- Edge Functions (Deno)
- Row Level Security (RLS)
- Database migrations

### Sincronização
- Sincronização bidirecional com TabuladorMax
- Queue-based sync com retry exponencial
- Logging detalhado e monitoramento
- Prevenção de loops automática

## 🏗️ Arquitetura

### 📊 Fonte Única de Dados: Tabela 'leads'

**⚠️ IMPORTANTE**: Esta aplicação utiliza **EXCLUSIVAMENTE** a tabela `leads` do Supabase como fonte de dados para leads/fichas. 

**Migração Concluída**: A tabela 'fichas' foi migrada para 'leads' em 2024-10-18.

Para informações completas sobre a arquitetura de dados, consulte: 
- [LEADS_DATA_SOURCE.md](./LEADS_DATA_SOURCE.md) - Guia completo
- [CENTRALIZACAO_LEADS_SUMMARY.md](./CENTRALIZACAO_LEADS_SUMMARY.md) - Resumo da migração

```
┌─────────────────────────────────────────────────────────────┐
│  GESTÃO SCOUTER (ngestyxtopvfeyenyvgt)                      │
│  - Aplicação principal                                      │
│  - Dashboard, analytics, relatórios                         │
│  - Tabela: leads (migrada de fichas) ← FONTE ÚNICA          │
└─────────────────────────────────────────────────────────────┘
                          ↕ SYNC (5 min)
┌─────────────────────────────────────────────────────────────┐
│  TABULADORMAX (gkvvtfqfggddzotxltxf)                        │
│  - Fonte de dados original                                  │
│  - Sistema legado/externo                                   │
│  - Sincronização bidirecional de leads                      │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Sincronização com TabuladorMax

Este projeto recebe dados do **TabuladorMax** através de sincronização PUSH unidirecional.

### Como Funciona

**TabuladorMax → Gestão Scouter** (PUSH)
- O TabuladorMax envia dados para a tabela `leads` do Gestão Scouter
- Usa REST API com Service Role Key do TabuladorMax
- Edge Function `export-to-gestao-scouter-batch` no TabuladorMax
- Processamento em lotes com validação de schema
- Interface de monitoramento completa no TabuladorMax

### O que é Necessário no Gestão Scouter

1. ✅ Tabela `public.leads` com 49 campos (já configurada)
2. ✅ RLS policies para service_role (já configuradas)
3. ❌ **NENHUMA Edge Function necessária**

**Importante:** Não é necessário criar Edge Functions no Gestão Scouter para receber dados. O TabuladorMax acessa a tabela `leads` diretamente via REST API.

### Documentação Completa

📖 **[Arquitetura de Sincronização](./SYNC_ARCHITECTURE_GESTAO_SCOUTER.md)** - Guia completo da arquitetura  
🔧 **[Troubleshooting](#-erros-comuns-de-sincronização)** - Soluções para problemas comuns

### Erros Comuns

**"get-leads-count não encontrada"**  
✅ Erro corrigido - essa função não é necessária no Gestão Scouter

**"Connection failed"**  
→ Verifique as credenciais no TabuladorMax (URL + Service Key do Gestão Scouter)

**"Schema inválido"**  
→ Execute a validação de schema no TabuladorMax e aplique as correções sugeridas

### Estrutura do Projeto

```
gestao-scouter/
├── src/
│   ├── components/         # Componentes React
│   │   ├── dashboard/      # Dashboard e importação
│   │   ├── map/            # Mapas interativos
│   │   ├── charts/         # Gráficos
│   │   └── ui/             # Componentes UI (shadcn)
│   ├── hooks/              # Custom hooks
│   ├── pages/              # Páginas principais
│   ├── repositories/       # Data access layer
│   ├── services/           # Serviços e utils
│   └── types/              # TypeScript types
├── supabase/
│   ├── functions/          # Edge Functions
│   │   └── sync-tabulador/ # Sincronização automática
│   └── migrations/         # Database migrations
└── public/                 # Assets estáticos
```

### O que é o IQS?

O IQS é um indicador que mede a qualidade do trabalho do scouter baseado em métricas ponderadas. Cada ação realizada pelo scouter (foto, confirmação, contato, etc.) tem um peso configurável que contribui para o cálculo final do índice.

### Como Configurar o IQS

1. **Acesse a Página de Configurações**
   - Menu lateral → Configurações
   - Ou clique no ícone de engrenagem no dashboard

2. **Aba "Parâmetros"**
   - **Valor Base Ficha**: Valor padrão em R$ para cada ficha
   - **Quality Threshold**: Limite mínimo para considerar uma ficha de qualidade (%)
   - **Pesos**: Configure o peso de cada métrica (0.0 a 10.0):
     - Peso Foto
     - Peso Confirmada
     - Peso Contato
     - Peso Agendado
     - Peso Compareceu
     - Peso Interesse
     - Peso Conclusão Positiva
     - Peso Conclusão Negativa
     - Peso Sem Interesse Definitivo
     - Peso Sem Contato
     - Peso Sem Interesse no Momento

3. **Aba "Classificações"**
   - Configure a ajuda de custo (R$/semana) para cada tier:
     - Bronze
     - Prata
     - Ouro
     - Diamante

4. **Salvar Configurações**
   - Clique em "Salvar" para persistir as alterações
   - As mudanças são refletidas automaticamente no dashboard e projeções

### Cálculo do IQS

```
IQS = (Soma dos pontos ponderados / Total de pesos aplicáveis) × 100
```

**Exemplo:**
- Se uma ficha tem foto (peso 1.0) e está confirmada (peso 1.0)
- Pontos ponderados = 2.0
- Total de pesos = soma de todos os pesos configurados
- IQS = (2.0 / total_pesos) × 100

## 📊 Sistema IQS 2.0 (Índice de Qualidade do Scouter)

- ✅ Alterações nas configurações atualizam o dashboard automaticamente
- ✅ IQS é recalculado sempre que os filtros ou settings mudam
- ✅ Persistência real via Supabase (tabela `app_settings`)
- ✅ Cache inteligente com React Query (5 minutos de stale time)

## 🔧 Instalação e Uso

### Pré-requisitos
- Node.js 18+ ([instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm ou yarn
- Conta no Supabase

### Configuração Local

```sh
# 1. Clone o repositório
git clone https://github.com/leosozza/gestao-scouter.git
cd gestao-scouter

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Supabase

# 4. Inicie o servidor de desenvolvimento
npm run dev

# 5. Build para produção
npm run build

# 6. Preview da build de produção
npm run preview
```

### Variáveis de Ambiente

```env
VITE_SUPABASE_PROJECT_ID=ngestyxtopvfeyenyvgt
VITE_SUPABASE_URL=https://ngestyxtopvfeyenyvgt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
```

## 📥 Importação Inicial de Dados

### Passo 1: Preparar CSV

Crie um arquivo CSV com as seguintes colunas (aceita variações de nomes):

**Campos principais:**
- ID, Nome, Projeto, Scouter, Data, Telefone, Email, Idade, Valor, LAT, LNG

**Exemplo:**
```csv
ID,Nome,Projeto,Scouter,Data,Telefone,Email,Idade,Valor,LAT,LNG
1,João Silva,Projeto A,Maria,15/01/2025,(11) 98765-4321,joao@email.com,25,R$ 50,00,-23.5505,-46.6333
```

### Passo 2: Importar via Dashboard

1. Acesse Dashboard → Botão "Importação Massiva (CSV)"
2. Selecione o arquivo CSV/XLSX (até 300MB)
3. Clique em "Iniciar Importação"
4. Aguarde processamento (progress bar em tempo real)

**Capacidade:**
- Até 300 MB por arquivo
- Até 200.000+ registros
- Processamento em ~8 minutos (200k registros)

📖 **Documentação completa**: [CSV_IMPORT_GUIDE.md](./CSV_IMPORT_GUIDE.md)

## 🔄 Sincronização com TabuladorMax

A sincronização entre a tabela `leads` (TabuladorMax) e a tabela `fichas` (Gestão Scouter) pode ser feita de duas formas:

> Nota: desde 2024-10-18, `fichas` é legado. Utilize estas estratégias apenas para compatibilidade temporária ou migrações. A aplicação utiliza exclusivamente `leads` como fonte única.

### 📊 Diagnóstico e Monitoramento

**NOVO**: Sistema completo de diagnóstico e monitoramento de sincronização!

```bash
# Executar diagnóstico completo (dry-run, não grava dados)
npm run diagnostics:sync

# Executar diagnóstico com teste de escrita
npm run diagnostics:sync:write

# Diagnóstico customizado
npx tsx scripts/syncDiagnostics.ts --sample 50 --write-check --verbose
```

O script de diagnóstico valida:
- ✅ Configuração de variáveis de ambiente
- ✅ Conectividade com ambos os projetos Supabase
- ✅ Permissões de leitura (TabuladorMax) e escrita (Gestão Scouter)
- ✅ Integridade do mapeamento de dados
- ✅ Simulação de sincronização (preview de payload)

**📚 Documentação Completa**:
- [Análise de Sincronização](./docs/ANALISE_SYNC_TABULADOR.md) - Arquitetura, troubleshooting e queries
- [Guia de Diagnóstico](./docs/SYNC_DIAGNOSTICS.md) - Como usar o script de diagnóstico

### 1. Sincronização Automática via Triggers (Recomendado para legado)

Sincronização em tempo real usando triggers SQL no PostgreSQL. Qualquer alteração (INSERT, UPDATE, DELETE) na tabela `leads` é automaticamente propagada para a tabela `fichas` para compatibilidade com sistemas legados que ainda leem `fichas`.

#### Configuração dos Triggers

**Passo 1: Habilitar extensão HTTP no projeto TabuladorMax**

Execute no SQL Editor do Supabase (projeto TabuladorMax):

```sql
CREATE EXTENSION IF NOT EXISTS http;
```

**Passo 2: Configurar variáveis de ambiente**

Execute no SQL Editor do Supabase (projeto TabuladorMax):

```sql
-- Configurar URL do Gestão Scouter
ALTER DATABASE postgres SET app.gestao_scouter_url = 'https://ngestyxtopvfeyenyvgt.supabase.co';

-- Configurar Service Key do Gestão Scouter
ALTER DATABASE postgres SET app.gestao_scouter_service_key = 'sua_service_role_key_aqui';

-- Recarregar configurações
SELECT pg_reload_conf();
```

**Passo 3: Executar script de triggers**

Execute o arquivo `supabase/functions/trigger_sync_leads_to_fichas.sql` no SQL Editor do Supabase (projeto TabuladorMax).

```bash
# Copie o conteúdo do arquivo e execute no SQL Editor
cat supabase/functions/trigger_sync_leads_to_fichas.sql
```

**Passo 4: Verificar instalação**

```sql
-- Verificar se os triggers estão ativos
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'public.leads'::regclass;

-- Deve mostrar 3 triggers:
-- - trigger_sync_lead_insert
-- - trigger_sync_lead_update
-- - trigger_sync_lead_delete
```

#### Monitoramento

Os logs de sincronização podem ser visualizados nos logs do PostgreSQL no Supabase Dashboard:

- **Database** → **Logs** → filtrar por "sync_lead_to_fichas"

### 2. Migração Inicial de Dados

Para fazer a primeira carga de dados da tabela `leads` para a tabela `fichas`, use o script TypeScript:

**Passo 1: Configurar variáveis de ambiente**

Edite o arquivo `.env` e adicione:

```env
# TabuladorMax (origem)
TABULADOR_URL=https://gkvvtfqfggddzotxltxf.supabase.co
TABULADOR_SERVICE_KEY=sua_service_role_key_tabulador

# Gestão Scouter (destino)
VITE_SUPABASE_URL=https://ngestyxtopvfeyenyvgt.supabase.co
VITE_SUPABASE_SERVICE_KEY=sua_service_role_key_gestao
```

**Passo 2: Instalar dependências**

```bash
npm install
```

**Passo 3: Executar script de migração**

```bash
# Usando o script npm (recomendado)
npm run migrate:leads

# Ou diretamente com npx tsx
npx tsx scripts/syncLeadsToFichas.ts
```

O script irá:
- ✅ Buscar todos os leads da tabela `leads` (TabuladorMax)
- ✅ Normalizar tipos de dados (especialmente datas)
- ✅ Fazer upsert na tabela `fichas` (Gestão Scouter)
- ✅ Incluir backup JSON completo no campo `raw`
- ✅ Processar em lotes de 1000 registros
- ✅ Exibir progresso em tempo real
- ✅ Gerar relatório final com estatísticas

**Exemplo de saída:**

```
🚀 Iniciando migração de Leads → Fichas
================================================================================
✅ Clientes Supabase configurados
   TabuladorMax: https://gkvvtfqfggddzotxltxf.supabase.co
   Gestão Scouter: https://ngestyxtopvfeyenyvgt.supabase.co

📥 Buscando leads da tabela de origem...
   Página 1: 1000 registros
   Página 2: 1000 registros
   ...
✅ Total de 207000 leads encontrados

🔄 Iniciando processamento em lotes...

📊 Progresso: 207000/207000 (100.0%) | ✅ Inseridos: 207000 | ❌ Erros: 0 | ⚡ 2500.0 reg/s
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

### 3. Sincronização Bidirecional (Edge Function)

A sincronização bidirecional via Edge Function continua disponível e ocorre a cada **5 minutos**:

- **Gestão Scouter** ↔ **TabuladorMax**: Sincronização bidirecional
- **Conflict Resolution**: Última modificação vence (`updated_at`)
- **Logs de Auditoria**: Tabela `sync_logs` registra todas as operações
- **Status em Tempo Real**: Tabela `sync_status` monitora saúde da sync

### Monitorar Sincronização

```sql
-- Ver últimas sincronizações
SELECT * FROM sync_logs 
ORDER BY started_at DESC 
LIMIT 10;

-- Ver status atual
SELECT * FROM sync_status;

-- Ver registros modificados recentemente
SELECT id, nome, projeto, updated_at 
FROM fichas 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

📖 **Documentação completa**: [SYNC_ARCHITECTURE.md](./SYNC_ARCHITECTURE.md)

### 4. Deployment de Sincronização Bidirecional

Para configurar a sincronização bidirecional completa em produção, siga o guia detalhado:

📚 **[DEPLOYMENT_SYNC_BIDIRECTIONAL.md](./DEPLOYMENT_SYNC_BIDIRECTIONAL.md)** - Guia Completo de Deployment

**Deploy Automatizado:**
```bash
# Deploy de todas as Edge Functions de sincronização
npm run deploy:sync
```

**Verificação do Setup:**
```bash
# No Gestão Scouter - Execute no SQL Editor
# scripts/verify-sync-setup.sql

# No TabuladorMax - Execute no SQL Editor
# scripts/verify-tabulador-triggers.sql
```

**Checklist de Deployment:**
- [ ] Migrations aplicadas no Gestão Scouter
- [ ] Secrets configurados nas Edge Functions
- [ ] Edge Functions deployed
- [ ] Triggers instalados no TabuladorMax
- [ ] Cron jobs configurados
- [ ] Testes de sincronização executados

## 🗺️ Sistema de Mapas

A aplicação usa uma **solução 100% gratuita** e confiável para visualização geográfica:

- **Biblioteca**: Leaflet.js (MIT License, gratuito)
- **Tiles**: OpenStreetMap (gratuito, sem limites)
- **Heatmap**: leaflet.heat plugin (MIT License)
- **Geocoding**: Nominatim API (gratuito com cache)

### Funcionalidades
- ✅ Rastreamento em tempo real de scouters
- ✅ Mapa de calor de densidade de fichas
- ✅ Markers customizados por tier (Bronze/Prata/Ouro)
- ✅ Filtros por período, projeto e scouter
- ✅ Geocodificação automática de endereços

### Documentação Completa
- **[Guia Rápido de Mapas](./MAPS_QUICK_REFERENCE.md)** - Como usar e customizar
- **[Solução Detalhada de Mapas](./MAPS_SOLUTION.md)** - Arquitetura e alternativas
- **[Funcionalidade de Geolocalização](./GEOLOCATION_FEATURE.md)** - Implementação técnica

### Custo Total: R$ 0,00 🎉
Sem necessidade de API keys do Google Maps ou Mapbox. Escalável e sem vendor lock-in.

## 🔒 Segurança

### Status de Segurança
- ✅ **esbuild**: Atualizado para v0.24.3+
- ✅ **jsPDF**: Vulnerabilidade de DoS corrigida  
- ✅ **Vite**: Atualizado para v7.1.7
- ⚠️ **xlsx**: Vulnerabilidade de prototype pollution (planejada substituição)

### Melhores Práticas
- Validação de tipos TypeScript
- Sanitização de inputs
- Headers de segurança configurados
- Autenticação via Supabase Auth

## 📈 Performance

### Otimizações Implementadas
- **Bundle Size**: Reduzido de 1MB+ para chunks < 400KB
- **Lazy Loading**: Carregamento sob demanda de páginas
- **Code Splitting**: Separação inteligente de dependências
- **Tree Shaking**: Remoção de código não utilizado
- **Gzip Compression**: ~70% redução de tamanho

### Métricas
- **Largest Chunk**: 392KB (charts)
- **Main App**: ~100KB
- **UI Components**: 95KB
- **Load Time**: < 2s em conexões 3G

## 🧪 Desenvolvimento

### Scripts Disponíveis
```sh
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de produção  
npm run preview    # Preview da build
npm run lint       # Análise de código
npm run lint:fix   # Correção automática
```

### Padrões de Código
- **ESLint**: Configuração TypeScript + React
- **Prettier**: Formatação automática
- **Husky**: Git hooks para qualidade
- **Conventional Commits**: Padronização de commits

## 📝 Contribuição

1. Fork o projeto
2. Crie uma branch feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📞 Suporte

- **Documentação**: Ver `/docs` no repositório
- **Issues**: GitHub Issues para bugs e sugestões
- **Discussões**: GitHub Discussions para dúvidas

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Desenvolvido com ❤️ para otimização de processos de scouting**

## 📦 Migração Fichas → Leads (2024-10-18)

### 🎯 Resumo da Migração

Em 2024-10-18, a aplicação migrou de usar a tabela `fichas` para a tabela `leads` como fonte única de verdade. Esta migração:

- ✅ Criou nova tabela `leads` com schema completo (70+ colunas)
- ✅ Migrou todos os dados de `fichas` para `leads`
- ✅ Atualizou 25+ arquivos TypeScript
- ✅ Atualizou todas as Edge Functions
- ✅ Manteve compatibilidade com APIs existentes
- ✅ Criou view `fichas_compat` para rollback

### 📋 Como Aplicar a Migração

**1. Execute a migration SQL no Supabase:**

```bash
# No Supabase SQL Editor, execute:
supabase/migrations/20251018_migrate_fichas_to_leads.sql
```

**2. Verifique a migração:**

```bash
# Execute o script de verificação
npm run verify:leads
```

**3. Monitore os logs:**

Após deploy, verifique:
- Queries funcionando corretamente
- Dados migrados com integridade
- Sincronização operacional

### ⚠️ Rollback (Se Necessário)

Se precisar reverter temporariamente:

1. A view `fichas_compat` mapeia `leads` → `fichas`
2. A tabela `fichas` ainda existe (não foi dropada)
3. Reverta o código para commit anterior

### 🧹 Cleanup (Após 2 Semanas)

Após validação completa:

```sql
-- Dropar tabela antiga
DROP TABLE IF EXISTS public.fichas CASCADE;

-- Dropar view de compatibilidade
DROP VIEW IF EXISTS public.fichas_compat;
```

### 📚 Documentação Completa

- [CENTRALIZACAO_LEADS_SUMMARY.md](./CENTRALIZACAO_LEADS_SUMMARY.md) - Resumo técnico da migração
- [LEADS_DATA_SOURCE.md](./LEADS_DATA_SOURCE.md) - Guia de desenvolvimento
- `scripts/verify-leads-centralization.sh` - Script de verificação