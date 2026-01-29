-- Adicionar novos valores aos ENUMs existentes para suportar novos roles e departamentos

-- Adicionar novos roles ao app_role ENUM
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor_adjunto';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'control_desk';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'central_de_atendimento';

-- Adicionar novos departamentos ao app_department ENUM
ALTER TYPE public.app_department ADD VALUE IF NOT EXISTS 'cobranca';

-- Sincronizar tabela custom_roles com novos valores
INSERT INTO public.custom_roles (name, label)
SELECT 'supervisor_adjunto', 'Supervisor Adjunto'
WHERE NOT EXISTS (SELECT 1 FROM public.custom_roles WHERE name = 'supervisor_adjunto');

INSERT INTO public.custom_roles (name, label)
SELECT 'control_desk', 'Control Desk'
WHERE NOT EXISTS (SELECT 1 FROM public.custom_roles WHERE name = 'control_desk');

-- Sincronizar tabela departments com Análise (se não existir)
INSERT INTO public.departments (name, code, active)
SELECT 'Análise', 'analise', true
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE code = 'analise');