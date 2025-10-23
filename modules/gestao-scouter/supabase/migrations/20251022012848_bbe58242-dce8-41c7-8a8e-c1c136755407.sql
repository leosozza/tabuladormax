-- Fix security warning: Set search_path for queue_lead_for_sync function
CREATE OR REPLACE FUNCTION queue_lead_for_sync()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Proteção contra loop infinito
  IF (TG_OP = 'DELETE') THEN
    -- DELETE sempre enfileira
    INSERT INTO sync_queue (table_name, row_id, operation, payload, sync_direction)
    VALUES ('leads', OLD.id::TEXT, 'delete', row_to_json(OLD), 'gestao_to_tabulador')
    ON CONFLICT (table_name, row_id, operation) DO NOTHING;
    RETURN OLD;
  ELSE
    -- INSERT/UPDATE: não enfileira se veio do TabuladorMax recentemente
    IF (NEW.sync_source = 'TabuladorMax' AND 
        NEW.last_synced_at IS NOT NULL AND 
        NOW() - NEW.last_synced_at < INTERVAL '30 seconds') THEN
      RETURN NEW;
    END IF;
    
    INSERT INTO sync_queue (table_name, row_id, operation, payload, sync_direction)
    VALUES ('leads', NEW.id::TEXT, LOWER(TG_OP), row_to_json(NEW), 'gestao_to_tabulador')
    ON CONFLICT (table_name, row_id, operation) 
    DO UPDATE SET 
      payload = EXCLUDED.payload,
      created_at = NOW(),
      status = 'pending';
    RETURN NEW;
  END IF;
END;
$$;