-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for storing Chatwoot contact data
CREATE TABLE IF NOT EXISTS public.chatwoot_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bitrix_id TEXT NOT NULL UNIQUE,
  conversation_id INTEGER,
  contact_id INTEGER,
  name TEXT,
  phone_number TEXT,
  email TEXT,
  thumbnail TEXT,
  custom_attributes JSONB DEFAULT '{}'::jsonb,
  additional_attributes JSONB DEFAULT '{}'::jsonb,
  last_activity_at BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on bitrix_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_chatwoot_contacts_bitrix_id ON public.chatwoot_contacts(bitrix_id);

-- Enable Row Level Security
ALTER TABLE public.chatwoot_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view contacts" 
ON public.chatwoot_contacts 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert contacts" 
ON public.chatwoot_contacts 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts" 
ON public.chatwoot_contacts 
FOR UPDATE 
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chatwoot_contacts_updated_at
BEFORE UPDATE ON public.chatwoot_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();