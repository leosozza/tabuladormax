-- Add webhook_url column to button_config if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'button_config' 
        AND column_name = 'webhook_url'
    ) THEN
        ALTER TABLE public.button_config 
        ADD COLUMN webhook_url text DEFAULT 'https://maxsystem.bitrix24.com.br/rest/7/338m945lx9ifjjnr/crm.lead.update.json';
    END IF;
END $$;