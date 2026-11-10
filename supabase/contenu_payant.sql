-- =====================================================================
-- Kinésis+ : questions réservées (cours 3 et suivants)
-- Servies uniquement aux abonnés et aux profils en période d'essai.
-- Le contenu lui-même : python3 build.py --contenu, puis exécuter build/contenu_payant_1..3.sql
-- =====================================================================

-- Réglages de l'abonnement
create table if not exists public.app_settings (
  key   text primary key,
  value jsonb not null
);
comment on table public.app_settings is 'Réglages de Kinésis (lecture seule pour le site).';
insert into public.app_settings (key, value) values ('essai_jours', '7'::jsonb) on conflict (key) do nothing;
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

-- Questions réservées : une ligne par question, à sa place d'origine (idx) pour garder la progression
create table if not exists public.premium_content (
  subject text  not null,
  fmt     text  not null,
  idx     int   not null,
  item    jsonb not null,
  primary key (subject, fmt, idx)
);
comment on table public.premium_content is 'Questions Kinésis+ (cours 3 et suivants), lisibles seulement avec un accès (abonnement ou essai).';

-- Accès : abonnement en cours, ou essai gratuit depuis la création du profil
create or replace function public.has_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_premium() or exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.created_at > now() - make_interval(days => coalesce((select (value #>> '{}')::int from public.app_settings where key = 'essai_jours'), 7))
  );
$$;
comment on function public.has_access() is 'Vrai si le profil connecté peut voir les questions Kinésis+ (abonné ou en essai).';
revoke all on function public.has_access() from public, anon;
grant execute on function public.has_access() to authenticated;

-- Fin de l'essai (pour l'afficher sur le site)
create or replace function public.trial_end()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select u.created_at + make_interval(days => coalesce((select (value #>> '{}')::int from public.app_settings where key = 'essai_jours'), 7))
  from auth.users u where u.id = auth.uid();
$$;
revoke all on function public.trial_end() from public, anon;
grant execute on function public.trial_end() to authenticated;

alter table public.premium_content enable row level security;
revoke all on public.premium_content from anon, authenticated;
grant select on public.premium_content to authenticated;
drop policy if exists "premium_content_select" on public.premium_content;
create policy "premium_content_select" on public.premium_content for select to authenticated using ((select public.has_access()));

notify pgrst, 'reload schema';
