-- Criar cron job para enriquecer leads pendentes a cada 5 minutos
SELECT cron.schedule(
  'enrich-pending-leads-cron',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://jstsrgyxrrlklnzgsihd.supabase.co/functions/v1/enrich-pending-leads',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdHNyZ3l4cnJsa2xuemdzaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDIyOTEsImV4cCI6MjA3NjUxODI5MX0.0uh9Uid5HZ3_TQB0877ncfhlYJwhxdMsQBReHZW2QLg"}'::jsonb,
        body:='{"triggered_by": "cron"}'::jsonb
    ) as request_id;
  $$
);