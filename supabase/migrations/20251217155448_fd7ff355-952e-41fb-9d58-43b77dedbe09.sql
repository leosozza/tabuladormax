-- Tabela para armazenar relatórios compartilháveis
CREATE TABLE public.telemarketing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by INTEGER,           -- bitrix_id do supervisor
  period VARCHAR(20) NOT NULL,  -- 'today', 'week', 'month'
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  data JSONB NOT NULL,          -- Dados do relatório em JSON
  access_count INTEGER DEFAULT 0,
  short_code VARCHAR(10) UNIQUE NOT NULL
);

-- Index para busca rápida pelo short_code
CREATE INDEX idx_telemarketing_reports_short_code ON public.telemarketing_reports(short_code);

-- Index para limpeza de expirados
CREATE INDEX idx_telemarketing_reports_expires_at ON public.telemarketing_reports(expires_at);

-- RLS - Relatórios públicos (leitura por short_code) e criação por supervisores
ALTER TABLE public.telemarketing_reports ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ler relatórios não expirados (para links compartilháveis)
CREATE POLICY "Anyone can read non-expired reports"
ON public.telemarketing_reports
FOR SELECT
USING (expires_at > now());

-- Inserção é pública (via dashboard de telemarketing)
CREATE POLICY "Anyone can create reports"
ON public.telemarketing_reports
FOR INSERT
WITH CHECK (true);