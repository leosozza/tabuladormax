-- Drop existing function first (return type change requires this)
DROP FUNCTION IF EXISTS public.get_maintenance_stats();

-- Recreate get_maintenance_stats() with correct column names for leads table
-- The leads table uses 'criado' instead of 'created_at' and has 'has_sync_errors' boolean
CREATE OR REPLACE FUNCTION public.get_maintenance_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'sync_events', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'older_than_30_days', COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days'),
        'oldest_record', MIN(created_at),
        'newest_record', MAX(created_at)
      )
      FROM sync_events
    ),
    'actions_log', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'older_than_60_days', COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '60 days'),
        'oldest_record', MIN(created_at),
        'newest_record', MAX(created_at)
      )
      FROM actions_log
    ),
    'message_rate_limits', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'older_than_7_days', COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '7 days'),
        'oldest_record', MIN(created_at),
        'newest_record', MAX(created_at)
      )
      FROM message_rate_limits
    ),
    'leads', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'with_sync_errors', COUNT(*) FILTER (WHERE has_sync_errors IS TRUE),
        'oldest_record', MIN(criado),
        'newest_record', MAX(criado)
      )
      FROM leads
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_maintenance_stats() TO authenticated;