-- FASE 1: Criar trigger automático para preencher data_criacao_agendamento
CREATE OR REPLACE FUNCTION public.auto_set_data_criacao_agendamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou para Agendados ou Reagendar e o campo está vazio
  IF (NEW.etapa IN ('Agendados', 'Reagendar')) 
     AND (OLD.etapa IS DISTINCT FROM NEW.etapa)
     AND (NEW.data_criacao_agendamento IS NULL) 
  THEN
    NEW.data_criacao_agendamento = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_data_criacao_agendamento_on_etapa_change
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_data_criacao_agendamento();

COMMENT ON FUNCTION public.auto_set_data_criacao_agendamento() IS 'Preenche data_criacao_agendamento automaticamente quando lead muda para Agendados ou Reagendar';