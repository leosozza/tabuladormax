-- ============================================
-- Tabela fichas para o projeto gestao-scouter
-- Esta tabela é um espelho da tabela leads do TabuladorMax
-- ============================================

-- IMPORTANTE: Este script deve ser executado no projeto gestao-scouter
-- não no projeto TabuladorMax

-- Criar tabela fichas (espelho de leads)
CREATE TABLE IF NOT EXISTS public.fichas (
  -- Campos básicos originais
  id BIGINT PRIMARY KEY,
  name TEXT,
  responsible TEXT,
  age INTEGER,
  address TEXT,
  scouter TEXT,
  photo_url TEXT,
  date_modify TIMESTAMPTZ,
  raw JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Campos de relacionamento
  bitrix_telemarketing_id BIGINT,
  commercial_project_id UUID,
  responsible_user_id UUID,
  
  -- Campos de contato
  celular TEXT,
  telefone_trabalho TEXT,
  telefone_casa TEXT,
  
  -- Informações básicas
  etapa TEXT,
  fonte TEXT,
  criado TIMESTAMPTZ,
  nome_modelo TEXT,
  
  -- Endereço adicional
  local_abordagem TEXT,
  
  -- Campos de ficha/modelo
  ficha_confirmada BOOLEAN DEFAULT false,
  data_criacao_ficha TIMESTAMPTZ,
  data_confirmacao_ficha TIMESTAMPTZ,
  presenca_confirmada BOOLEAN DEFAULT false,
  compareceu BOOLEAN DEFAULT false,
  cadastro_existe_foto BOOLEAN DEFAULT false,
  valor_ficha NUMERIC(10,2),
  
  -- Campos de agendamento
  data_criacao_agendamento TIMESTAMPTZ,
  horario_agendamento TEXT,
  data_agendamento DATE,
  
  -- Campos de fluxo/funil
  gerenciamento_funil TEXT,
  status_fluxo TEXT,
  etapa_funil TEXT,
  etapa_fluxo TEXT,
  funil_fichas TEXT,
  status_tabulacao TEXT,
  
  -- Campos de integração
  maxsystem_id_ficha TEXT,
  gestao_scouter TEXT,
  op_telemarketing TEXT,
  
  -- Outros
  data_retorno_ligacao TIMESTAMPTZ,
  
  -- Campos de controle de sincronização
  last_sync_at TIMESTAMPTZ,
  sync_source TEXT CHECK (sync_source IN ('tabuladormax', 'gestao_scouter', 'bitrix', 'manual')),
  sync_status TEXT CHECK (sync_status IN ('synced', 'syncing', 'error', 'pending'))
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_fichas_etapa ON public.fichas(etapa);
CREATE INDEX IF NOT EXISTS idx_fichas_criado ON public.fichas(criado);
CREATE INDEX IF NOT EXISTS idx_fichas_celular ON public.fichas(celular);
CREATE INDEX IF NOT EXISTS idx_fichas_ficha_confirmada ON public.fichas(ficha_confirmada);
CREATE INDEX IF NOT EXISTS idx_fichas_presenca_confirmada ON public.fichas(presenca_confirmada);
CREATE INDEX IF NOT EXISTS idx_fichas_compareceu ON public.fichas(compareceu);
CREATE INDEX IF NOT EXISTS idx_fichas_etapa_funil ON public.fichas(etapa_funil);
CREATE INDEX IF NOT EXISTS idx_fichas_status_fluxo ON public.fichas(status_fluxo);
CREATE INDEX IF NOT EXISTS idx_fichas_data_agendamento ON public.fichas(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_fichas_maxsystem_id_ficha ON public.fichas(maxsystem_id_ficha);
CREATE INDEX IF NOT EXISTS idx_fichas_last_sync_at ON public.fichas(last_sync_at);
CREATE INDEX IF NOT EXISTS idx_fichas_sync_source ON public.fichas(sync_source);

-- Habilitar RLS
ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;

-- Policy: Todos autenticados podem acessar
CREATE POLICY "Fichas são acessíveis por todos autenticados"
  ON public.fichas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comentários explicativos
COMMENT ON TABLE public.fichas IS 'Tabela de fichas sincronizada com leads do TabuladorMax';
COMMENT ON COLUMN public.fichas.id IS 'ID sincronizado da tabela leads do TabuladorMax';
COMMENT ON COLUMN public.fichas.sync_source IS 'Origem da última sincronização: tabuladormax, gestao_scouter, bitrix, manual';
COMMENT ON COLUMN public.fichas.sync_status IS 'Status da última sincronização';
COMMENT ON COLUMN public.fichas.last_sync_at IS 'Data/hora da última sincronização';

-- ============================================
-- Trigger para sincronização reversa (gestao-scouter → TabuladorMax)
-- ============================================

-- Criar função para trigger de sincronização reversa
CREATE OR REPLACE FUNCTION public.trigger_sync_to_tabuladormax()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  ficha_data jsonb;
  tabuladormax_url text;
BEGIN
  -- Ignorar quando sync_source é 'tabuladormax' para evitar loops
  IF NEW.sync_source = 'tabuladormax' THEN
    RAISE NOTICE 'Ignorando trigger tabuladormax - origem é tabuladormax';
    NEW.sync_source := NULL;
    RETURN NEW;
  END IF;

  -- TODO: Configurar URL do TabuladorMax via tabela de configuração
  -- Por enquanto, usar variável de ambiente ou valor fixo
  tabuladormax_url := 'https://gkvvtfqfggddzotxltxf.supabase.co/functions/v1/sync-from-gestao-scouter';

  -- Construir payload com todos os campos
  ficha_data := row_to_json(NEW)::jsonb;

  -- Chamar Edge Function do TabuladorMax assincronamente
  -- NOTA: Requer extensão pg_net habilitada
  PERFORM
    net.http_post(
      url := tabuladormax_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'ficha', ficha_data,
        'source', 'gestao_scouter'
      )
    );

  RETURN NEW;
END;
$function$;

-- Criar trigger que executa após UPDATE na tabela fichas
DROP TRIGGER IF EXISTS sync_ficha_to_tabuladormax_on_update ON public.fichas;

CREATE TRIGGER sync_ficha_to_tabuladormax_on_update
  AFTER UPDATE ON public.fichas
  FOR EACH ROW
  WHEN (
    -- Só dispara se não for origem tabuladormax
    OLD.sync_source IS DISTINCT FROM 'tabuladormax' 
    AND NEW.sync_source IS DISTINCT FROM 'tabuladormax'
  )
  EXECUTE FUNCTION public.trigger_sync_to_tabuladormax();

-- Comentário explicativo
COMMENT ON FUNCTION public.trigger_sync_to_tabuladormax IS 
  'Função que sincroniza automaticamente fichas do gestao-scouter de volta para a tabela leads do TabuladorMax';

-- ============================================
-- INSTRUÇÕES DE USO
-- ============================================

/*
1. Execute este script no projeto gestao-scouter via Dashboard do Supabase ou CLI

2. Configure a URL do TabuladorMax na função trigger_sync_to_tabuladormax
   ou crie uma tabela de configuração similar à gestao_scouter_config

3. Habilite a extensão pg_net se ainda não estiver habilitada:
   CREATE EXTENSION IF NOT EXISTS pg_net;

4. Certifique-se de que o Edge Function sync-from-gestao-scouter
   está implantado no projeto TabuladorMax

5. Teste a sincronização:
   - Insira/atualize uma ficha no gestao-scouter
   - Verifique se o lead correspondente é atualizado no TabuladorMax
   - Verifique os logs na tabela sync_events do TabuladorMax

6. Para monitorar sincronizações, acesse:
   TabuladorMax → /sync-monitor

NOTAS IMPORTANTES:
- A sincronização é bidirecional e usa sync_source para evitar loops
- Alterações em qualquer sistema são propagadas automaticamente
- Todos os campos são sincronizados para manter consistência
- Use filtros na sincronização se necessário (ex: apenas fichas confirmadas)
*/
