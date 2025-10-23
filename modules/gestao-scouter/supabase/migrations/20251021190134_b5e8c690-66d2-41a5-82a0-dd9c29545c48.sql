-- Create RLS policy to allow service_role to perform UPSERT operations
-- This is necessary for TabuladorMax to sync data to Gestão Scouter
CREATE POLICY "service_role_upsert_leads"
  ON public.leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_upsert_leads" ON public.leads IS 
  'Permite que service_role (usado pelo TabuladorMax) faça UPSERT de leads via sincronização';