# Fonte Única de Verdade: Tabela 'leads'

## ⚠️ ATENÇÃO DESENVOLVEDORES

Esta aplicação utiliza **EXCLUSIVAMENTE** a tabela `leads` do Supabase como fonte de dados para leads/fichas.

## 🎯 Fonte Centralizada

### ✅ USE SEMPRE

**Tabela no Supabase:**
- `leads` - Fonte única e centralizada de todos os leads

**Repositories (camada de acesso a dados):**
- `src/repositories/leadsRepo.ts` - Função `getLeads()`
- `src/repositories/dashboardRepo.ts` - Função `getDashboardData()`
- `src/repositories/fichasRepo.ts` - Função `fetchFichasFromDB()` (migrado para usar 'leads')

**Hooks React:**
- `src/hooks/useFichas.ts` - Hook principal para buscar fichas (migrado para usar 'leads')
- `src/hooks/useLeadsFilters.ts` - Filtros de leads

**Services:**
- `src/services/dashboardQueryService.ts` - Queries dinâmicas do dashboard

### ❌ NÃO USE

**Tabelas legadas/descontinuadas:**
- ~~`fichas`~~ - Tabela migrada para 'leads'
- ~~`bitrix_leads`~~ - Apenas para referência histórica, não usar como fonte

**Serviços descontinuados:**
- ~~`MockDataService`~~ - Apenas para testes locais offline

## 📋 Fluxo de Dados

```
TabuladorMax → Supabase Edge Function → Tabela 'leads' → Repository → Hook → Componente
```

1. **Origem**: TabuladorMax (sistema legado/externo)
2. **Sincronização**: Edge Functions do Supabase (sync functions)
3. **Armazenamento**: Tabela `leads` no Supabase
4. **Acesso**: Repositories centralizados
5. **Consumo**: Hooks e componentes React

## 🔧 Como Usar

### Buscar Leads em um Componente

```typescript
import { useQuery } from '@tanstack/react-query';
import { getLeads } from '@/repositories/leadsRepo';

function MeuComponente() {
  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => getLeads()
  });
  
  // ou use o hook direto:
  // const { data: fichas } = useFichas();
}
```

### Buscar com Filtros

```typescript
import { getLeads } from '@/repositories/leadsRepo';

const leads = await getLeads({
  dataInicio: '2024-01-01',
  dataFim: '2024-12-31',
  scouter: 'João Silva',
  projeto: 'Campanha 2024'
});
```

### Buscar Dados para Dashboard

```typescript
import { getDashboardData } from '@/repositories/dashboardRepo';

const { data, missingFields } = await getDashboardData({
  start: '2024-01-01',
  end: '2024-12-31',
  scouter: 'Maria Santos',
  projeto: 'Projeto Alpha'
});
```

## 📊 Estrutura da Tabela 'leads'

```sql
CREATE TABLE public.leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Core fields
  scouter TEXT,
  projeto TEXT,
  criado DATE,
  valor_ficha NUMERIC(12,2),
  deleted BOOLEAN DEFAULT false,
  
  -- Contact information
  nome TEXT,
  telefone TEXT,
  email TEXT,
  celular TEXT,
  
  -- Geolocation
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  localizacao TEXT,
  
  -- Lead details
  modelo TEXT,
  etapa TEXT,
  idade INTEGER,
  foto TEXT,
  
  -- Confirmation and validation
  ficha_confirmada BOOLEAN DEFAULT false,
  cadastro_existe_foto BOOLEAN DEFAULT false,
  presenca_confirmada BOOLEAN DEFAULT false,
  compareceu BOOLEAN DEFAULT false,
  aprovado BOOLEAN,
  
  -- Scheduling
  data_agendamento DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
  
  -- ... and 40+ more fields for complete lead management
);
```

## 🧪 Dados de Teste

### Para Criar Dados de Teste

**Use o script de migração:**
```bash
npm run migrate:leads
```

**Ou insira diretamente na tabela 'leads':**
```sql
INSERT INTO public.leads (id, raw, scouter, projeto, criado, valor_ficha)
VALUES (
  'TEST-001',
  '{"nome": "João Silva", "telefone": "11999999999"}'::jsonb,
  'Scouter Teste',
  'Projeto Teste',
  '2024-01-01',
  150.00
);
```

**Mock Service (apenas desenvolvimento local):**
```typescript
// APENAS para testes offline - não usar em produção!
import { MockDataService } from '@/services/mockDataService';
const testData = await MockDataService.fetchFichas();
```

## 🚀 Migrations

Ao criar novas features ou popular dados de teste:

1. **Sempre popule a tabela 'fichas'**
2. **Use os scripts fornecidos:**
   - `scripts/syncLeadsToFichas.ts` - Migração de dados legados
   - `scripts/testMigration.ts` - Validação e exemplos
3. **Siga a estrutura da migration:**
   - `supabase/migrations/20250929_create_fichas.sql`

## 📝 Checklist para Novos Desenvolvedores

Ao trabalhar com dados de leads/fichas:

- [ ] Estou usando a tabela `leads`?
- [ ] Estou usando o repository correto (`leadsRepo.ts`)?
- [ ] Estou evitando tabelas legadas (`fichas` migrada, `bitrix_leads`)?
- [ ] Não estou usando `MockDataService` em código de produção?
- [ ] Minhas queries incluem `.eq('deleted', false)` ou `.or('deleted.is.false,deleted.is.null')`?
- [ ] Estou tratando erros adequadamente?

## 🐛 Solução de Problemas

### Problema: "Não encontro dados de leads"
**Solução:** Certifique-se de usar `getLeads()` de `leadsRepo.ts` que consulta a tabela 'leads'

### Problema: "Dados desatualizados"
**Solução:** Verifique se a sincronização com TabuladorMax está ativa

### Problema: "MockDataService em produção"
**Solução:** Remova imports do MockDataService do código de produção

### Problema: "Referências à tabela fichas"
**Solução:** A tabela `fichas` foi migrada para `leads`. Atualize todas as referências.

## 📚 Referências

- **Documentação Principal**: README.md
- **Copilot Instructions**: .github/copilot-instructions.md
- **Migration Script**: supabase/migrations/20251018_migrate_fichas_to_leads.sql
- **Schema SQL**: supabase/migrations/20251018_migrate_fichas_to_leads.sql

## 🔄 Histórico de Mudanças

- **2024-10-18**: Migração completa de 'fichas' para 'leads' como fonte única
- **2024-10-16**: Centralização completa na tabela 'fichas' (agora migrada)
- **2024-09-29**: Criação da tabela 'fichas' como fonte única (agora obsoleta)
- **2024-09-16**: Migrations iniciais do Supabase
- **2024-08-18**: Tabelas legadas (bitrix_leads)

---

**Última atualização:** 2024-10-18  
**Mantido por:** Equipe Gestão Scouter
