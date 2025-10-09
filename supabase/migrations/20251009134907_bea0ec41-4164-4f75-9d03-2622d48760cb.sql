-- Atualizar categorias antigas dos botões para as novas
UPDATE button_config 
SET category = CASE 
  WHEN category = 'AGENDAMENTO' THEN 'AGENDAR'
  WHEN category = 'QUALIFICACAO' THEN 'RETORNAR'
  WHEN category = 'OUTRAS' THEN 'NAO_AGENDADO'
  WHEN category IS NULL THEN 'NAO_AGENDADO'
  ELSE category
END
WHERE category IN ('AGENDAMENTO', 'QUALIFICACAO', 'OUTRAS') OR category IS NULL;