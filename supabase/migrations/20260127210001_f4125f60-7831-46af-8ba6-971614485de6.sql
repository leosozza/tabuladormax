-- =====================================================
-- SISTEMA DE TAGS PARA CONVERSAS WHATSAPP
-- =====================================================

-- Tabela de definição de tags
CREATE TABLE public.whatsapp_conversation_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de associação tags <-> conversas
CREATE TABLE public.whatsapp_conversation_tag_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  bitrix_id TEXT,
  tag_id UUID NOT NULL REFERENCES public.whatsapp_conversation_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(phone_number, tag_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversation_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies para tags
CREATE POLICY "Authenticated users can view tags" 
ON public.whatsapp_conversation_tags 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create tags" 
ON public.whatsapp_conversation_tags 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tags" 
ON public.whatsapp_conversation_tags 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tags" 
ON public.whatsapp_conversation_tags 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- RLS Policies para assignments
CREATE POLICY "Authenticated users can view tag assignments" 
ON public.whatsapp_conversation_tag_assignments 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create tag assignments" 
ON public.whatsapp_conversation_tag_assignments 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tag assignments" 
ON public.whatsapp_conversation_tag_assignments 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- =====================================================
-- ATUALIZAÇÃO TABELA DE PARTICIPANTES
-- =====================================================

-- Adicionar prioridade e nome de quem convidou
ALTER TABLE public.whatsapp_conversation_participants 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 5),
ADD COLUMN IF NOT EXISTS inviter_name TEXT;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tag_assignments_phone ON public.whatsapp_conversation_tag_assignments(phone_number);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_tag ON public.whatsapp_conversation_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_participants_priority ON public.whatsapp_conversation_participants(priority) WHERE priority > 0;

-- =====================================================
-- RPC PARA BUSCAR TAGS DE UMA CONVERSA
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_conversation_tags(p_phone_number TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  color TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.color,
    a.assigned_at,
    a.assigned_by
  FROM whatsapp_conversation_tag_assignments a
  JOIN whatsapp_conversation_tags t ON t.id = a.tag_id
  WHERE a.phone_number = p_phone_number
  ORDER BY a.assigned_at DESC;
END;
$$;

-- =====================================================
-- RPC PARA BUSCAR CONVITES DO OPERADOR LOGADO
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_my_invited_conversations(p_operator_id UUID)
RETURNS TABLE (
  phone_number TEXT,
  bitrix_id TEXT,
  priority INTEGER,
  invited_by UUID,
  inviter_name TEXT,
  invited_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.phone_number,
    p.bitrix_id,
    p.priority,
    p.invited_by,
    p.inviter_name,
    p.created_at as invited_at
  FROM whatsapp_conversation_participants p
  WHERE p.operator_id = p_operator_id
    AND p.is_active = true
  ORDER BY p.priority DESC NULLS LAST, p.created_at DESC;
END;
$$;