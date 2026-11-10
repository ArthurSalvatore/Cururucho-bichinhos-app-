-- =====================================================================
--  AGENDA · avisos de eventos e aniversários (todo dia às 9h de Brasília)
--  Antes de rodar, troque SEU-PROJETO e SEU-CRON-SECRET (os mesmos do cron.sql).
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 12:00 UTC = 09:00 em Brasília
select cron.schedule(
  'bichinhos-eventos-diarios',
  '0 12 * * *',
  $$
  select net.http_post(
    url     := 'https://SEU-PROJETO.supabase.co/functions/v1/push',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "SEU-CRON-SECRET"}'::jsonb,
    body    := '{"type": "events"}'::jsonb
  );
  $$
);

-- Pra desligar depois:
--   select cron.unschedule('bichinhos-eventos-diarios');
