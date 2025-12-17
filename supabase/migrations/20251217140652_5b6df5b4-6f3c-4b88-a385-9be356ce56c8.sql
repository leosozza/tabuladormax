-- Política para permitir leitura pública de leads (necessário para deep links)
-- Nota: Esta tabela contém dados de leads comerciais que precisam ser acessíveis
-- para operadores de telemarketing via deep link

CREATE POLICY "Allow public read access to leads"
ON public.leads
FOR SELECT
USING (true);

-- Política para permitir updates (necessário para tabulação)
CREATE POLICY "Allow public update access to leads"
ON public.leads
FOR UPDATE
USING (true)
WITH CHECK (true);