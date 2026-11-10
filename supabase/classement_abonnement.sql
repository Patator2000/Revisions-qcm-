-- =====================================================================
-- Kinésis : classement entre profils + abonnement (préparé, invisible)
-- À exécuter après schema.sql. Relançable sans risque.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profils publics : ce que les autres peuvent voir de toi
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  user_id      uuid        primary key references auth.users(id) on delete cascade,
  classement   boolean     not null default true,
  created_at   timestamptz not null default now()
);
comment on table  public.profiles            is 'Réglages publics du profil.';
comment on column public.profiles.classement is 'Apparaître dans le classement (oui par défaut).';

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles_insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles_update" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- 2. Classement : seule porte d'accès aux scores des autres.
--    N'expose que le prénom et deux nombres, jamais la progression détaillée.
-- ---------------------------------------------------------------------
create or replace function public.leaderboard(periode text default 'semaine')
returns table (rang int, prenom text, maitrisees int, reponses_7j int, moi boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with stats as (
    select
      u.id as user_id,
      coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''), 'Anonyme') as prenom,
      coalesce(sum((
        select count(*) from jsonb_each(p.mem) e
        where e.key <> '_h' and jsonb_typeof(e.value) = 'object' and coalesce((e.value->>'l')::int, 0) >= 4
      )), 0)::int as maitrisees,
      coalesce(sum((
        select sum(coalesce((h.value->>'a')::int, 0)) from jsonb_each(coalesce(p.mem->'_h', '{}'::jsonb)) h
        where h.key ~ '^\d{4}-\d{2}-\d{2}$' and h.key::date >= (now() at time zone 'Europe/Paris')::date - 6
      )), 0)::int as reponses_7j
    from auth.users u
    left join public.progress p on p.user_id = u.id
    left join public.profiles pr on pr.user_id = u.id
    where coalesce(pr.classement, true) or u.id = auth.uid()
    group by u.id, u.raw_user_meta_data
  )
  select
    (rank() over (order by case when periode = 'general' then maitrisees else reponses_7j end desc))::int as rang,
    prenom, maitrisees, reponses_7j,
    user_id = auth.uid() as moi
  from stats
  where maitrisees > 0 or reponses_7j > 0 or user_id = auth.uid()
  order by rang, prenom
  limit 50;
$$;
comment on function public.leaderboard(text) is 'Classement : prénom, questions maîtrisées et réponses des 7 derniers jours. periode = semaine ou general.';
revoke all on function public.leaderboard(text) from public, anon;
grant execute on function public.leaderboard(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Abonnement Kinésis+ (4,99 € / mois) : PRÉPARÉ, PAS ENCORE UTILISÉ
--    Rempli uniquement par le webhook Stripe (clé secrète côté serveur).
--    Le site ne peut que lire sa propre ligne.
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  user_id                uuid        primary key references auth.users(id) on delete cascade,
  status                 text        not null default 'inactive',
  plan                   text        not null default 'kinesis_plus_mensuel',
  current_period_end     timestamptz,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  updated_at             timestamptz not null default now()
);
do $$ begin
  alter table public.subscriptions add constraint subscriptions_status_check
    check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'));
exception when duplicate_object then null; end $$;
comment on table public.subscriptions is 'Abonnement Kinésis+ (4,99 € par mois). Écrit uniquement par le webhook Stripe.';

alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
drop policy if exists "subscriptions_select" on public.subscriptions;
create policy "subscriptions_select" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

create or replace function public.is_premium()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;
comment on function public.is_premium() is 'Vrai si le profil connecté a un abonnement Kinésis+ en cours.';
revoke all on function public.is_premium() from public, anon;
grant execute on function public.is_premium() to authenticated;

notify pgrst, 'reload schema';
