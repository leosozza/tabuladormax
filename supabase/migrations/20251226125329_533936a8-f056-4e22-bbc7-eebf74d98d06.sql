-- Criar tabela para armazenar documentos da negociação
CREATE TABLE public.negotiation_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  negotiation_id UUID NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('identity', 'payment_receipt', 'contract', 'address_proof', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  description TEXT,
  payment_method_id TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_negotiation_documents_negotiation_id ON public.negotiation_documents(negotiation_id);
CREATE INDEX idx_negotiation_documents_document_type ON public.negotiation_documents(document_type);

-- Enable RLS
ALTER TABLE public.negotiation_documents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Produtores podem ver documentos de suas negociações" 
ON public.negotiation_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.negotiations n
    JOIN public.deals d ON n.deal_id = d.id
    JOIN public.producers p ON d.producer_id = p.id
    WHERE n.id = negotiation_documents.negotiation_id
  )
);

CREATE POLICY "Produtores podem inserir documentos" 
ON public.negotiation_documents 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Produtores podem deletar seus documentos" 
ON public.negotiation_documents 
FOR DELETE 
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_negotiation_documents_updated_at
  BEFORE UPDATE ON public.negotiation_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket para documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'negotiation-documents', 
  'negotiation-documents', 
  false,
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- Políticas de storage
CREATE POLICY "Produtores podem fazer upload de documentos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'negotiation-documents');

CREATE POLICY "Produtores podem ver seus documentos"
ON storage.objects FOR SELECT
USING (bucket_id = 'negotiation-documents');

CREATE POLICY "Produtores podem deletar seus documentos"
ON storage.objects FOR DELETE
USING (bucket_id = 'negotiation-documents');