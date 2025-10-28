-- ============================================
-- SQL Migration: Add Project Payment Settings and Payments Records Table
-- ============================================
-- This migration adds payment configuration fields to projects and creates
-- the payments_records table for tracking individual payment transactions.
--
-- IMPORTANT NOTES:
-- 1. This script should be executed in your Supabase SQL Editor
-- 2. After execution, reload the schema cache:
--    - Go to Settings > API > PostgREST Settings
--    - Click "Reload schema cache" or execute: NOTIFY pgrst, 'reload schema'
-- 3. RLS (Row Level Security) considerations:
--    - Enable RLS on payments_records table
--    - Create appropriate policies based on your security requirements
--    - Consider using SECURITY DEFINER for RPC functions if RLS is enabled

-- ============================================
-- 1. Add payment settings fields to projects table (if it exists)
-- ============================================
-- These fields store configuration for payment calculations per project

DO $$
BEGIN
    -- Check if projects table exists before adding columns
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
    ) THEN
        -- Add valor_ficha_base if not exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'projects' 
            AND column_name = 'valor_ficha_base'
        ) THEN
            ALTER TABLE public.projects 
            ADD COLUMN valor_ficha_base numeric DEFAULT 50.00;
            COMMENT ON COLUMN public.projects.valor_ficha_base IS 'Valor base da ficha para cálculo de pagamento';
        END IF;

        -- Add ajuda_custo_valor if not exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'projects' 
            AND column_name = 'ajuda_custo_valor'
        ) THEN
            ALTER TABLE public.projects 
            ADD COLUMN ajuda_custo_valor numeric DEFAULT 0.00;
            COMMENT ON COLUMN public.projects.ajuda_custo_valor IS 'Valor da ajuda de custo por dia trabalhado';
        END IF;

        -- Add ajuda_custo_enabled if not exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'projects' 
            AND column_name = 'ajuda_custo_enabled'
        ) THEN
            ALTER TABLE public.projects 
            ADD COLUMN ajuda_custo_enabled boolean DEFAULT false;
            COMMENT ON COLUMN public.projects.ajuda_custo_enabled IS 'Indica se ajuda de custo está habilitada para o projeto';
        END IF;

        -- Add desconto_falta_valor if not exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'projects' 
            AND column_name = 'desconto_falta_valor'
        ) THEN
            ALTER TABLE public.projects 
            ADD COLUMN desconto_falta_valor numeric DEFAULT 0.00;
            COMMENT ON COLUMN public.projects.desconto_falta_valor IS 'Valor do desconto por falta';
        END IF;

        -- Add desconto_falta_enabled if not exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'projects' 
            AND column_name = 'desconto_falta_enabled'
        ) THEN
            ALTER TABLE public.projects 
            ADD COLUMN desconto_falta_enabled boolean DEFAULT false;
            COMMENT ON COLUMN public.projects.desconto_falta_enabled IS 'Indica se desconto por falta está habilitado para o projeto';
        END IF;

        RAISE NOTICE 'Payment settings columns added to projects table';
    ELSE
        RAISE NOTICE 'Projects table does not exist, skipping column additions';
    END IF;
END $$;

-- ============================================
-- 2. Create payments_records table
-- ============================================
-- This table stores individual payment transaction records

