-- ============================================
-- Melhorias no trigger de sincronização para Gestão Scouter
-- Adiciona tratamento de erros e logs mais detalhados
-- ============================================

DROP FUNCTION IF EXISTS public.trigger_sync_to_gestao_scouter() CASCADE;

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
  http_response record;
  error_occurred boolean := false;
  error_message text;
  http_timeout_ms constant integer := 10000; -- 10 segundos timeout
BEGIN
  -- A verificação de sync_source é feita pela cláusula WHEN do trigger
  -- Este é um AFTER trigger, então não podemos modificar NEW
  
  BEGIN
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
    BEGIN
      SELECT decrypted_secret INTO supabase_url
      FROM vault.decrypted_secrets 
      WHERE name = 'SUPABASE_URL' LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao buscar SUPABASE_URL do vault: %', SQLERRM;
      supabase_url := NULL;
    END;

    BEGIN
      SELECT decrypted_secret INTO service_key
      FROM vault.decrypted_secrets 
      WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erro ao buscar SUPABASE_SERVICE_ROLE_KEY do vault: %', SQLERRM;
      service_key := NULL;
    END;

    -- Usar valores padrão se não encontrar (fallback)
    -- NOTA: Idealmente este valor deveria vir de uma configuração
    IF supabase_url IS NULL THEN
      supabase_url := current_setting('app.supabase_url', true);
      IF supabase_url IS NULL THEN
        -- Último recurso: valor padrão (deve ser configurado em produção)
        supabase_url := 'https://jstsrgyxrrlklnzgsihd.supabase.co';
        RAISE NOTICE 'Usando SUPABASE_URL padrão: %', supabase_url;
      END IF;
    END IF;

    -- Se não tiver service_key, não pode sincronizar
    IF service_key IS NULL THEN
      RAISE NOTICE 'SUPABASE_SERVICE_ROLE_KEY não encontrado - sincronização pulada para lead %', NEW.id;
      RETURN NEW;
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

    -- Chamar Edge Function assincronamente com tratamento de erro
    BEGIN
      SELECT * INTO http_response FROM net.http_post(
        url := supabase_url || '/functions/v1/sync-to-gestao-scouter',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object(
          'lead', lead_data,
          'source', 'supabase'
        ),
        timeout_milliseconds := http_timeout_ms
      );

      -- Verificar status da resposta HTTP
      IF http_response.status >= 400 THEN
        error_occurred := true;
        error_message := format('HTTP %s: %s', http_response.status, http_response.content::text);
        RAISE NOTICE 'Erro ao chamar sync-to-gestao-scouter para lead %: %', NEW.id, error_message;
      ELSE
        RAISE NOTICE 'Sincronização iniciada com sucesso para lead %', NEW.id;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      error_occurred := true;
      error_message := SQLERRM;
      RAISE NOTICE 'Exceção ao chamar sync-to-gestao-scouter para lead %: %', NEW.id, error_message;
    END;

    -- Registrar evento de erro se necessário (não bloqueia a operação)
    IF error_occurred THEN
      BEGIN
        INSERT INTO sync_events (
          event_type,
          direction,
          lead_id,
          status,
          error_message,
          created_at
        ) VALUES (
          'trigger_call',
          'supabase_to_gestao_scouter',
          NEW.id,
          'error',
          error_message,
          NOW()
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao registrar sync_event: %', SQLERRM;
      END;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Capturar qualquer erro não tratado
    RAISE NOTICE 'Erro não tratado no trigger de sincronização para lead %: %', NEW.id, SQLERRM;
    
    -- Tentar registrar o erro
    BEGIN
      INSERT INTO sync_events (
        event_type,
        direction,
        lead_id,
        status,
        error_message,
        created_at
      ) VALUES (
        'trigger_error',
        'supabase_to_gestao_scouter',
        NEW.id,
        'error',
        SQLERRM,
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Se nem isso funcionar, apenas log
      RAISE NOTICE 'Erro crítico ao registrar erro: %', SQLERRM;
    END;
  END;

  -- SEMPRE retornar NEW para não bloquear a operação principal
  RETURN NEW;
END;
$function$;

-- Comentário explicativo atualizado
COMMENT ON FUNCTION public.trigger_sync_to_gestao_scouter IS 
  'Função que sincroniza automaticamente leads do TabuladorMax para o Gestão Scouter via Edge Function.
  Possui tratamento de erros robusto para não bloquear operações de INSERT/UPDATE na tabela leads.
  Registra erros em sync_events quando possível.';

-- Nota: O trigger que usa esta função deve ser criado com algo como:
-- CREATE TRIGGER trigger_sync_leads_to_gestao_scouter
--   AFTER INSERT OR UPDATE ON public.leads
--   FOR EACH ROW
--   WHEN (NEW.sync_source IS NULL OR NEW.sync_source != 'gestao_scouter')
--   EXECUTE FUNCTION public.trigger_sync_to_gestao_scouter();
