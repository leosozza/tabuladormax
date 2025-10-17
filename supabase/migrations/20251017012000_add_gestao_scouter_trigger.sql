-- ============================================
-- Trigger para Sincronização com gestao-scouter
-- ============================================

-- Criar função para trigger de sincronização com gestao-scouter
CREATE OR REPLACE FUNCTION public.trigger_sync_to_gestao_scouter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  lead_data jsonb;
  supabase_url text;
  service_key text;
  config_exists boolean;
BEGIN
  -- Ignorar quando sync_source é 'gestao_scouter' ou 'gestao-scouter' para evitar loops
  IF NEW.sync_source IN ('gestao_scouter', 'gestao-scouter') THEN
    RAISE NOTICE 'Ignorando trigger gestao-scouter - origem é %', NEW.sync_source;
    NEW.sync_source := NULL;
    RETURN NEW;
  END IF;

  -- Verificar se a sincronização com gestao-scouter está habilitada
  SELECT EXISTS(
    SELECT 1 FROM gestao_scouter_config 
    WHERE active = true AND sync_enabled = true
  ) INTO config_exists;

  IF NOT config_exists THEN
    RAISE NOTICE 'Sincronização com gestao-scouter desabilitada';
    RETURN NEW;
  END IF;

  -- Obter URL e chave do Supabase
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets 
  WHERE name = 'SUPABASE_URL' LIMIT 1;

  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets 
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  -- Usar valores padrão se não encontrar
  IF supabase_url IS NULL THEN
    supabase_url := 'https://gkvvtfqfggddzotxltxf.supabase.co';
  END IF;

  -- Construir payload com TODOS os campos da tabela leads
  lead_data := jsonb_build_object(
    'id', NEW.id,
    'name', NEW.name,
    'age', NEW.age,
    'address', NEW.address,
    'photo_url', NEW.photo_url,
    'responsible', NEW.responsible,
    'scouter', NEW.scouter,
    'raw', NEW.raw,
    'date_modify', NEW.date_modify,
    'updated_at', NEW.updated_at,
    'bitrix_telemarketing_id', NEW.bitrix_telemarketing_id,
    'commercial_project_id', NEW.commercial_project_id,
    'responsible_user_id', NEW.responsible_user_id,
    'celular', NEW.celular,
    'telefone_trabalho', NEW.telefone_trabalho,
    'telefone_casa', NEW.telefone_casa,
    'etapa', NEW.etapa,
    'fonte', NEW.fonte,
    'criado', NEW.criado,
    'nome_modelo', NEW.nome_modelo,
    'local_abordagem', NEW.local_abordagem,
    'ficha_confirmada', NEW.ficha_confirmada,
    'data_criacao_ficha', NEW.data_criacao_ficha,
    'data_confirmacao_ficha', NEW.data_confirmacao_ficha,
    'presenca_confirmada', NEW.presenca_confirmada,
    'compareceu', NEW.compareceu,
    'cadastro_existe_foto', NEW.cadastro_existe_foto,
    'valor_ficha', NEW.valor_ficha,
    'data_criacao_agendamento', NEW.data_criacao_agendamento,
    'horario_agendamento', NEW.horario_agendamento,
    'data_agendamento', NEW.data_agendamento,
    'gerenciamento_funil', NEW.gerenciamento_funil,
    'status_fluxo', NEW.status_fluxo,
    'etapa_funil', NEW.etapa_funil,
    'etapa_fluxo', NEW.etapa_fluxo,
    'funil_fichas', NEW.funil_fichas,
    'status_tabulacao', NEW.status_tabulacao,
    'maxsystem_id_ficha', NEW.maxsystem_id_ficha,
    'gestao_scouter', NEW.gestao_scouter,
    'op_telemarketing', NEW.op_telemarketing,
    'data_retorno_ligacao', NEW.data_retorno_ligacao
  );

  -- Chamar Edge Function assincronamente
  IF service_key IS NOT NULL THEN
    PERFORM
      net.http_post(
        url := supabase_url || '/functions/v1/sync-to-gestao-scouter',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object(
          'lead', lead_data,
          'source', 'supabase'
        )
      );
  END IF;

  RETURN NEW;
END;
$function$;

-- Criar trigger que executa após UPDATE na tabela leads
DROP TRIGGER IF EXISTS sync_lead_to_gestao_scouter_on_update ON public.leads;

CREATE TRIGGER sync_lead_to_gestao_scouter_on_update
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  WHEN (
    -- Só dispara se não for origem gestao-scouter
    OLD.sync_source IS DISTINCT FROM 'gestao_scouter' 
    AND NEW.sync_source IS DISTINCT FROM 'gestao_scouter'
    AND OLD.sync_source IS DISTINCT FROM 'gestao-scouter'
    AND NEW.sync_source IS DISTINCT FROM 'gestao-scouter'
  )
  EXECUTE FUNCTION public.trigger_sync_to_gestao_scouter();

-- Comentário explicativo
COMMENT ON FUNCTION public.trigger_sync_to_gestao_scouter IS 
  'Função que sincroniza automaticamente leads do TabuladorMax para a tabela fichas do projeto gestao-scouter via Edge Function';
