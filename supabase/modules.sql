-- Modules choisis par chaque profil (matières de révision, mails...)
alter table public.profiles add column if not exists modules text[] not null default '{}';
comment on column public.profiles.modules is 'Modules affichés sur le tableau de bord du profil (anat, physio, natation, mails).';
-- Le compte de Thomas a tous les modules
insert into public.profiles (user_id, modules)
select u.id, array['anat','physio','natation','mails'] from auth.users u where split_part(u.email, '@', 1) = 'rqcm.thomas'
on conflict (user_id) do update set modules = excluded.modules;
notify pgrst, 'reload schema';
alter table public.profiles add column if not exists mail_rules jsonb;