CREATE TABLE IF NOT EXISTS public.payments_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Payment identification
    batch_id uuid NOT NULL,
    payment_date timestamptz NOT NULL DEFAULT now(),
    
    -- Lead and project information
    lead_id bigint NOT NULL,
    scouter text NOT NULL,
    commercial_project_id uuid,
    
    -- Payment calculation breakdown
    num_fichas integer NOT NULL DEFAULT 0,
    valor_ficha numeric NOT NULL DEFAULT 0.00,
    valor_fichas_total numeric NOT NULL DEFAULT 0.00,
    
    dias_trabalhados integer DEFAULT 0,
    ajuda_custo_por_dia numeric DEFAULT 0.00,
    ajuda_custo_total numeric DEFAULT 0.00,
    
    num_faltas integer DEFAULT 0,
    desconto_falta_unitario numeric DEFAULT 0.00,
    desconto_faltas_total numeric DEFAULT 0.00,
    
    -- Final amounts
    valor_bruto numeric NOT NULL,
    valor_descontos numeric NOT NULL DEFAULT 0.00,
    valor_liquido numeric NOT NULL,
    
    -- Metadata
    created_at timestamptz DEFAULT now(),
    created_by uuid,
    observacoes text,
    
    -- Status tracking
    status text DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'cancelled')),
    
    -- Constraints
    CONSTRAINT fk_payments_lead FOREIGN KEY (lead_id) 
        REFERENCES public.leads(id) ON DELETE CASCADE,
    CONSTRAINT positive_amounts CHECK (
        valor_fichas_total >= 0 
        AND ajuda_custo_total >= 0 
        AND desconto_faltas_total >= 0
        AND valor_bruto >= 0
        AND valor_liquido >= 0
    )
);

-- Add comments
COMMENT ON TABLE public.payments_records IS 'Registro de pagamentos realizados aos scouters';
COMMENT ON COLUMN public.payments_records.batch_id IS 'ID do lote de pagamento (agrupa múltiplos pagamentos feitos juntos)';
COMMENT ON COLUMN public.payments_records.lead_id IS 'Referência ao lead relacionado ao pagamento';
COMMENT ON COLUMN public.payments_records.scouter IS 'Nome do scouter que recebeu o pagamento';
COMMENT ON COLUMN public.payments_records.valor_fichas_total IS 'Valor total das fichas (num_fichas * valor_ficha)';
COMMENT ON COLUMN public.payments_records.ajuda_custo_total IS 'Valor total da ajuda de custo (dias_trabalhados * ajuda_custo_por_dia)';
COMMENT ON COLUMN public.payments_records.desconto_faltas_total IS 'Valor total dos descontos por faltas (num_faltas * desconto_falta_unitario)';
COMMENT ON COLUMN public.payments_records.valor_bruto IS 'Valor bruto antes de descontos (fichas + ajuda de custo)';
COMMENT ON COLUMN public.payments_records.valor_liquido IS 'Valor líquido após descontos';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_records_batch_id ON public.payments_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_payments_records_lead_id ON public.payments_records(lead_id);
CREATE INDEX IF NOT EXISTS idx_payments_records_scouter ON public.payments_records(scouter);
CREATE INDEX IF NOT EXISTS idx_payments_records_payment_date ON public.payments_records(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_records_status ON public.payments_records(status);
CREATE INDEX IF NOT EXISTS idx_payments_records_project ON public.payments_records(commercial_project_id);

-- ============================================
-- 3. Enable Row Level Security
-- ============================================
ALTER TABLE public.payments_records ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Create RLS Policies (adjust based on your requirements)
-- ============================================

-- Policy: Authenticated users can view payment records
CREATE POLICY "Authenticated users can view payment records"
    ON public.payments_records
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Service role can insert payment records
-- Note: In production, you may want to restrict this further
CREATE POLICY "Service can insert payment records"
    ON public.payments_records
    FOR INSERT
    WITH CHECK (true);

-- Policy: Service role and authenticated users can update payment records
CREATE POLICY "Service can update payment records"
    ON public.payments_records
    FOR UPDATE
    USING (true);

-- ============================================
-- 5. Create helper function to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION public.update_payments_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: We don't create a trigger for payments_records as it uses created_at which shouldn't change

-- ============================================
-- Migration Complete
-- ============================================
-- Next steps:
-- 1. Reload schema cache (NOTIFY pgrst, 'reload schema')
-- 2. Create the RPC function using sql/rpc/pay_fichas_transaction.sql
-- 3. Test the new structure with sample data
-- 4. Adjust RLS policies based on your security requirements
