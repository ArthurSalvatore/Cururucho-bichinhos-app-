-- =====================================================================
--  BICHINHOS · estrutura do banco (Supabase)
--  Cole tudo no SQL Editor do Supabase e clique em "Run".
--  ANTES de rodar: troque seu-email@exemplo.com (lá no final) pelo SEU e-mail.
-- =====================================================================

-- quem é admin (você)
create table if not exists public.app_admins (
  email text primary key
);
alter table public.app_admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admin se enxerga" on public.app_admins;
create policy "admin se enxerga" on public.app_admins
  for select using (public.is_admin());

-- estado do bichinho (o progresso inteiro, sincronizado)
create table if not exists public.larth_state (
  user_id    uuid primary key references auth.users on delete cascade,
  email      text,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.larth_state enable row level security;
drop policy if exists "dona cuida do próprio estado" on public.larth_state;
create policy "dona cuida do próprio estado" on public.larth_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "admin vê os estados" on public.larth_state;
create policy "admin vê os estados" on public.larth_state
  for select using (public.is_admin());

-- diário da saudade (páginas e respostas de memória)
create table if not exists public.diary (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  email      text,
  created_at timestamptz not null default now(),
  mood       text,
  question   text,
  body       text not null,
  reply      text
);
alter table public.diary enable row level security;
drop policy if exists "dona escreve" on public.diary;
create policy "dona escreve" on public.diary
  for insert with check (auth.uid() = user_id);
drop policy if exists "dona e admin leem" on public.diary;
create policy "dona e admin leem" on public.diary
  for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "dona apaga" on public.diary;
create policy "dona apaga" on public.diary
  for delete using (auth.uid() = user_id);

-- correio: recados, cartinhas e presentes que você manda
create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  to_user    uuid references auth.users on delete cascade,  -- vazio = pra todo mundo
  kind       text not null check (kind in ('recado','cartinha','presente')),
  title      text,
  body       text,
  gift       text,
  read_at    timestamptz
);
alter table public.messages enable row level security;
drop policy if exists "admin manda" on public.messages;
create policy "admin manda" on public.messages
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "ela recebe" on public.messages;
create policy "ela recebe" on public.messages
  for select using (to_user = auth.uid() or to_user is null);
drop policy if exists "ela marca como lida" on public.messages;
create policy "ela marca como lida" on public.messages
  for update using (to_user = auth.uid()) with check (to_user = auth.uid());

-- inscrições de notificação (um registro por aparelho)
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh     text not null,
  auth       text not null,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "cada um cuida das suas" on public.push_subscriptions;
create policy "cada um cuida das suas" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tempo real: recados chegam na hora e o diário aparece na hora no painel
do $$ begin
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.diary;    exception when duplicate_object then null; end;
end $$;

-- >>> TROQUE PELO SEU E-MAIL <<<
insert into public.app_admins (email) values ('seu-email@exemplo.com')
on conflict do nothing;
