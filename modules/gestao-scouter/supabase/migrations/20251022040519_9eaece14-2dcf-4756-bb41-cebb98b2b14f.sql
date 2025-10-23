-- Primeiro, remover duplicatas mantendo apenas o registro mais recente por project_id
DELETE FROM tabulador_config
WHERE ctid NOT IN (
  SELECT MAX(ctid)
  FROM tabulador_config
  GROUP BY project_id
);

-- Agora adicionar o constraint UNIQUE no project_id
ALTER TABLE tabulador_config
ADD CONSTRAINT tabulador_config_project_id_key UNIQUE (project_id);