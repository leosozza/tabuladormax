-- Geolocation Migration: Scouter tracking and Ficha geocoding
-- Handles Grid 1351167110 (scouter locations) and ficha "Localização" column

-- Tabela normalizada de Scouters (se ainda não existir)
create table if not exists public.scouters (
  id bigserial primary key,
  name text not null,
  tier text null,                 -- Bronze/Prata/Ouro...
  unique (name)
);

-- Tabela de localizações (histórico)
create table if not exists public.scouter_locations (
  id bigserial primary key,
  scouter_id bigint not null references public.scouters(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision null,
  heading double precision null,
  speed double precision null,
  source text not null default 'sheet', -- 'sheet' | 'app' | 'api'
  at timestamptz not null default now()
);
create index if not exists idx_scouter_locations_scouter_at on public.scouter_locations (scouter_id, at desc);

-- View: última posição por scouter (para o mapa em tempo real)
create or replace view public.scouter_last_location as
select distinct on (sl.scouter_id)
  sl.scouter_id, s.name as scouter, s.tier, sl.lat, sl.lng, sl.accuracy, sl.heading, sl.speed, sl.source, sl.at
from public.scouter_locations sl
join public.scouters s on s.id = sl.scouter_id
order by sl.scouter_id, sl.at desc;

-- Geocache para endereços de fichas (evitar re-geocode)
create table if not exists public.geocache (
  query text primary key,
  lat double precision not null,
  lng double precision not null,
  resolved_at timestamptz not null default now()
);

-- Garantir colunas de geo em fichas
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='fichas' and column_name='lat') then
    alter table public.fichas add column lat double precision null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='fichas' and column_name='lng') then
    alter table public.fichas add column lng double precision null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='fichas' and column_name='localizacao') then
    alter table public.fichas add column localizacao text null;
  end if;
end $$;

create index if not exists idx_fichas_latlng on public.fichas (lat, lng);

-- RLS mínima (ajuste conforme tenant)
alter table public.scouters enable row level security;
alter table public.scouter_locations enable row level security;
alter table public.geocache enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where polname='scouters_read') then
    create policy scouters_read on public.scouters for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where polname='scouter_locations_read') then
    create policy scouter_locations_read on public.scouter_locations for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where polname='scouter_locations_insert') then
    create policy scouter_locations_insert on public.scouter_locations for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where polname='geocache_read') then
    create policy geocache_read on public.geocache for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where polname='geocache_write') then
    create policy geocache_write on public.geocache for insert to authenticated with check (true);
  end if;
end $$;

-- RPCs
-- 1) Últimas localizações (para o mapa)
create or replace function public.get_scouters_last_locations()
returns table(scouter text, tier text, lat double precision, lng double precision, at timestamptz)
language sql security definer set search_path=public as $$
  select l.scouter, l.tier, l.lat, l.lng, l.at
  from public.scouter_last_location l
  order by l.scouter asc;
$$;

-- 2) Geo de fichas para heatmap
-- Updated to support both 'criado' and 'created_at' columns with fallback
create or replace function public.get_fichas_geo(
  p_start date,
  p_end date,
  p_project text default null,
  p_scouter text default null
) returns table(id bigint, lat double precision, lng double precision, created_at timestamptz, projeto text, scouter text)
language sql security definer set search_path=public as $$
  select 
    f.id::bigint, 
    f.lat, 
    f.lng, 
    coalesce(f.created_at, f.criado::timestamptz) as created_at,
    f.projeto, 
    f.scouter
  from public.fichas f
  where (
    coalesce(f.created_at::date, f.criado) between p_start and p_end
  )
    and f.lat is not null and f.lng is not null
    and (p_project is null or f.projeto = p_project)
    and (p_scouter is null or f.scouter = p_scouter);
$$;
