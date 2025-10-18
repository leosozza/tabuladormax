-- ============================================
-- SQL para executar no projeto gestao-scouter
-- ============================================
-- Este arquivo deve ser executado no Dashboard do Supabase do projeto gestao-scouter
-- (https://ngestyxtopvfeyenyvgt.supabase.co)

-- 1. Criar tabela fichas (espelho da tabela leads do TabuladorMax)
CREATE TABLE IF NOT EXISTS public.fichas (
  id bigint PRIMARY KEY,
  name text,
  responsible text,
  age integer,
  address text,
  scouter text,
  photo_url text,
  date_modify timestamptz,
  raw jsonb,
  updated_at timestamptz DEFAULT now(),
  
  -- Campos adicionais
  bitrix_telemarketing_id integer,
  commercial_project_id uuid,
  responsible_user_id uuid,
  celular text,
  telefone_trabalho text,
  telefone_casa text,
  etapa text,
  fonte text,
  criado timestamptz,
  nome_modelo text,
  local_abordagem text,
  ficha_confirmada boolean DEFAULT false,
  data_criacao_ficha timestamptz,
  data_confirmacao_ficha timestamptz,
  presenca_confirmada boolean DEFAULT false,
  compareceu boolean DEFAULT false,
  cadastro_existe_foto boolean DEFAULT false,
  valor_ficha numeric,
  data_criacao_agendamento timestamptz,
  horario_agendamento text,
  data_agendamento date,
  gerenciamento_funil text,
  status_fluxo text,
  etapa_funil text,
  etapa_fluxo text,
  funil_fichas text,
  status_tabulacao text,
  maxsystem_id_ficha text,
  gestao_scouter text,
  op_telemarketing text,
  data_retorno_ligacao timestamptz,
  
  -- Controle de sincronização
  last_sync_at timestamptz,
  sync_source text,
  sync_status text DEFAULT 'pending'
);

-- Comentários
COMMENT ON TABLE public.fichas IS 'Fichas sincronizadas do TabuladorMax';
COMMENT ON COLUMN public.fichas.id IS 'ID do lead no TabuladorMax (Bitrix ID)';
COMMENT ON COLUMN public.fichas.sync_source IS 'Origem da última sincronização (tabuladormax ou gestao_scouter)';
COMMENT ON COLUMN public.fichas.last_sync_at IS 'Data/hora da última sincronização';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fichas_updated_at ON public.fichas(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fichas_sync_status ON public.fichas(sync_status);
CREATE INDEX IF NOT EXISTS idx_fichas_sync_source ON public.fichas(sync_source);
CREATE INDEX IF NOT EXISTS idx_fichas_nome_modelo ON public.fichas(nome_modelo);
CREATE INDEX IF NOT EXISTS idx_fichas_etapa ON public.fichas(etapa);
CREATE INDEX IF NOT EXISTS idx_fichas_gestao_scouter ON public.fichas(gestao_scouter);

-- 2. Habilitar Row Level Security
ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas de acesso (ajustar conforme necessário)
-- Permitir leitura para usuários autenticados
CREATE POLICY "Usuários autenticados podem ver fichas"
  ON public.fichas FOR SELECT
  USING (auth.role() = 'authenticated');

-- Permitir inserção via serviço (TabuladorMax)
CREATE POLICY "Serviço pode inserir fichas"
  ON public.fichas FOR INSERT
  WITH CHECK (true);

-- Permitir atualização via serviço e usuários autenticados
CREATE POLICY "Serviço e usuários podem atualizar fichas"
  ON public.fichas FOR UPDATE
  USING (true);

-- 4. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_fichas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fichas_updated_at
  BEFORE UPDATE ON public.fichas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fichas_updated_at();

-- 5. Função para sincronizar de volta ao TabuladorMax
-- (Esta função será chamada por um trigger quando houver updates)
CREATE OR REPLACE FUNCTION public.trigger_sync_to_tabuladormax()
RETURNS TRIGGER AS $$
DECLARE
  tabuladormax_url text := 'https://gkvvtfqfggddzotxltxf.supabase.co';
  tabuladormax_function_url text;
BEGIN
  -- Evitar loop: se a origem é tabuladormax, não sincroniza de volta
  IF NEW.sync_source = 'tabuladormax' OR NEW.sync_source = 'supabase' THEN
    RAISE NOTICE 'Ignorando trigger - origem é tabuladormax';
    NEW.sync_source := NULL;
    RETURN NEW;
  END IF;

  -- Construir URL da edge function
  tabuladormax_function_url := tabuladormax_url || '/functions/v1/sync-from-gestao-scouter';

  -- Chamar edge function assincronamente usando pg_net
  PERFORM
    net.http_post(
      url := tabuladormax_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'ficha', row_to_json(NEW),
        'source', 'gestao_scouter'
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar trigger para sincronização automática
CREATE TRIGGER sync_ficha_to_tabuladormax_on_update
  AFTER UPDATE ON public.fichas
  FOR EACH ROW
  WHEN (NEW.sync_source IS DISTINCT FROM 'tabuladormax')
  EXECUTE FUNCTION public.trigger_sync_to_tabuladormax();

-- 7. Habilitar extensão pg_net (se ainda não estiver habilitada)
-- IMPORTANTE: Executar esta linha pode requerer permissões de SUPERUSER
-- Se der erro, execute pelo Dashboard do Supabase em Settings > Database > Extensions
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================
-- INSTRUÇÕES PARA ATIVAR A SINCRONIZAÇÃO
-- ============================================

-- Após executar este SQL no gestao-scouter:
-- 1. Verifique se a tabela fichas foi criada: SELECT * FROM public.fichas LIMIT 1;
-- 2. Verifique se pg_net está habilitada: SELECT * FROM pg_extension WHERE extname = 'pg_net';
-- 3. No TabuladorMax, vá para /sync-monitor e verifique a configuração
-- 4. A sincronização deve funcionar automaticamente ao atualizar leads no TabuladorMax

-- Para testar a sincronização:
-- 1. No TabuladorMax, atualize um lead qualquer
-- 2. Verifique se aparece na tabela fichas: SELECT * FROM public.fichas ORDER BY updated_at DESC LIMIT 10;
-- 3. Atualize uma ficha no gestao-scouter: UPDATE public.fichas SET nome_modelo = 'Teste' WHERE id = [ID];
-- 4. Verifique se a atualização chegou no TabuladorMax
