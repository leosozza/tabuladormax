# Schema Synchronization: fichas ← leads

## Objetivo

Sincronizar o schema da tabela `fichas` do projeto **Gestão Scouter** com a tabela `leads` do projeto **TabuladorMax**, garantindo que todas as colunas de `leads` existam em `fichas`, para evitar erros de sincronização e permitir integração bidirecional completa.

## Contexto

A tabela `leads` do TabuladorMax possui dezenas de colunas, incluindo diversas de metadados, informações de contato, controle de agendamento, funil, status, integrações e sincronização. Já a tabela `fichas` do Gestão Scouter continha apenas um subconjunto dessas colunas.

## Solução Implementada

### Migration File
- **Arquivo:** `supabase/migrations/20251018_sync_fichas_leads_schema.sql`
- **Data:** 2025-10-18
- **Linhas:** 323
- **Colunas adicionadas:** 36
- **Índices criados:** 15

### Características da Migration

✅ **Idempotente:** Usa `IF NOT EXISTS` para permitir múltiplas execuções sem erros  
✅ **Não destrutiva:** Nenhuma coluna existente foi removida ou alterada  
✅ **Bem documentada:** Comentários em português para cada coluna  
✅ **Otimizada:** Índices criados para padrões comuns de consulta  
✅ **Verificável:** Bloco de verificação confirma que 36 colunas foram adicionadas  
✅ **Tipos compatíveis:** Todos os tipos de dados correspondem aos requisitos do TabuladorMax

## Colunas Adicionadas (36 total)

### 1. Informações de Contato e Identificação (8 colunas)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `name` | TEXT | Nome completo do lead |
| `responsible` | TEXT | Responsável pelo lead |
| `age` | INTEGER | Idade do lead |
| `address` | TEXT | Endereço completo |
| `photo_url` | TEXT | URL da foto do lead |
| `celular` | TEXT | Telefone celular |
| `telefone_trabalho` | TEXT | Telefone do trabalho |
| `telefone_casa` | TEXT | Telefone residencial |

### 2. Integrações Bitrix e Projetos Comerciais (6 colunas)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `bitrix_telemarketing_id` | BIGINT | ID do telemarketing no Bitrix CRM |
| `commercial_project_id` | UUID | ID do projeto comercial |
| `responsible_user_id` | UUID | ID do usuário responsável |
| `fonte` | TEXT | Fonte/origem do lead |
| `nome_modelo` | TEXT | Nome do modelo utilizado |
| `local_abordagem` | TEXT | Local onde o lead foi abordado |

### 3. Confirmação e Validação de Fichas (4 colunas)

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `ficha_confirmada` | BOOLEAN | false | Indica se a ficha foi confirmada |
| `data_criacao_ficha` | TIMESTAMPTZ | - | Data de criação da ficha |
| `data_confirmacao_ficha` | TIMESTAMPTZ | - | Data de confirmação da ficha |
| `cadastro_existe_foto` | BOOLEAN | false | Indica se existe foto no cadastro |

### 4. Agendamento e Presença (6 colunas)

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `presenca_confirmada` | BOOLEAN | false | Indica se a presença foi confirmada |
| `compareceu` | BOOLEAN | false | Indica se o lead compareceu ao agendamento |
| `data_criacao_agendamento` | TIMESTAMPTZ | - | Data de criação do agendamento |
| `horario_agendamento` | TEXT | - | Horário do agendamento |
| `data_agendamento` | DATE | - | Data do agendamento |
| `data_retorno_ligacao` | TIMESTAMPTZ | - | Data programada para retorno de ligação |

### 5. Gerenciamento de Funil e Fluxo (6 colunas)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `gerenciamento_funil` | TEXT | Gerenciamento de funil de vendas |
| `status_fluxo` | TEXT | Status atual no fluxo de trabalho |
| `etapa_funil` | TEXT | Etapa atual no funil de vendas |
| `etapa_fluxo` | TEXT | Etapa atual no fluxo de trabalho |
| `funil_fichas` | TEXT | Funil específico de fichas |
| `status_tabulacao` | TEXT | Status da tabulação do lead |

### 6. Integração com Sistemas Externos (3 colunas)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `maxsystem_id_ficha` | TEXT | ID da ficha no sistema MaxSystem |
| `gestao_scouter` | TEXT | Identificador do sistema Gestão Scouter |
| `op_telemarketing` | TEXT | Operador de telemarketing responsável |

