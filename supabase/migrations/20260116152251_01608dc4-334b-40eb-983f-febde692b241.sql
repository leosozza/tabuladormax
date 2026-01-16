-- =============================================
-- SISTEMA DE FILA DE ATENDIMENTO DE PRODUTORES
-- =============================================

-- Enum para status do produtor
CREATE TYPE producer_attendance_status_enum AS ENUM (
  'DISPONIVEL',
  'EM_ATENDIMENTO', 
  'PAUSA',
  'INDISPONIVEL'
);

-- Tabela principal de status de atendimento do produtor
CREATE TABLE public.producer_attendance_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id TEXT NOT NULL UNIQUE,
  status producer_attendance_status_enum NOT NULL DEFAULT 'INDISPONIVEL',
  queue_position INTEGER,
  joined_queue_at TIMESTAMPTZ,
  current_deal_id UUID REFERENCES public.deals(id),
  consecutive_losses INTEGER NOT NULL DEFAULT 0,
  penalty_active BOOLEAN NOT NULL DEFAULT false,
  penalty_skips_remaining INTEGER NOT NULL DEFAULT 0,
  total_attendances INTEGER NOT NULL DEFAULT 0,
  total_closed INTEGER NOT NULL DEFAULT 0,
  total_lost INTEGER NOT NULL DEFAULT 0,
  average_attendance_time INTEGER,
  last_attendance_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_producer_attendance_status_status ON public.producer_attendance_status(status);
CREATE INDEX idx_producer_attendance_status_queue ON public.producer_attendance_status(queue_position) WHERE queue_position IS NOT NULL;
CREATE INDEX idx_producer_attendance_status_producer ON public.producer_attendance_status(producer_id);

CREATE TABLE public.producer_attendance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id TEXT NOT NULL,
  deal_id UUID REFERENCES public.deals(id),
  action TEXT NOT NULL,
  status_from TEXT,
  status_to TEXT,
  result TEXT,
  queue_position_at INTEGER,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_producer_attendance_log_producer ON public.producer_attendance_log(producer_id);
CREATE INDEX idx_producer_attendance_log_created ON public.producer_attendance_log(created_at DESC);

ALTER TABLE public.producer_attendance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producer_attendance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Produtores podem ver todos os status" 
  ON public.producer_attendance_status FOR SELECT USING (true);

CREATE POLICY "Sistema pode gerenciar status" 
  ON public.producer_attendance_status FOR ALL USING (true);

CREATE POLICY "Produtores podem ver logs" 
  ON public.producer_attendance_log FOR SELECT USING (true);

CREATE POLICY "Sistema pode inserir logs" 
  ON public.producer_attendance_log FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.producer_attendance_status;

-- Função para recalcular posições da fila
CREATE OR REPLACE FUNCTION fn_recalculate_queue_positions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY joined_queue_at ASC) as new_position
    FROM producer_attendance_status
    WHERE status = 'DISPONIVEL' AND queue_position IS NOT NULL
  )
  UPDATE producer_attendance_status pas
  SET queue_position = ranked.new_position, updated_at = now()
  FROM ranked
  WHERE pas.id = ranked.id;
END;
$$;

