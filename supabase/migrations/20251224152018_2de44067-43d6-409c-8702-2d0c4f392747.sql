-- Inserir configurações padrão do sistema para IA e voz
INSERT INTO config_kv (key, value) VALUES 
  ('system_default_voice', '"laura"'),
  ('system_default_ai_provider', '"lovable"'),
  ('system_default_ai_model', '"google/gemini-2.5-flash"')
ON CONFLICT (key) DO NOTHING;