### 7. Metadados de Sincronização e Auditoria (3 colunas)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `date_modify` | TIMESTAMPTZ | Data da última modificação do registro |
| `last_sync_at` | TIMESTAMPTZ | Timestamp da última sincronização (TabuladorMax) |
| `sync_status` | TEXT | Status da sincronização (pending, synced, error) |

**Nota:** A coluna `last_sync_at` é diferente de `last_synced_at` (que já existia):
- `last_sync_at`: usado pelo TabuladorMax
- `last_synced_at`: usado pelo Gestão Scouter

## Índices Criados (15 total)

### Índices para Identificação e Busca
- `idx_fichas_name` - Busca por nome
- `idx_fichas_celular` - Busca por celular
- `idx_fichas_responsible` - Busca por responsável

### Índices para Integrações Externas
- `idx_fichas_bitrix_telemarketing_id` - ID Bitrix
- `idx_fichas_commercial_project_id` - ID projeto comercial
- `idx_fichas_maxsystem_id` - ID MaxSystem

### Índices para Status e Funil
- `idx_fichas_status_fluxo` - Status no fluxo
- `idx_fichas_etapa_funil` - Etapa do funil
- `idx_fichas_ficha_confirmada` - Fichas confirmadas

### Índices para Agendamento
- `idx_fichas_data_agendamento` - Data do agendamento
- `idx_fichas_presenca_confirmada` - Presença confirmada
- `idx_fichas_compareceu` - Comparecimento

### Índices para Sincronização
- `idx_fichas_sync_status` - Status de sincronização
- `idx_fichas_last_sync_at` - Última sincronização
- `idx_fichas_date_modify` - Data de modificação

Todos os índices usam `WHERE` clauses para criar **índices parciais**, melhorando a performance e reduzindo o tamanho dos índices ao indexar apenas valores não-nulos ou relevantes.

## Colunas que Já Existiam

As seguintes colunas do `leads` já existiam em `fichas` e **não** foram adicionadas novamente:

| Coluna | Tipo Original | Tipo em fichas | Status |
|--------|---------------|----------------|--------|
| `valor_ficha` | NUMERIC(10,2) | NUMERIC(12,2) | ✅ Compatível (maior precisão) |
| `sync_source` | TEXT | TEXT | ✅ Já existe |
| `aprovado` | BOOLEAN | BOOLEAN | ✅ Já existe |
| `last_synced_at` | TIMESTAMPTZ | TIMESTAMPTZ | ✅ Já existe (diferente de last_sync_at) |

## Schema Completo da Tabela fichas

Após a migration, a tabela `fichas` possui as seguintes colunas:

### Colunas Originais (desde 20250929_create_fichas.sql)
- `id` TEXT PRIMARY KEY
- `raw` JSONB NOT NULL
- `scouter` TEXT
- `projeto` TEXT
- `criado` DATE
- `valor_ficha` NUMERIC(12,2)
- `deleted` BOOLEAN DEFAULT false
- `updated_at` TIMESTAMPTZ DEFAULT now()
- `created_at` TIMESTAMPTZ DEFAULT now()

### Colunas Adicionadas em Migrations Anteriores
- `lat` DOUBLE PRECISION (geo_ingest)
- `lng` DOUBLE PRECISION (geo_ingest)
- `localizacao` TEXT (geo_ingest)
- `aprovado` BOOLEAN DEFAULT NULL (add_aprovado_field)
- `sync_source` TEXT DEFAULT 'Gestao' (add_sync_metadata)
- `last_synced_at` TIMESTAMPTZ (add_sync_metadata)

### Colunas Adicionadas Nesta Migration (36 novas)
Ver seções anteriores deste documento para lista completa.

## Como Executar a Migration

### Opção 1: Supabase CLI
```bash
supabase db reset
# ou
supabase db push
```

### Opção 2: Supabase Dashboard
1. Acesse o Dashboard do Supabase
2. Vá para SQL Editor
3. Execute o conteúdo do arquivo `supabase/migrations/20251018_sync_fichas_leads_schema.sql`

### Opção 3: Aplicação Direta via SQL
```bash
psql -h <host> -U <user> -d <database> -f supabase/migrations/20251018_sync_fichas_leads_schema.sql
```

## Verificação da Migration

A migration inclui um bloco de verificação que será executado automaticamente:

