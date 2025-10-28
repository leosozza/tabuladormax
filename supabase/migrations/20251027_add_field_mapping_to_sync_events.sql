-- Add field mapping information to sync_events table
-- This allows tracking which fields were synced during each operation

-- Add column to store field mapping details
ALTER TABLE sync_events 
ADD COLUMN IF NOT EXISTS field_mappings JSONB;

-- Add column to store mapped field count for quick metrics
ALTER TABLE sync_events 
ADD COLUMN IF NOT EXISTS fields_synced_count INTEGER DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sync_events_field_mappings 
ON sync_events USING GIN (field_mappings);

-- Add comment to document the structure
COMMENT ON COLUMN sync_events.field_mappings IS 
'JSON object containing field mapping details: 
{
  "bitrix_to_supabase": [
    {"bitrix_field": "NAME", "tabuladormax_field": "name", "value": "John Doe", "transformed": false},
    {"bitrix_field": "UF_IDADE", "tabuladormax_field": "age", "value": "25", "transformed": true}
  ],
  "supabase_to_bitrix": [
    {"tabuladormax_field": "name", "bitrix_field": "NAME", "value": "John Doe"}
  ]
}';

COMMENT ON COLUMN sync_events.fields_synced_count IS 
'Number of fields that were successfully synced in this operation';
