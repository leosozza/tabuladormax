-- Add description column to button_config table
ALTER TABLE button_config 
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN button_config.description IS 'Descrição/dica que aparece ao passar o mouse sobre o botão';