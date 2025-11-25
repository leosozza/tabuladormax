-- Adicionar 'scouter_location_in' aos valores permitidos em sync_events.direction
ALTER TABLE sync_events DROP CONSTRAINT sync_events_direction_check;

ALTER TABLE sync_events ADD CONSTRAINT sync_events_direction_check 
CHECK (direction = ANY (ARRAY[
  'bitrix_to_supabase'::text, 
  'supabase_to_bitrix'::text, 
  'csv_to_supabase'::text, 
  'supabase_to_gestao_scouter'::text, 
  'gestao_scouter_to_supabase'::text,
  'scouter_location_in'::text
]));