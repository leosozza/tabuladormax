-- Corrige RPC para estatísticas de fotos usando cadastro_existe_foto
CREATE OR REPLACE FUNCTION get_photo_stats(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_source_filter TEXT DEFAULT 'all'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF p_source_filter = 'scouter' THEN
    SELECT json_build_object(
      'total', COUNT(*),
      'comFoto', COUNT(*) FILTER (WHERE cadastro_existe_foto = true),
      'semFoto', COUNT(*) FILTER (WHERE cadastro_existe_foto IS NULL OR cadastro_existe_foto = false)
    ) INTO result
    FROM leads
    WHERE criado >= p_start_date AND criado <= p_end_date AND fonte_normalizada = 'Scouter - Fichas';
  ELSIF p_source_filter = 'meta' THEN
    SELECT json_build_object(
      'total', COUNT(*),
      'comFoto', COUNT(*) FILTER (WHERE cadastro_existe_foto = true),
      'semFoto', COUNT(*) FILTER (WHERE cadastro_existe_foto IS NULL OR cadastro_existe_foto = false)
    ) INTO result
    FROM leads
    WHERE criado >= p_start_date AND criado <= p_end_date AND fonte_normalizada = 'Meta';
  ELSE
    SELECT json_build_object(
      'total', COUNT(*),
      'comFoto', COUNT(*) FILTER (WHERE cadastro_existe_foto = true),
      'semFoto', COUNT(*) FILTER (WHERE cadastro_existe_foto IS NULL OR cadastro_existe_foto = false)
    ) INTO result
    FROM leads
    WHERE criado >= p_start_date AND criado <= p_end_date;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Corrige RPC agendados para usar data_criacao_agendamento e filtro de fonte
CREATE OR REPLACE FUNCTION get_agendados_stats(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_source_filter TEXT DEFAULT 'all'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF p_source_filter = 'scouter' THEN
    SELECT json_build_object(
      'total', COUNT(*),
      'agendados', COUNT(*) FILTER (WHERE etapa IN ('Agendados', 'UC_QWPO2W'))
    ) INTO result
    FROM leads
    WHERE data_criacao_agendamento >= p_start_date AND data_criacao_agendamento <= p_end_date AND fonte_normalizada = 'Scouter - Fichas';
  ELSIF p_source_filter = 'meta' THEN
    SELECT json_build_object(
      'total', COUNT(*),
      'agendados', COUNT(*) FILTER (WHERE etapa IN ('Agendados', 'UC_QWPO2W'))
    ) INTO result
    FROM leads
    WHERE data_criacao_agendamento >= p_start_date AND data_criacao_agendamento <= p_end_date AND fonte_normalizada = 'Meta';
  ELSE
    SELECT json_build_object(
      'total', COUNT(*),
      'agendados', COUNT(*) FILTER (WHERE etapa IN ('Agendados', 'UC_QWPO2W'))
    ) INTO result
    FROM leads
    WHERE data_criacao_agendamento >= p_start_date AND data_criacao_agendamento <= p_end_date;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Corrige RPC comparecidos para usar date_closed e filtro de fonte
CREATE OR REPLACE FUNCTION get_comparecidos_stats(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_source_filter TEXT DEFAULT 'all'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF p_source_filter = 'scouter' THEN
    SELECT json_build_object(
      'total', COUNT(*),
      'comparecidos', COUNT(*) FILTER (WHERE compareceu = true)
    ) INTO result
    FROM leads
    WHERE date_closed >= p_start_date AND date_closed <= p_end_date AND fonte_normalizada = 'Scouter - Fichas';
  ELSIF p_source_filter = 'meta' THEN
    SELECT json_build_object(
      'total', COUNT(*),
      'comparecidos', COUNT(*) FILTER (WHERE compareceu = true)
    ) INTO result
    FROM leads
    WHERE date_closed >= p_start_date AND date_closed <= p_end_date AND fonte_normalizada = 'Meta';
  ELSE
    SELECT json_build_object(
      'total', COUNT(*),
      'comparecidos', COUNT(*) FILTER (WHERE compareceu = true)
    ) INTO result
    FROM leads
    WHERE date_closed >= p_start_date AND date_closed <= p_end_date;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Corrige RPC lead_stats para incluir search_path
CREATE OR REPLACE FUNCTION get_lead_stats(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_source_filter TEXT DEFAULT 'all'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  source_condition TEXT;
BEGIN
  -- Build source condition
  IF p_source_filter = 'scouter' THEN
    source_condition := 'AND fonte_normalizada = ''Scouter - Fichas''';
  ELSIF p_source_filter = 'meta' THEN
    source_condition := 'AND fonte_normalizada = ''Meta''';
  ELSE
    source_condition := '';
  END IF;

  EXECUTE format('
    SELECT json_build_object(
      ''total'', (SELECT COUNT(*) FROM leads WHERE criado >= $1 AND criado <= $2 %s),
      ''scouter'', (SELECT COUNT(*) FROM leads WHERE criado >= $1 AND criado <= $2 AND fonte_normalizada = ''Scouter - Fichas'' %s),
      ''meta'', (SELECT COUNT(*) FROM leads WHERE criado >= $1 AND criado <= $2 AND fonte_normalizada = ''Meta'' %s),
      ''confirmadas'', (SELECT COUNT(*) FROM leads WHERE criado >= $1 AND criado <= $2 AND ficha_confirmada = true %s),
      ''aguardando'', (SELECT COUNT(*) FROM leads WHERE criado >= $1 AND criado <= $2 AND ficha_confirmada IS NULL %s),
      ''naoConfirmadas'', (SELECT COUNT(*) FROM leads WHERE criado >= $1 AND criado <= $2 AND ficha_confirmada = false %s)
    )
  ', source_condition, source_condition, source_condition, source_condition, source_condition, source_condition)
  INTO result
  USING p_start_date, p_end_date;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;