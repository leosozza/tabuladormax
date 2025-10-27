-- Migration: Create Agenciamento (Negotiations) Module Schema
-- Description: Complete schema for commercial negotiations with Bitrix24 integration
-- Author: Copilot Agent
-- Date: 2025-10-27

-- Create enum for negotiation status
CREATE TYPE negotiation_status AS ENUM (
  'draft',
  'in_progress',
  'pending_approval',
  'approved',
  'rejected',
  'completed',
  'cancelled'
);

-- Create enum for payment methods
CREATE TYPE payment_method AS ENUM (
  'cash',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'pix',
  'check',
  'financing',
  'installments',
  'other'
);

-- Main negotiations table
CREATE TABLE IF NOT EXISTS public.negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Bitrix24 Integration
  bitrix_deal_id TEXT,
  bitrix_project_id TEXT,
  bitrix_contact_id TEXT,
  bitrix_company_id TEXT,
  
  -- Basic Information
  title TEXT NOT NULL,
  description TEXT,
  status negotiation_status DEFAULT 'draft',
  
  -- Client Information
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_document TEXT, -- CPF/CNPJ
  
  -- Commercial Conditions
  base_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_value DECIMAL(12,2) DEFAULT 0,
  final_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Payment Conditions
  payment_methods JSONB DEFAULT '[]'::JSONB, -- Array of selected payment methods
  installments_number INTEGER DEFAULT 1,
  installment_value DECIMAL(12,2) DEFAULT 0,
  first_payment_date DATE,
  payment_frequency TEXT DEFAULT 'monthly', -- monthly, weekly, biweekly, etc
  
  -- Additional Fees and Taxes
  additional_fees DECIMAL(12,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2) DEFAULT 0,
  tax_value DECIMAL(12,2) DEFAULT 0,
  total_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Dates
  negotiation_date DATE DEFAULT CURRENT_DATE,
  validity_date DATE,
  expected_closing_date DATE,
  actual_closing_date DATE,
  
  -- Items/Products (flexible JSONB for line items)
  items JSONB DEFAULT '[]'::JSONB,
  
  -- Terms and Conditions
  terms_and_conditions TEXT,
  special_conditions TEXT,
  internal_notes TEXT,
  
  -- Approval Workflow
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approval_date TIMESTAMPTZ,
  approval_notes TEXT,
  
  -- Tracking
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Constraints
  CONSTRAINT valid_discount_percentage CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  CONSTRAINT valid_tax_percentage CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
  CONSTRAINT valid_installments CHECK (installments_number > 0),
  CONSTRAINT valid_values CHECK (base_value >= 0 AND final_value >= 0 AND total_value >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_negotiations_bitrix_deal ON public.negotiations(bitrix_deal_id);
CREATE INDEX IF NOT EXISTS idx_negotiations_bitrix_project ON public.negotiations(bitrix_project_id);
CREATE INDEX IF NOT EXISTS idx_negotiations_status ON public.negotiations(status);
CREATE INDEX IF NOT EXISTS idx_negotiations_created_by ON public.negotiations(created_by);
CREATE INDEX IF NOT EXISTS idx_negotiations_created_at ON public.negotiations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_negotiations_client_name ON public.negotiations USING gin(to_tsvector('portuguese', client_name));

-- Create negotiation history table for audit trail
CREATE TABLE IF NOT EXISTS public.negotiation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id UUID NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- created, updated, status_changed, approved, etc
  changes JSONB, -- What changed
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_negotiation_history_negotiation ON public.negotiation_history(negotiation_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_history_performed_at ON public.negotiation_history(performed_at DESC);

-- Create negotiation attachments table
CREATE TABLE IF NOT EXISTS public.negotiation_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id UUID NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_negotiation_attachments_negotiation ON public.negotiation_attachments(negotiation_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_negotiations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_negotiations_timestamp
  BEFORE UPDATE ON public.negotiations
  FOR EACH ROW
  EXECUTE FUNCTION update_negotiations_updated_at();

-- Function to calculate negotiation values
CREATE OR REPLACE FUNCTION calculate_negotiation_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate discount value
  IF NEW.discount_percentage > 0 THEN
    NEW.discount_value = (NEW.base_value * NEW.discount_percentage / 100);
  END IF;
  
  -- Calculate final value after discount
  NEW.final_value = NEW.base_value - NEW.discount_value;
  
  -- Calculate tax value
  IF NEW.tax_percentage > 0 THEN
    NEW.tax_value = (NEW.final_value * NEW.tax_percentage / 100);
  END IF;
  
  -- Calculate total value (final + fees + taxes)
  NEW.total_value = NEW.final_value + NEW.additional_fees + NEW.tax_value;
  
  -- Calculate installment value
  IF NEW.installments_number > 0 THEN
    NEW.installment_value = NEW.total_value / NEW.installments_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate values
CREATE TRIGGER trigger_calculate_negotiation_values
  BEFORE INSERT OR UPDATE ON public.negotiations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_negotiation_values();

-- Function to log history on changes
CREATE OR REPLACE FUNCTION log_negotiation_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.negotiation_history (negotiation_id, action, performed_by, notes)
    VALUES (NEW.id, 'created', NEW.created_by, 'Negotiation created');
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log significant changes
    IF OLD.status != NEW.status THEN
      INSERT INTO public.negotiation_history (negotiation_id, action, changes, performed_by, notes)
      VALUES (
        NEW.id, 
        'status_changed', 
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
        COALESCE(NEW.updated_by, NEW.created_by),
        'Status changed from ' || OLD.status || ' to ' || NEW.status
      );
    END IF;
    
    IF OLD.total_value != NEW.total_value THEN
      INSERT INTO public.negotiation_history (negotiation_id, action, changes, performed_by)
      VALUES (
        NEW.id, 
        'value_updated', 
        jsonb_build_object('old_value', OLD.total_value, 'new_value', NEW.total_value),
        COALESCE(NEW.updated_by, NEW.created_by)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log changes
CREATE TRIGGER trigger_log_negotiation_changes
  AFTER INSERT OR UPDATE ON public.negotiations
  FOR EACH ROW
  EXECUTE FUNCTION log_negotiation_changes();

-- RLS Policies
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view negotiations they created or are assigned to
CREATE POLICY "Users can view own negotiations"
  ON public.negotiations
  FOR SELECT
  USING (
    auth.uid() = created_by OR
    auth.uid() = approved_by OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role_name IN ('admin', 'producer', 'manager')
    )
  );

-- Policy: Producers and admins can create negotiations
CREATE POLICY "Producers can create negotiations"
  ON public.negotiations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role_name IN ('admin', 'producer', 'manager')
    )
  );

-- Policy: Users can update their own negotiations (if not completed/cancelled)
CREATE POLICY "Users can update own negotiations"
  ON public.negotiations
  FOR UPDATE
  USING (
    (auth.uid() = created_by OR 
     EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = auth.uid()
       AND role_name IN ('admin', 'manager')
     )) AND
    status NOT IN ('completed', 'cancelled')
  );

