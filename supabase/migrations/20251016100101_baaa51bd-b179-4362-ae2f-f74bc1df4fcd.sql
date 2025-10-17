-- Adicionar constraint UNIQUE em code para garantir integridade
ALTER TABLE commercial_projects 
ADD CONSTRAINT commercial_projects_code_unique UNIQUE (code);