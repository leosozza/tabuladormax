-- Script SQL para inserir 20 leads fictícios na tabela fichas
-- Execute este script no Supabase SQL Editor

INSERT INTO public.fichas (
  nome, telefone, email, idade, projeto, scouter, etapa, modelo, 
  localizacao, valor_ficha, ficha_confirmada, cadastro_existe_foto, 
  presenca_confirmada, local_da_abordagem, latitude, longitude, aprovado
) VALUES
  ('João Silva', '(11) 98765-4321', 'joao123@gmail.com', '25', 'Projeto A', 'João Scouter', 'Contato', 'Fashion', 'São Paulo, SP', 250.00, 'Sim', 'SIM', 'Sim', 'Shopping', -23.5505, -46.6333, true),
  ('Maria Santos', '(21) 97654-3210', 'maria456@hotmail.com', '22', 'Projeto B', 'Maria Scouter', 'Agendado', 'Editorial', 'Rio de Janeiro, RJ', 300.00, 'Aguardando', 'SIM', 'Pendente', 'Rua', -22.9068, -43.1729, null),
  ('Ana Costa', '(31) 96543-2109', 'ana789@outlook.com', '28', 'Projeto Teste', 'Pedro Scouter', 'Convertido', 'Comercial', 'Belo Horizonte, MG', 350.00, 'Sim', 'SIM', 'Sim', 'Evento', -19.9167, -43.9345, true),
  ('Pedro Santos', '(41) 95432-1098', 'pedro234@gmail.com', '30', 'Casting Fashion', 'Ana Scouter', 'Contato', 'Fitness', 'Curitiba, PR', 200.00, 'Não', 'NÃO', 'Não', 'Academia', -25.4284, -49.2733, false),
  ('Lucas Oliveira', '(51) 94321-0987', 'lucas567@yahoo.com', '24', 'Casting Editorial', 'Sistema', 'Agendado', 'Plus Size', 'Porto Alegre, RS', 275.00, 'Aguardando', 'SIM', 'Sim', 'Parque', -30.0346, -51.2177, null),
  ('Rafael Costa', '(71) 93210-9876', 'rafael890@gmail.com', '27', 'Projeto A', 'João Scouter', 'Contato', 'Fashion', 'Salvador, BA', 320.00, 'Sim', 'SIM', 'Sim', 'Shopping', -12.9714, -38.5014, true),
  ('Gabriel Souza', '(61) 92109-8765', 'gabriel321@hotmail.com', '26', 'Projeto B', 'Maria Scouter', 'Convertido', 'Editorial', 'Brasília, DF', 400.00, 'Sim', 'SIM', 'Sim', 'Rua', -15.7975, -47.8919, true),
  ('Felipe Rodrigues', '(11) 91098-7654', 'felipe654@outlook.com', '29', 'Projeto Teste', 'Pedro Scouter', 'Agendado', 'Comercial', 'São Paulo, SP', 290.00, 'Aguardando', 'NÃO', 'Pendente', 'Evento', -23.5505, -46.6333, null),
  ('Matheus Lima', '(21) 90987-6543', 'matheus987@gmail.com', '23', 'Casting Fashion', 'Ana Scouter', 'Contato', 'Fitness', 'Rio de Janeiro, RJ', 310.00, 'Não', 'SIM', 'Não', 'Academia', -22.9068, -43.1729, false),
  ('Bruno Alves', '(31) 99876-5432', 'bruno147@yahoo.com', '31', 'Casting Editorial', 'Sistema', 'Convertido', 'Plus Size', 'Belo Horizonte, MG', 360.00, 'Sim', 'SIM', 'Sim', 'Parque', -19.9167, -43.9345, true),
  ('Julia Silva', '(41) 98765-4321', 'julia258@gmail.com', '21', 'Projeto A', 'João Scouter', 'Contato', 'Fashion', 'Curitiba, PR', 245.00, 'Aguardando', 'SIM', 'Pendente', 'Shopping', -25.4284, -49.2733, null),
  ('Beatriz Oliveira', '(51) 97654-3210', 'beatriz369@hotmail.com', '33', 'Projeto B', 'Maria Scouter', 'Agendado', 'Editorial', 'Porto Alegre, RS', 330.00, 'Sim', 'SIM', 'Sim', 'Rua', -30.0346, -51.2177, true),
  ('Camila Souza', '(71) 96543-2109', 'camila741@outlook.com', '20', 'Projeto Teste', 'Pedro Scouter', 'Contato', 'Comercial', 'Salvador, BA', 260.00, 'Não', 'NÃO', 'Não', 'Evento', -12.9714, -38.5014, false),
  ('Fernanda Lima', '(61) 95432-1098', 'fernanda852@gmail.com', '35', 'Casting Fashion', 'Ana Scouter', 'Convertido', 'Fitness', 'Brasília, DF', 380.00, 'Sim', 'SIM', 'Sim', 'Academia', -15.7975, -47.8919, true),
  ('Larissa Rodrigues', '(11) 94321-0987', 'larissa963@yahoo.com', '19', 'Casting Editorial', 'Sistema', 'Agendado', 'Plus Size', 'São Paulo, SP', 270.00, 'Aguardando', 'SIM', 'Pendente', 'Parque', -23.5505, -46.6333, null),
  ('Gabriela Alves', '(21) 93210-9876', 'gabriela159@gmail.com', '32', 'Projeto A', 'João Scouter', 'Contato', 'Fashion', 'Rio de Janeiro, RJ', 340.00, 'Sim', 'SIM', 'Sim', 'Shopping', -22.9068, -43.1729, true),
  ('Isabela Martins', '(31) 92109-8765', 'isabela357@hotmail.com', '18', 'Projeto B', 'Maria Scouter', 'Convertido', 'Editorial', 'Belo Horizonte, MG', 420.00, 'Sim', 'SIM', 'Sim', 'Rua', -19.9167, -43.9345, true),
  ('Carolina Ferreira', '(41) 91098-7654', 'carolina456@outlook.com', '34', 'Projeto Teste', 'Pedro Scouter', 'Agendado', 'Comercial', 'Curitiba, PR', 295.00, 'Aguardando', 'NÃO', 'Pendente', 'Evento', -25.4284, -49.2733, null),
  ('Diego Martins', '(51) 90987-6543', 'diego789@gmail.com', '37', 'Casting Fashion', 'Ana Scouter', 'Contato', 'Fitness', 'Porto Alegre, RS', 315.00, 'Não', 'SIM', 'Não', 'Academia', -30.0346, -51.2177, false),
  ('André Ferreira', '(71) 99876-5432', 'andre012@yahoo.com', '36', 'Casting Editorial', 'Sistema', 'Convertido', 'Plus Size', 'Salvador, BA', 370.00, 'Sim', 'SIM', 'Sim', 'Parque', -12.9714, -38.5014, true);

-- Verificar os dados inseridos
SELECT COUNT(*) as total_leads FROM public.fichas;
SELECT projeto, COUNT(*) as quantidade FROM public.fichas GROUP BY projeto ORDER BY quantidade DESC;
SELECT etapa, COUNT(*) as quantidade FROM public.fichas GROUP BY etapa ORDER BY quantidade DESC;
