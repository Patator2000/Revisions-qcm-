-- =====================================================================
-- Compte administrateur de Kinésis (gestion du site : signalements...)
-- Le compte admin reste un profil normal pour réviser.
-- =====================================================================

-- Liste des comptes admin (identifiants Supabase), modifiable seulement depuis le tableau de bord
insert into public.app_settings (key, value)
select 'admins', jsonb_build_array(u.id::text)
from auth.users u
where split_part(u.email, '@', 1) = 'rqcm.thomas'
on conflict (key) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select value ? (auth.uid())::text from public.app_settings where key = 'admins'), false);
$$;
comment on function public.is_admin() is 'Vrai si le profil connecté est administrateur de Kinésis.';
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Signalements : chacun voit les siens, l'admin les voit tous et peut changer leur statut
drop policy if exists "reports_select" on public.reports;
create policy "reports_select" on public.reports for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

grant update (status) on public.reports to authenticated;
drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin" on public.reports for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

notify pgrst, 'reload schema';

-- Pseudo unique : vérification avant la création d'un profil (forme normalisée, sans majuscules ni accents)
create or replace function public.pseudo_pris(slug text)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from auth.users u where split_part(u.email, '@', 1) = 'rqcm.' || lower(slug)); $$;
comment on function public.pseudo_pris(text) is 'Vrai si un profil Kinésis utilise déjà ce pseudo (forme normalisée).';
revoke all on function public.pseudo_pris(text) from public;
grant execute on function public.pseudo_pris(text) to anon, authenticated;
notify pgrst, 'reload schema';
