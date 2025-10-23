-- ============================================================================
-- Tabela 'fichas' - FONTE ÚNICA DE VERDADE
-- ============================================================================
-- Esta é a tabela centralizada para TODOS os dados de fichas/leads da aplicação.
-- 
-- ATENÇÃO DESENVOLVEDORES:
-- - Esta tabela espelha dados da planilha Google Sheets
-- - TODA busca de leads deve usar esta tabela (schema flexível)
-- - NÃO use tabelas 'leads' ou 'bitrix_leads' como fonte principal
-- - O campo 'raw' contém a linha completa como JSON para auditoria
-- - O campo 'deleted' marca exclusão lógica (não deletar fisicamente)
--
-- Acesso via código:
-- - Repository: leadsRepo.ts (função getLeads)
-- - Hook: useFichas.ts
-- - Dashboard: dashboardRepo.ts
-- ============================================================================

-- Tabela espelhada das fichas da planilha (schema flexível)
create table if not exists public.fichas (
  id text primary key,                       -- ID estável vindo da planilha
  raw jsonb not null,                        -- linha completa como JSON
  scouter text,
  projeto text,
  criado date,
  valor_ficha numeric(12,2),
  deleted boolean default false,             -- marcação lógica de exclusão
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_fichas_criado on public.fichas(criado);
create index if not exists idx_fichas_scouter on public.fichas(scouter);
create index if not exists idx_fichas_projeto on public.fichas(projeto);

create or replace function public.tg_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists tg_fichas_updated on public.fichas;
create trigger tg_fichas_updated before update on public.fichas
for each row execute function public.tg_set_updated_at();

alter table public.fichas enable row level security;
-- leitura pública (ajuste conforme necessidade)
drop policy if exists fichas_read_all on public.fichas;
create policy fichas_read_all on public.fichas for select using (true);
-- escrita via Edge (service role), a app não usa anon para escrever aqui