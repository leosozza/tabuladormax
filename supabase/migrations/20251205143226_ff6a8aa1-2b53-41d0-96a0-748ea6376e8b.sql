-- Remover DEFAULT false da coluna ficha_confirmada
-- Isso evita que valores NULL sejam substituídos por false automaticamente
ALTER TABLE public.leads ALTER COLUMN ficha_confirmada DROP DEFAULT;

-- Corrigir dados existentes onde raw contém '1880' (Aguardando) mas ficha_confirmada = false
-- O valor '1880' no Bitrix representa "Aguardando" e deve ser NULL no Supabase
UPDATE public.leads 
SET ficha_confirmada = NULL,
    updated_at = NOW()
WHERE raw->>'UF_CRM_1737378043893' = '1880' 
  AND ficha_confirmada = false;

-- Também corrigir casos onde o valor está como array (Bitrix às vezes retorna assim)
UPDATE public.leads 
SET ficha_confirmada = NULL,
    updated_at = NOW()
WHERE raw->'UF_CRM_1737378043893'->>0 = '1880' 
  AND ficha_confirmada = false;

-- Log: Verificar quantos registros foram afetados
-- SELECT COUNT(*) FROM leads WHERE ficha_confirmada IS NULL;