-- Policy: Only admins can delete negotiations
CREATE POLICY "Admins can delete negotiations"
  ON public.negotiations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role_name = 'admin'
    )
  );

-- History table policies
CREATE POLICY "Users can view history of accessible negotiations"
  ON public.negotiation_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.negotiations
      WHERE id = negotiation_id
      AND (
        auth.uid() = created_by OR
        auth.uid() = approved_by OR
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid()
          AND role_name IN ('admin', 'producer', 'manager')
        )
      )
    )
  );

-- Attachments policies
CREATE POLICY "Users can view attachments of accessible negotiations"
  ON public.negotiation_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.negotiations
      WHERE id = negotiation_id
      AND (
        auth.uid() = created_by OR
        auth.uid() = approved_by OR
        EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid()
          AND role_name IN ('admin', 'producer', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can manage attachments of own negotiations"
  ON public.negotiation_attachments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.negotiations
      WHERE id = negotiation_id
      AND auth.uid() = created_by
    )
  );

-- Grant permissions
GRANT ALL ON public.negotiations TO authenticated;
GRANT ALL ON public.negotiation_history TO authenticated;
GRANT ALL ON public.negotiation_attachments TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.negotiations IS 'Store commercial negotiations with complete payment and discount tracking';
COMMENT ON TABLE public.negotiation_history IS 'Audit trail for all negotiation changes';
COMMENT ON TABLE public.negotiation_attachments IS 'File attachments for negotiations (contracts, proposals, etc)';

-- Create view for negotiation summary
CREATE OR REPLACE VIEW public.negotiation_summary AS
SELECT 
  n.id,
  n.title,
  n.client_name,
  n.status,
  n.base_value,
  n.discount_percentage,
  n.discount_value,
  n.final_value,
  n.additional_fees,
  n.tax_value,
  n.total_value,
  n.installments_number,
  n.installment_value,
  n.payment_methods,
  n.negotiation_date,
  n.expected_closing_date,
  n.created_at,
  u.email as creator_email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email) as creator_name
FROM public.negotiations n
LEFT JOIN auth.users u ON n.created_by = u.id;

GRANT SELECT ON public.negotiation_summary TO authenticated;

COMMENT ON VIEW public.negotiation_summary IS 'Summary view of negotiations with calculated values and creator info';
