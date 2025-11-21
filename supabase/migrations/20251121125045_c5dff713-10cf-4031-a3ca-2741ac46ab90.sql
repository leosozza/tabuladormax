-- Criar projeto SELETIVA RESENDE -RJ que está faltando
INSERT INTO public.commercial_projects (code, name, description, active, created_at, updated_at)
VALUES (
  '428',
  'SELETIVA RESENDE -RJ',
  'Projeto comercial Resende - RJ',
  true,
  now(),
  now()
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  active = true,
  updated_at = now();