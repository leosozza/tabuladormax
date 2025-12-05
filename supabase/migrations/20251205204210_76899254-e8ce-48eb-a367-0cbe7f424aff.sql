CREATE OR REPLACE FUNCTION public.get_status_distribution_data(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_project_id uuid DEFAULT NULL::uuid, p_scouter text DEFAULT NULL::text, p_fonte text DEFAULT NULL::text, p_limit integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', etapa_normalized,
        'value', count
      )
      ORDER BY count DESC
    )
    FROM (
      SELECT 
        COALESCE(normalize_etapa(etapa), 'Sem etapa') as etapa_normalized,
        COUNT(*) as count
      FROM leads
      WHERE (p_start_date IS NULL OR criado >= p_start_date)
        AND (p_end_date IS NULL OR criado <= p_end_date)
        AND (p_project_id IS NULL OR commercial_project_id = p_project_id)
        AND (p_scouter IS NULL OR scouter = p_scouter)
        AND (p_fonte IS NULL OR fonte_normalizada = p_fonte)
      GROUP BY normalize_etapa(etapa)
      ORDER BY count DESC
      LIMIT p_limit
    ) sub
  );
END;
$function$;