-- Atualizar constraint do tipo de notificação para incluir 'cliente_compareceu'
ALTER TABLE public.telemarketing_notifications 
DROP CONSTRAINT IF EXISTS telemarketing_notifications_type_check;

ALTER TABLE public.telemarketing_notifications 
ADD CONSTRAINT telemarketing_notifications_type_check 
CHECK (type IN ('new_message', 'bot_transfer', 'urgent', 'window_closing', 'cliente_compareceu'));

-- Criar função que detecta quando cliente compareceu e cria notificação
CREATE OR REPLACE FUNCTION public.notify_cliente_compareceu()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Só notificar se compareceu mudou para true E tem operador atribuído
  IF (NEW.compareceu = true) 
     AND (OLD.compareceu IS NULL OR OLD.compareceu = false)
     AND (NEW.bitrix_telemarketing_id IS NOT NULL) THEN
    
    INSERT INTO telemarketing_notifications (
      bitrix_telemarketing_id,
      commercial_project_id,
      type,
      title,
      message,
      lead_id,
      metadata
    ) VALUES (
      NEW.bitrix_telemarketing_id,
      NEW.commercial_project_id,
      'cliente_compareceu',
      '🎉 PARABÉNS! Cliente Compareceu!',
      format('%s compareceu na agência!', COALESCE(NEW.nome_modelo, NEW.name, 'Seu cliente')),
      NEW.id,
      jsonb_build_object(
        'nome_modelo', COALESCE(NEW.nome_modelo, NEW.name),
        'projeto', NEW.projeto_comercial,
        'data_agendamento', NEW.data_agendamento
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que dispara quando compareceu muda
DROP TRIGGER IF EXISTS trigger_cliente_compareceu ON public.leads;

CREATE TRIGGER trigger_cliente_compareceu
AFTER UPDATE ON public.leads
FOR EACH ROW
WHEN (NEW.compareceu IS DISTINCT FROM OLD.compareceu)
EXECUTE FUNCTION public.notify_cliente_compareceu();