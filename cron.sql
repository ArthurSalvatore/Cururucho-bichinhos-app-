-- =====================================================================
--  BICHINHOS · lembrete diário de saudade (opcional)
--  Todo dia às 20h (horário de Brasília), quem não abriu o app nas últimas
--  20 horas recebe uma notificação tipo "Tô com saudade... vem me ver? 🥺".
--
--  Antes de rodar, troque:
--    SEU-PROJETO  → o código do seu projeto (aparece na URL: https://SEU-PROJETO.supabase.co)
--    SEU-CRON-SECRET → o CRON_SECRET gerado em tools/gerar-chaves.html
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 23:00 UTC = 20:00 em Brasília
select cron.schedule(
  'bichinhos-lembrete-diario',
  '0 23 * * *',
  $$
  select net.http_post(
    url     := 'https://SEU-PROJETO.supabase.co/functions/v1/push',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "SEU-CRON-SECRET"}'::jsonb,
    body    := '{"type": "reminder"}'::jsonb
  );
  $$
);

-- Pra desligar o lembrete depois:
--   select cron.unschedule('bichinhos-lembrete-diario');
