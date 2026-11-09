-- =====================================================================
-- Kinésis : schéma de la base Supabase (projet « Revisions-qcm- »)
-- À exécuter dans Supabase > SQL Editor. Le script peut être relancé
-- sans risque : il ne supprime aucune donnée.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Progression : une ligne par profil et par matière
-- ---------------------------------------------------------------------
create table if not exists public.progress (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  subject    text        not null,
  mem        jsonb       not null default '{}'::jsonb,
  sess       jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, subject)
);

comment on table  public.progress            is 'Progression de révision : une ligne par profil et par matière.';
comment on column public.progress.user_id    is 'Profil (compte Supabase Auth).';
comment on column public.progress.subject    is 'Matière : anat (anatomie) ou physio (physiologie).';
comment on column public.progress.mem        is 'Niveau de maîtrise de chaque question (clé = empreinte de l''énoncé) et historique quotidien dans _h.';
comment on column public.progress.sess       is 'Série en cours mise en pause (questions, réponses, chrono), ou null.';
comment on column public.progress.updated_at is 'Dernier enregistrement (mis à jour automatiquement).';

-- ---------------------------------------------------------------------
-- 2. Signalements d'erreurs dans les questions
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id         bigint      generated always as identity primary key,
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  data       jsonb       not null,
  created_at timestamptz not null default now()
);

alter table public.reports add column if not exists status text not null default 'nouveau';
do $$ begin
  alter table public.reports add constraint reports_status_check check (status in ('nouveau', 'corrigé', 'rejeté'));
exception when duplicate_object then null; end $$;

comment on table  public.reports            is 'Erreurs signalées dans les questions, à traiter.';
comment on column public.reports.data       is 'Question signalée (matière, format, énoncé, réponse attendue) et commentaire.';
comment on column public.reports.status     is 'Suivi du traitement : nouveau, corrigé ou rejeté.';

create index if not exists reports_user_created_idx on public.reports (user_id, created_at desc);
create index if not exists reports_status_idx       on public.reports (status) where status = 'nouveau';

-- ---------------------------------------------------------------------
-- 3. Date de mise à jour automatique
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists progress_touch_updated_at on public.progress;
create trigger progress_touch_updated_at
  before update on public.progress
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 4. Sécurité : chaque profil ne voit et ne modifie que ses propres données
-- ---------------------------------------------------------------------
alter table public.progress enable row level security;
alter table public.reports  enable row level security;

revoke all on public.progress from anon;
revoke all on public.reports  from anon;
grant select, insert, update, delete on public.progress to authenticated;
grant select, insert                 on public.reports  to authenticated;

drop policy if exists "progress_own"       on public.progress;
drop policy if exists "progress_select"    on public.progress;
drop policy if exists "progress_insert"    on public.progress;
drop policy if exists "progress_update"    on public.progress;
drop policy if exists "progress_delete"    on public.progress;
create policy "progress_select" on public.progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "progress_insert" on public.progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progress_update" on public.progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "progress_delete" on public.progress for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_read_own"   on public.reports;
drop policy if exists "reports_insert"     on public.reports;
drop policy if exists "reports_select"     on public.reports;
create policy "reports_insert" on public.reports for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "reports_select" on public.reports for select to authenticated using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
