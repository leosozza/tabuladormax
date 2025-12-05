-- RPC para estatísticas de leads com filtro de fonte
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para estatísticas de fotos com filtro de fonte
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
      'comFoto', COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != ''),
      'semFoto', COUNT(*) FILTER (WHERE photo_url IS NULL OR photo_url = '')
    ) INTO result
    FROM leads
    WHERE criado >= p_start_date AND criado <= p_end_date AND fonte_normalizada = 'Scouter - Fichas';
  ELSIF p_source_filter = 'meta' THEN
    SELECT json_build_object(
      'total', COUNT(*),
      'comFoto', COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != ''),
      'semFoto', COUNT(*) FILTER (WHERE photo_url IS NULL OR photo_url = '')
    ) INTO result
    FROM leads
    WHERE criado >= p_start_date AND criado <= p_end_date AND fonte_normalizada = 'Meta';
  ELSE
    SELECT json_build_object(
      'total', COUNT(*),
      'comFoto', COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != ''),
      'semFoto', COUNT(*) FILTER (WHERE photo_url IS NULL OR photo_url = '')
    ) INTO result
    FROM leads
    WHERE criado >= p_start_date AND criado <= p_end_date;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para agendados com filtro de fonte
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
      'agendados', COUNT(*) FILTER (WHERE data_agendamento IS NOT NULL)
    ) INTO result
    FROM leads
    WHERE criado >= p_start_date AND criado <= p_end_date AND fonte_normalizada = 'Scouter - Fichas';
  ELSIF p_source_filter = 'meta' THEN
    SELECT json_build_object(
      'total', COUNT(*),
      'agendados', COUNT(*) FILTER (WHERE data_agendamento IS NOT NULL)
    ) INTO result
    FROM leads
    WHERE criado >= p_start_date AND criado <= p_end_date AND fonte_normalizada = 'Meta';
  ELSE
    SELECT json_build_object(
      'total', COUNT(*),
      'agendados', COUNT(*) FILTER (WHERE data_agendamento IS NOT NULL)
    ) INTO result
    FROM leads
    WHERE criado >= p_start_date AND criado <= p_end_date;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para comparecidos com filtro de fonte
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
    WHERE criado >= p_start_date AND criado <= p_end_date AND fonte_normalizada = 'Scouter - Fichas';
  ELSIF p_source_filter = 'meta' THEN
    SELECT json_build_object(
      'total', COUNT(*),
      'comparecidos', COUNT(*) FILTER (WHERE compareceu = true)
    ) INTO result
    FROM leads
    WHERE criado >= p_start_date AND criado <= p_end_date AND fonte_normalizada = 'Meta';
  ELSE
    SELECT json_build_object(
      'total', COUNT(*),
      'comparecidos', COUNT(*) FILTER (WHERE compareceu = true)
    ) INTO result
    FROM leads
    WHERE criado >= p_start_date AND criado <= p_end_date;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;