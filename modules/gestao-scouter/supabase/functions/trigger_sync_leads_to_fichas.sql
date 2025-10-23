-- ============================================================================
-- DEPRECATED: Trigger Function (Legacy)
-- ============================================================================
-- ⚠️ ATENÇÃO: Este arquivo está DEPRECATED!
-- ⚠️ A tabela 'fichas' foi substituída pela tabela 'leads'
-- ⚠️ A sincronização agora é leads ↔ leads (não leads → fichas)
-- ⚠️ Não instalar este trigger - mantido apenas para referência histórica
-- 
-- ============================================================================
-- Trigger Function: Sincronização Automática de Leads → Fichas (LEGACY/DEPRECATED)
-- ============================================================================
-- ⚠️ ATENÇÃO: Este arquivo deve ser executado MANUALMENTE no projeto TabuladorMax
-- ⚠️ Não pode ser executado via Lovable pois é um projeto externo
-- ⚠️ **DEPRECATED**: A sincronização agora é leads ↔ leads, não leads → fichas
-- 
-- Este trigger sincroniza em TEMPO REAL a tabela `leads` (TabuladorMax) com
-- a tabela `fichas` (Gestão Scouter). É OPCIONAL, pois a sincronização
-- bidirecional automática a cada 5 minutos já está configurada via Edge Function.
--
-- **STATUS**: DEPRECATED - Não usar em produção
-- **SUBSTITUÍDO POR**: Sincronização bidirecional leads ↔ leads via Edge Functions
--
-- PASSOS PARA INSTALAÇÃO MANUAL (NÃO RECOMENDADO):
-- 1. Acessar: https://supabase.com/dashboard/project/gkvvtfqfggddzotxltxf/sql
-- 2. Copiar e colar TODO este arquivo SQL
-- 3. Executar
-- 4. Configurar as variáveis de ambiente (ver seção de configuração abaixo)
--
-- Pré-requisitos:
-- 1. Configurar variáveis de ambiente no projeto TabuladorMax:
--    - GESTAO_SCOUTER_URL: URL do projeto Gestão Scouter
--    - GESTAO_SCOUTER_SERVICE_KEY: Service role key do Gestão Scouter
-- 2. Extensão http habilitada: CREATE EXTENSION IF NOT EXISTS http;
--
-- ============================================================================

-- Habilitar extensão http para fazer chamadas REST API
CREATE EXTENSION IF NOT EXISTS http;

-- ============================================================================
-- Função: sync_lead_to_fichas
-- ============================================================================
-- Esta função faz o upsert de um lead na tabela fichas do projeto Gestão Scouter
-- usando a API REST do Supabase.
--
CREATE OR REPLACE FUNCTION public.sync_lead_to_fichas()
RETURNS trigger AS $$
DECLARE
  gestao_url text;
  gestao_key text;
  payload jsonb;
  response http_response;
BEGIN
  -- Obter URL e chave do projeto de destino
  gestao_url := current_setting('app.gestao_scouter_url', true);
  gestao_key := current_setting('app.gestao_scouter_service_key', true);
  
  -- Validar configurações
  IF gestao_url IS NULL OR gestao_key IS NULL THEN
    RAISE WARNING 'Configurações de sincronização não encontradas. Configure app.gestao_scouter_url e app.gestao_scouter_service_key';
    RETURN NEW;
  END IF;

  -- Para DELETE, remover o registro da tabela fichas
  IF (TG_OP = 'DELETE') THEN
    payload := jsonb_build_object(
      'id', OLD.id
    );
    
    -- Fazer DELETE via API REST
    SELECT * INTO response FROM http((
      'DELETE',
      gestao_url || '/rest/v1/fichas?id=eq.' || OLD.id,
      ARRAY[
        http_header('apikey', gestao_key),
        http_header('Authorization', 'Bearer ' || gestao_key),
        http_header('Content-Type', 'application/json'),
        http_header('Prefer', 'return=minimal')
      ],
      'application/json',
      ''
    )::http_request);
    
    RAISE LOG 'Lead % removido da tabela fichas. Status: %', OLD.id, response.status;
    RETURN OLD;
  END IF;

  -- Para INSERT e UPDATE, preparar payload com todos os campos
  payload := jsonb_build_object(
    'id', NEW.id,
    'nome', NEW.nome,
    'telefone', NEW.telefone,
    'email', NEW.email,
    'idade', NEW.idade,
    'projeto', NEW.projeto,
    'scouter', NEW.scouter,
    'supervisor', NEW.supervisor,
    'localizacao', NEW.localizacao,
    'latitude', NEW.latitude,
    'longitude', NEW.longitude,
    'local_da_abordagem', NEW.local_da_abordagem,
    'criado', NEW.criado,
    'valor_ficha', NEW.valor_ficha,
    'etapa', NEW.etapa,
    'ficha_confirmada', NEW.ficha_confirmada,
    'foto', NEW.foto,
    'raw', to_jsonb(NEW),
    'updated_at', COALESCE(NEW.updated_at, NOW()),
    'deleted', FALSE
  );

  -- Fazer upsert via API REST do Supabase
  SELECT * INTO response FROM http((
    'POST',
    gestao_url || '/rest/v1/fichas',
    ARRAY[
      http_header('apikey', gestao_key),
      http_header('Authorization', 'Bearer ' || gestao_key),
      http_header('Content-Type', 'application/json'),
      http_header('Prefer', 'resolution=merge-duplicates,return=minimal')
    ],
    'application/json',
    payload::text
  )::http_request);

  -- Log do resultado
  IF response.status >= 200 AND response.status < 300 THEN
    RAISE LOG 'Lead % sincronizado com sucesso para fichas. Status: %', NEW.id, response.status;
  ELSE
    RAISE WARNING 'Erro ao sincronizar lead % para fichas. Status: %, Response: %', 
      NEW.id, response.status, response.content;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Triggers: Sincronização automática em INSERT, UPDATE e DELETE
-- ============================================================================

-- Trigger para INSERT
DROP TRIGGER IF EXISTS trigger_sync_lead_insert ON public.leads;
CREATE TRIGGER trigger_sync_lead_insert
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lead_to_fichas();

-- Trigger para UPDATE
DROP TRIGGER IF EXISTS trigger_sync_lead_update ON public.leads;
CREATE TRIGGER trigger_sync_lead_update
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lead_to_fichas();

-- Trigger para DELETE
DROP TRIGGER IF EXISTS trigger_sync_lead_delete ON public.leads;
CREATE TRIGGER trigger_sync_lead_delete
  AFTER DELETE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lead_to_fichas();

-- ============================================================================
-- Instruções de Configuração
-- ============================================================================
-- Execute os comandos abaixo no projeto TabuladorMax para configurar as
-- variáveis de ambiente necessárias:
--
-- 1. Configurar URL do Gestão Scouter:
--    ALTER DATABASE postgres SET app.gestao_scouter_url = 'https://ngestyxtopvfeyenyvgt.supabase.co';
--
-- 2. Configurar Service Key do Gestão Scouter:
--    ALTER DATABASE postgres SET app.gestao_scouter_service_key = 'sua_service_role_key_aqui';
--
-- 3. Recarregar configurações:
--    SELECT pg_reload_conf();
--
-- ============================================================================
-- Verificação
-- ============================================================================
-- Para verificar se os triggers estão ativos:
--
-- SELECT tgname, tgenabled 
-- FROM pg_trigger 
-- WHERE tgrelid = 'public.leads'::regclass;
--
-- Para verificar logs de sincronização:
-- Verifique os logs do PostgreSQL no Supabase Dashboard
-- ============================================================================
