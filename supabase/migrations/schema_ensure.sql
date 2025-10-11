-- ============================================
-- Schema Ensure - Fallback/Verification Script
-- ============================================
-- This script ensures critical tables and functions exist
-- Can be run multiple times safely (idempotent)

-- Ensure flows table exists with all columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flows') THEN
    RAISE NOTICE 'flows table does not exist, creating...';
    CREATE TABLE public.flows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT NOT NULL,
      descricao TEXT,
      steps JSONB NOT NULL DEFAULT '[]'::jsonb,
      ativo BOOLEAN DEFAULT true,
      criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
      atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
      criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      CONSTRAINT flows_steps_is_array CHECK (jsonb_typeof(steps) = 'array')
    );
    ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Ensure all columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flows' AND column_name = 'nome') THEN
    ALTER TABLE public.flows ADD COLUMN nome TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flows' AND column_name = 'descricao') THEN
    ALTER TABLE public.flows ADD COLUMN descricao TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flows' AND column_name = 'steps') THEN
    ALTER TABLE public.flows ADD COLUMN steps JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flows' AND column_name = 'ativo') THEN
    ALTER TABLE public.flows ADD COLUMN ativo BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Ensure flows_runs table exists with all columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flows_runs') THEN
    RAISE NOTICE 'flows_runs table does not exist, creating...';
    CREATE TABLE public.flows_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
      lead_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
      logs JSONB DEFAULT '[]'::jsonb,
      resultado JSONB,
      iniciado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
      finalizado_em TIMESTAMP WITH TIME ZONE,
      executado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      CONSTRAINT flows_runs_logs_is_array CHECK (jsonb_typeof(logs) = 'array')
    );
    ALTER TABLE public.flows_runs ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Ensure all columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flows_runs' AND column_name = 'logs') THEN
    ALTER TABLE public.flows_runs ADD COLUMN logs JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flows_runs' AND column_name = 'resultado') THEN
    ALTER TABLE public.flows_runs ADD COLUMN resultado JSONB;
  END IF;
END $$;

-- Ensure update_atualizado_em function exists
CREATE OR REPLACE FUNCTION public.update_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_atualizado_em' 
    AND tgrelid = 'public.flows'::regclass
  ) THEN
    CREATE TRIGGER set_atualizado_em
      BEFORE UPDATE ON public.flows
      FOR EACH ROW
      EXECUTE FUNCTION public.update_atualizado_em();
  END IF;
END $$;

-- Verify indexes exist
CREATE INDEX IF NOT EXISTS idx_flows_ativo ON public.flows(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_flows_criado_por ON public.flows(criado_por);
CREATE INDEX IF NOT EXISTS idx_flows_runs_flow_id ON public.flows_runs(flow_id);
CREATE INDEX IF NOT EXISTS idx_flows_runs_lead_id ON public.flows_runs(lead_id);
CREATE INDEX IF NOT EXISTS idx_flows_runs_status ON public.flows_runs(status);
CREATE INDEX IF NOT EXISTS idx_flows_runs_executado_por ON public.flows_runs(executado_por);

-- Ensure RLS is enabled
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows_runs ENABLE ROW LEVEL SECURITY;

-- Verification message
DO $$
BEGIN
  RAISE NOTICE 'Schema verification complete. All tables and functions exist.';
END $$;