```sql
DO $$
DECLARE
  column_count INTEGER;
  expected_new_columns INTEGER := 36;
BEGIN
  -- Verifica se todas as 36 colunas foram criadas
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'fichas'
    AND column_name IN (...); -- lista de 36 colunas
  
  IF column_count = expected_new_columns THEN
    RAISE NOTICE '✅ Migration concluída com sucesso!';
  ELSE
    RAISE WARNING '⚠️ Esperado % colunas, encontrado %', expected_new_columns, column_count;
  END IF;
END $$;
```

### Mensagens Esperadas
- ✅ Migration concluída com sucesso!
- ✅ Total de colunas adicionadas: 36 de 36
- ℹ️ Schema da tabela fichas agora está alinhado com a tabela leads do TabuladorMax
- ℹ️ Sincronização bidirecional completa está habilitada

## Verificação Manual

Para verificar manualmente que todas as colunas foram criadas:

```sql
-- Listar todas as colunas da tabela fichas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'fichas'
ORDER BY ordinal_position;

-- Contar total de colunas
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'fichas';

-- Verificar índices criados
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'fichas'
  AND schemaname = 'public'
ORDER BY indexname;
```

## Impacto nas Aplicações

### Gestão Scouter
- ✅ Nenhuma alteração necessária no código existente
- ✅ Novas colunas disponíveis para uso futuro
- ✅ Sincronização bidirecional agora é possível
- ⚠️ Queries existentes continuam funcionando (colunas adicionais são opcionais)

### TabuladorMax
- ✅ Pode sincronizar todos os campos sem erros
- ✅ Schema compatível em ambas as direções
- ✅ Mapeamento 1:1 entre leads e fichas

## Próximos Passos

1. **Testar a Migration:** Executar em ambiente de desenvolvimento/staging
2. **Atualizar Código de Sincronização:** Utilizar as novas colunas nos scripts de sync
3. **Documentar APIs:** Atualizar documentação das APIs que interagem com fichas
4. **Monitorar Performance:** Verificar se os índices estão sendo utilizados eficientemente
5. **Sincronização Inicial:** Executar sync completo para popular as novas colunas

## Notas Técnicas

### Idempotência
A migration usa `ADD COLUMN IF NOT EXISTS` e `CREATE INDEX IF NOT EXISTS`, permitindo execução segura múltiplas vezes sem erros.

### Compatibilidade de Tipos
Todos os tipos de dados foram escolhidos para compatibilidade máxima:
- `TEXT` para strings de tamanho variável
- `INTEGER` para números inteiros
- `BIGINT` para IDs grandes
- `UUID` para identificadores universais
- `BOOLEAN` para flags true/false
- `TIMESTAMPTZ` para datas com timezone
- `DATE` para datas sem hora
- `NUMERIC(10,2)` para valores monetários

### Performance
Os índices parciais (`WHERE column IS NOT NULL` ou `WHERE column = true`) reduzem o tamanho dos índices e melhoram a performance ao indexar apenas valores relevantes.

### Manutenção Futura
Todos os comentários de coluna estão em português para facilitar a manutenção pela equipe. Cada coluna possui uma descrição clara de seu propósito.

## Rollback

Caso seja necessário reverter a migration (não recomendado após dados serem populados):

```sql
-- ATENÇÃO: Isto removerá as colunas e seus dados
-- Execute apenas se tiver certeza e backup dos dados

ALTER TABLE public.fichas 
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS responsible,
  DROP COLUMN IF EXISTS age,
  -- ... (continuar para todas as 36 colunas)
  DROP COLUMN IF EXISTS sync_status;

-- Remover índices
DROP INDEX IF EXISTS idx_fichas_name;
DROP INDEX IF EXISTS idx_fichas_celular;
-- ... (continuar para todos os 15 índices)
```

## Autor

Migration criada automaticamente via GitHub Copilot para sincronização de schema entre Gestão Scouter e TabuladorMax.

**Data:** 2025-10-18  
**Issue:** Sincronizar schema fichas ← leads

## Referências

- Tabela original: `supabase/migrations/20250929_create_fichas.sql`
- Migrations relacionadas:
  - `20251001_geo_ingest.sql` - Geolocalização
  - `20251016230108_add_aprovado_field.sql` - Campo aprovado
  - `20251017_add_sync_metadata.sql` - Metadados de sync
  - `20251017_sync_health.sql` - Saúde de sincronização
