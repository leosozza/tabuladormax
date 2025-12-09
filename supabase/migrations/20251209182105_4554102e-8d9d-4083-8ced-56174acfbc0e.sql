-- =============================================
-- FASE 1: Criar tabela DEALS
-- =============================================
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bitrix_deal_id integer UNIQUE NOT NULL,
  bitrix_lead_id integer,
  lead_id bigint REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Dados do Deal
  title text NOT NULL,
  stage_id text,
  category_id text,
  opportunity numeric DEFAULT 0,
  currency_id text DEFAULT 'BRL',
  
  -- Cliente
  contact_id integer,
  company_id integer,
  client_name text,
  client_phone text,
  client_email text,
  
  -- Responsável
  assigned_by_id integer,
  assigned_by_name text,
  producer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Datas
  created_date timestamptz,
  close_date timestamptz,
  date_modify timestamptz,
  
  -- Sincronização
  raw jsonb,
  sync_status text DEFAULT 'synced',
  last_sync_at timestamptz DEFAULT now(),
  
  -- Tracking
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_deals_bitrix_deal_id ON public.deals(bitrix_deal_id);
CREATE INDEX idx_deals_bitrix_lead_id ON public.deals(bitrix_lead_id);
CREATE INDEX idx_deals_lead_id ON public.deals(lead_id);
CREATE INDEX idx_deals_producer_id ON public.deals(producer_id);
CREATE INDEX idx_deals_stage_id ON public.deals(stage_id);
CREATE INDEX idx_deals_created_date ON public.deals(created_date);

-- Trigger para updated_at
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FASE 1: Criar tabela NEGOTIATIONS
-- =============================================
CREATE TABLE public.negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  bitrix_deal_id integer,
  bitrix_product_id integer,
  
  -- Identificação
  title text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'pending_approval', 'approved', 'rejected', 'completed', 'cancelled')),
  
  -- Cliente (copiado do deal ou preenchido manualmente)
  client_name text NOT NULL,
  client_phone text,
  client_email text,
  client_document text,
  
  -- Valores comerciais
  base_value numeric NOT NULL DEFAULT 0,
  discount_percentage numeric DEFAULT 0,
  discount_value numeric DEFAULT 0,
  additional_fee_percentage numeric DEFAULT 0,
  additional_fee_value numeric DEFAULT 0,
  tax_percentage numeric DEFAULT 0,
  tax_value numeric DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  
  -- Formas de pagamento (JSONB array)
  payment_methods jsonb DEFAULT '[]'::jsonb,
  
  -- Parcelas
  installments_count integer DEFAULT 1,
  first_installment_date date,
  payment_frequency text DEFAULT 'monthly',
  
  -- Datas
  start_date date,
  end_date date,
  
  -- Termos
  terms text,
  notes text,
  
  -- Aprovação
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  
  -- Responsável
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Tracking
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_negotiations_deal_id ON public.negotiations(deal_id);
CREATE INDEX idx_negotiations_bitrix_deal_id ON public.negotiations(bitrix_deal_id);
CREATE INDEX idx_negotiations_status ON public.negotiations(status);
CREATE INDEX idx_negotiations_created_by ON public.negotiations(created_by);
CREATE INDEX idx_negotiations_created_at ON public.negotiations(created_at);

-- Trigger para updated_at
CREATE TRIGGER update_negotiations_updated_at
  BEFORE UPDATE ON public.negotiations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FASE 1: Criar tabela NEGOTIATION_HISTORY
-- =============================================
CREATE TABLE public.negotiation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id uuid NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  
  action text NOT NULL,
  old_status text,
  new_status text,
  changes jsonb,
  notes text,
  
  performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_at timestamptz DEFAULT now()
);

-- Índice para busca rápida
CREATE INDEX idx_negotiation_history_negotiation_id ON public.negotiation_history(negotiation_id);
CREATE INDEX idx_negotiation_history_performed_at ON public.negotiation_history(performed_at);

-- =============================================
-- RLS: Habilitar Row Level Security
-- =============================================
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: DEALS
-- =============================================

-- Admins e managers podem ver todos os deals
CREATE POLICY "Admins e managers podem ver todos os deals"
  ON public.deals
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Produtores podem ver deals atribuídos a eles
CREATE POLICY "Produtores podem ver deals atribuídos"
  ON public.deals
  FOR SELECT
  USING (producer_id = auth.uid());

-- Admins e managers podem gerenciar todos os deals
CREATE POLICY "Admins e managers podem gerenciar deals"
  ON public.deals
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

-- =============================================
-- RLS POLICIES: NEGOTIATIONS
-- =============================================

-- Admins e managers podem ver todas as negociações
CREATE POLICY "Admins e managers podem ver todas as negociações"
  ON public.negotiations
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Produtores podem ver suas próprias negociações
CREATE POLICY "Produtores podem ver suas negociações"
  ON public.negotiations
  FOR SELECT
  USING (created_by = auth.uid());

-- Produtores podem criar negociações
CREATE POLICY "Produtores podem criar negociações"
  ON public.negotiations
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Produtores podem atualizar suas negociações em draft/in_progress
CREATE POLICY "Produtores podem atualizar suas negociações"
  ON public.negotiations
  FOR UPDATE
  USING (
    created_by = auth.uid() AND 
    status IN ('draft', 'in_progress', 'rejected')
  );

-- Admins e managers podem gerenciar todas as negociações
CREATE POLICY "Admins e managers podem gerenciar negociações"
  ON public.negotiations
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

-- =============================================
-- RLS POLICIES: NEGOTIATION_HISTORY
-- =============================================

-- Usuários podem ver histórico de negociações que têm acesso
CREATE POLICY "Usuários podem ver histórico de negociações acessíveis"
  ON public.negotiation_history
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.negotiations n 
      WHERE n.id = negotiation_history.negotiation_id 
      AND n.created_by = auth.uid()
    )
  );

-- Sistema pode inserir histórico
CREATE POLICY "Sistema pode inserir histórico"
  ON public.negotiation_history
  FOR INSERT
  WITH CHECK (true);

-- =============================================
-- FUNÇÃO: Registrar histórico automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION public.log_negotiation_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Só registra se status mudou
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.negotiation_history (
      negotiation_id,
      action,
      old_status,
      new_status,
      changes,
      performed_by
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'approved'
        WHEN NEW.status = 'rejected' THEN 'rejected'
        WHEN NEW.status = 'completed' THEN 'completed'
        WHEN NEW.status = 'cancelled' THEN 'cancelled'
        ELSE 'status_changed'
      END,
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'rejection_reason', NEW.rejection_reason
      ),
      COALESCE(NEW.approved_by, auth.uid())
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para registrar mudanças
CREATE TRIGGER log_negotiation_status_change
  AFTER UPDATE ON public.negotiations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_negotiation_change();