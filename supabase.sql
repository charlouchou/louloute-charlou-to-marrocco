-- Base de données de la checklist partagée (Supabase)
-- À coller une seule fois dans Supabase : menu « SQL Editor » → « New query » → coller → « Run ».
-- AVANT de lancer : remplacer CHANGE-MOI tout en bas par votre code secret à deux.
-- Ne jamais enregistrer ce fichier avec le vrai code dedans.

-- 1. Les visites cochées
create table if not exists public.trip_picks (
  item       text primary key,          -- identifiant de la visite (ex. « fes:Les tanneries Chouara… »)
  picked     boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 2. Le code secret (une seule ligne)
create table if not exists public.trip_secret (
  id   int primary key default 1 check (id = 1),
  code text not null
);

-- 3. Personne ne peut lire ou écrire directement dans ces tables…
alter table public.trip_picks  enable row level security;
alter table public.trip_secret enable row level security;
revoke all on public.trip_picks, public.trip_secret from anon, authenticated;

-- 4. …on passe uniquement par ces fonctions, qui vérifient le code
create or replace function public.trip_check(p_code text) returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from trip_secret where code = p_code);
$$;

create or replace function public.trip_get(p_code text) returns setof text
language plpgsql security definer set search_path = public as $$
begin
  if not trip_check(p_code) then raise exception 'Code invalide'; end if;
  return query select item from trip_picks where picked;
end $$;

create or replace function public.trip_set(p_code text, p_item text, p_picked boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not trip_check(p_code) then raise exception 'Code invalide'; end if;
  insert into trip_picks (item, picked, updated_at) values (p_item, p_picked, now())
  on conflict (item) do update set picked = excluded.picked, updated_at = now();
end $$;

create or replace function public.trip_clear(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not trip_check(p_code) then raise exception 'Code invalide'; end if;
  update trip_picks set picked = false, updated_at = now() where picked;
end $$;

revoke all on function public.trip_check(text), public.trip_get(text),
  public.trip_set(text, text, boolean), public.trip_clear(text) from public;
grant execute on function public.trip_check(text), public.trip_get(text),
  public.trip_set(text, text, boolean), public.trip_clear(text) to anon;

-- 5. Votre code secret : remplacer CHANGE-MOI avant de cliquer sur « Run »
insert into public.trip_secret (id, code) values (1, 'CHANGE-MOI')
on conflict (id) do update set code = excluded.code;