-- Função para produtor entrar na fila
CREATE OR REPLACE FUNCTION fn_producer_join_queue(p_producer_id TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, new_position INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status producer_attendance_status_enum;
  v_new_position INTEGER;
BEGIN
  SELECT status INTO v_current_status FROM producer_attendance_status WHERE producer_id = p_producer_id;
  
  IF v_current_status IS NULL THEN
    SELECT COALESCE(MAX(queue_position), 0) + 1 INTO v_new_position FROM producer_attendance_status WHERE queue_position IS NOT NULL;
    INSERT INTO producer_attendance_status (producer_id, status, queue_position, joined_queue_at)
    VALUES (p_producer_id, 'DISPONIVEL', v_new_position, now());
    INSERT INTO producer_attendance_log (producer_id, action, status_from, status_to, queue_position_at)
    VALUES (p_producer_id, 'STATUS_CHANGE', 'INDISPONIVEL', 'DISPONIVEL', v_new_position);
    RETURN QUERY SELECT true, 'Entrou na fila com sucesso'::TEXT, v_new_position;
    RETURN;
  END IF;
  
  IF v_current_status = 'DISPONIVEL' THEN
    SELECT queue_position INTO v_new_position FROM producer_attendance_status WHERE producer_id = p_producer_id;
    RETURN QUERY SELECT true, 'Já está na fila'::TEXT, v_new_position;
    RETURN;
  END IF;
  
  IF v_current_status = 'EM_ATENDIMENTO' THEN
    RETURN QUERY SELECT false, 'Não pode entrar na fila durante atendimento'::TEXT, NULL::INTEGER;
    RETURN;
  END IF;
  
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO v_new_position FROM producer_attendance_status WHERE queue_position IS NOT NULL;
  
  UPDATE producer_attendance_status
  SET status = 'DISPONIVEL', queue_position = v_new_position, joined_queue_at = now(), updated_at = now()
  WHERE producer_id = p_producer_id;
  
  INSERT INTO producer_attendance_log (producer_id, action, status_from, status_to, queue_position_at)
  VALUES (p_producer_id, 'STATUS_CHANGE', v_current_status::TEXT, 'DISPONIVEL', v_new_position);
  
  RETURN QUERY SELECT true, 'Entrou na fila com sucesso'::TEXT, v_new_position;
END;
$$;

-- Função para produtor sair da fila
CREATE OR REPLACE FUNCTION fn_producer_leave_queue(p_producer_id TEXT, p_reason TEXT DEFAULT 'PAUSA')
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status producer_attendance_status_enum;
  v_new_status producer_attendance_status_enum;
BEGIN
  SELECT status INTO v_current_status FROM producer_attendance_status WHERE producer_id = p_producer_id;
  
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT false, 'Produtor não encontrado'::TEXT;
    RETURN;
  END IF;
  
  IF v_current_status = 'EM_ATENDIMENTO' THEN
    RETURN QUERY SELECT false, 'Não pode sair da fila durante atendimento'::TEXT;
    RETURN;
  END IF;
  
  v_new_status := CASE WHEN p_reason = 'INDISPONIVEL' THEN 'INDISPONIVEL'::producer_attendance_status_enum ELSE 'PAUSA'::producer_attendance_status_enum END;
  
  UPDATE producer_attendance_status
  SET status = v_new_status, queue_position = NULL, joined_queue_at = NULL, updated_at = now()
  WHERE producer_id = p_producer_id;
  
  PERFORM fn_recalculate_queue_positions();
  
  INSERT INTO producer_attendance_log (producer_id, action, status_from, status_to, notes)
  VALUES (p_producer_id, 'STATUS_CHANGE', v_current_status::TEXT, v_new_status::TEXT, p_reason);
  
  RETURN QUERY SELECT true, 'Saiu da fila com sucesso'::TEXT;
END;
$$;

-- Função para iniciar atendimento
CREATE OR REPLACE FUNCTION fn_producer_start_attendance(p_producer_id TEXT, p_deal_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status producer_attendance_status_enum;
  v_queue_position INTEGER;
  v_has_penalty BOOLEAN;
  v_skips INTEGER;
BEGIN
  SELECT status, queue_position, penalty_active, penalty_skips_remaining 
  INTO v_current_status, v_queue_position, v_has_penalty, v_skips
  FROM producer_attendance_status WHERE producer_id = p_producer_id;
  
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT false, 'Produtor não encontrado'::TEXT;
    RETURN;
  END IF;
  
  IF v_current_status != 'DISPONIVEL' THEN
    RETURN QUERY SELECT false, 'Produtor não está disponível'::TEXT;
    RETURN;
  END IF;
  
  IF v_has_penalty AND v_skips > 0 THEN
    UPDATE producer_attendance_status
    SET penalty_skips_remaining = penalty_skips_remaining - 1,
        penalty_active = CASE WHEN penalty_skips_remaining - 1 <= 0 THEN false ELSE true END,
        queue_position = (SELECT COALESCE(MAX(queue_position), 0) + 1 FROM producer_attendance_status WHERE queue_position IS NOT NULL),
        updated_at = now()
    WHERE producer_id = p_producer_id;
    PERFORM fn_recalculate_queue_positions();
    INSERT INTO producer_attendance_log (producer_id, action, notes)
    VALUES (p_producer_id, 'PENALTY_SKIPPED', 'Pulou rodada por penalidade');
    RETURN QUERY SELECT false, 'Produtor em penalidade - pulando rodada'::TEXT;
    RETURN;
  END IF;
  
  UPDATE producer_attendance_status
  SET status = 'EM_ATENDIMENTO', current_deal_id = p_deal_id, queue_position = NULL, joined_queue_at = NULL, updated_at = now()
  WHERE producer_id = p_producer_id;
  
  PERFORM fn_recalculate_queue_positions();
  
  INSERT INTO producer_attendance_log (producer_id, deal_id, action, status_from, status_to, queue_position_at, started_at)
  VALUES (p_producer_id, p_deal_id, 'START_ATTENDANCE', 'DISPONIVEL', 'EM_ATENDIMENTO', v_queue_position, now());
  
  RETURN QUERY SELECT true, 'Atendimento iniciado'::TEXT;
END;
$$;

-- Função para finalizar atendimento
CREATE OR REPLACE FUNCTION fn_producer_finish_attendance(p_producer_id TEXT, p_result TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, penalty_applied BOOLEAN, new_position INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status producer_attendance_status_enum;
  v_deal_id UUID;
  v_consecutive_losses INTEGER;
  v_apply_penalty BOOLEAN := false;
  v_new_position INTEGER;
  v_start_time TIMESTAMPTZ;
  v_duration INTEGER;
  v_avg_time INTEGER;
  v_total_attendances INTEGER;
BEGIN
  SELECT status, current_deal_id, consecutive_losses, total_attendances, average_attendance_time
  INTO v_current_status, v_deal_id, v_consecutive_losses, v_total_attendances, v_avg_time
  FROM producer_attendance_status WHERE producer_id = p_producer_id;
  
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT false, 'Produtor não encontrado'::TEXT, false, NULL::INTEGER;
    RETURN;
  END IF;
  
  IF v_current_status != 'EM_ATENDIMENTO' THEN
    RETURN QUERY SELECT false, 'Produtor não está em atendimento'::TEXT, false, NULL::INTEGER;
    RETURN;
  END IF;
  
  SELECT started_at INTO v_start_time FROM producer_attendance_log
  WHERE producer_id = p_producer_id AND deal_id = v_deal_id AND action = 'START_ATTENDANCE'
  ORDER BY created_at DESC LIMIT 1;
  
  IF v_start_time IS NOT NULL THEN
    v_duration := EXTRACT(EPOCH FROM (now() - v_start_time)) / 60;
  END IF;
  
  IF v_duration IS NOT NULL AND v_duration > 0 THEN
    IF v_avg_time IS NULL OR v_total_attendances = 0 THEN
      v_avg_time := v_duration;
    ELSE
      v_avg_time := ((v_avg_time * v_total_attendances) + v_duration) / (v_total_attendances + 1);
    END IF;
  END IF;
  
  IF p_result = 'PERDIDO' THEN
    v_consecutive_losses := v_consecutive_losses + 1;
    IF v_consecutive_losses >= 2 THEN
      v_apply_penalty := true;
      v_consecutive_losses := 0;
    END IF;
  ELSE
    v_consecutive_losses := 0;
  END IF;
  
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO v_new_position FROM producer_attendance_status WHERE queue_position IS NOT NULL;
  
  UPDATE producer_attendance_status
  SET status = 'DISPONIVEL', current_deal_id = NULL, queue_position = v_new_position, joined_queue_at = now(),
      consecutive_losses = v_consecutive_losses, penalty_active = v_apply_penalty,
      penalty_skips_remaining = CASE WHEN v_apply_penalty THEN 1 ELSE 0 END,
      total_attendances = total_attendances + 1,
      total_closed = CASE WHEN p_result = 'FECHADO' THEN total_closed + 1 ELSE total_closed END,
      total_lost = CASE WHEN p_result = 'PERDIDO' THEN total_lost + 1 ELSE total_lost END,
      average_attendance_time = v_avg_time, last_attendance_at = now(), updated_at = now()
  WHERE producer_id = p_producer_id;
  
  PERFORM fn_recalculate_queue_positions();
  
  INSERT INTO producer_attendance_log (producer_id, deal_id, action, status_from, status_to, result, queue_position_at, ended_at, duration_minutes)
  VALUES (p_producer_id, v_deal_id, 'FINISH_ATTENDANCE', 'EM_ATENDIMENTO', 'DISPONIVEL', p_result, v_new_position, now(), v_duration);
  
  IF v_apply_penalty THEN
    INSERT INTO producer_attendance_log (producer_id, action, notes)
    VALUES (p_producer_id, 'PENALTY_APPLIED', '2 perdas consecutivas - penalidade de 1 rodada');
  END IF;
  
  RETURN QUERY SELECT true, 
    CASE WHEN v_apply_penalty THEN 'Atendimento finalizado. Penalidade aplicada: 1 rodada' ELSE 'Atendimento finalizado' END::TEXT,
    v_apply_penalty, v_new_position;
END;
$$;

-- Função para calcular tempo estimado de espera
CREATE OR REPLACE FUNCTION fn_calculate_queue_wait_time(p_producer_id TEXT)
RETURNS TABLE(queue_pos INTEGER, producers_ahead INTEGER, estimated_minutes INTEGER, clients_waiting INTEGER, producers_available INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position INTEGER;
  v_global_avg_time INTEGER;
  v_producers_available INTEGER;
  v_clients_waiting INTEGER;
BEGIN
  SELECT queue_position INTO v_position FROM producer_attendance_status WHERE producer_id = p_producer_id;
  SELECT COALESCE(AVG(average_attendance_time), 15) INTO v_global_avg_time FROM producer_attendance_status WHERE average_attendance_time IS NOT NULL;
  SELECT COUNT(*) INTO v_producers_available FROM producer_attendance_status WHERE status = 'DISPONIVEL';
  SELECT COUNT(*) INTO v_clients_waiting FROM negotiations WHERE status IN ('recepcao_cadastro', 'ficha_preenchida');
  
  RETURN QUERY SELECT 
    v_position,
    COALESCE(v_position - 1, 0),
    CASE WHEN v_producers_available = 0 THEN NULL ELSE CEIL((v_clients_waiting::NUMERIC / GREATEST(v_producers_available, 1)) * v_global_avg_time)::INTEGER END,
    v_clients_waiting,
    v_producers_available;
END;
$$;

-- Função para obter próximo produtor
CREATE OR REPLACE FUNCTION fn_get_next_available_producer()
RETURNS TABLE(producer_id TEXT, producer_name TEXT, queue_pos INTEGER, has_penalty BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pas.producer_id, bse.title, pas.queue_position, pas.penalty_active
  FROM producer_attendance_status pas
  LEFT JOIN bitrix_spa_entities bse ON bse.bitrix_item_id::TEXT = pas.producer_id
  WHERE pas.status = 'DISPONIVEL' AND pas.queue_position IS NOT NULL AND (pas.penalty_active = false OR pas.penalty_skips_remaining = 0)
  ORDER BY pas.queue_position ASC LIMIT 1;
END;
$$;

-- Função para listar fila
CREATE OR REPLACE FUNCTION fn_get_producer_queue()
RETURNS TABLE(producer_id TEXT, producer_name TEXT, producer_photo TEXT, status TEXT, queue_pos INTEGER, penalty_active BOOLEAN, consecutive_losses INTEGER, average_time INTEGER, total_attendances INTEGER, conversion_rate NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pas.producer_id, bse.title, bse.photo_url, pas.status::TEXT, pas.queue_position, pas.penalty_active, pas.consecutive_losses, pas.average_attendance_time, pas.total_attendances,
    CASE WHEN pas.total_attendances > 0 THEN ROUND((pas.total_closed::NUMERIC / pas.total_attendances) * 100, 1) ELSE 0 END
  FROM producer_attendance_status pas
  LEFT JOIN bitrix_spa_entities bse ON bse.bitrix_item_id::TEXT = pas.producer_id
  WHERE pas.status IN ('DISPONIVEL', 'EM_ATENDIMENTO', 'PAUSA')
  ORDER BY CASE pas.status WHEN 'EM_ATENDIMENTO' THEN 1 WHEN 'DISPONIVEL' THEN 2 ELSE 3 END, pas.queue_position NULLS LAST;
END;
$$;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION fn_update_producer_attendance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_producer_attendance_status_updated
  BEFORE UPDATE ON producer_attendance_status
  FOR EACH ROW EXECUTE FUNCTION fn_update_producer_attendance_timestamp();