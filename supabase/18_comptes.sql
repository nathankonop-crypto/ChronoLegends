-- =============================================================
--  CHRONOLEGENDS — 18. Comptes avec e-mail et pseudo
--
--  Chaque joueur commence avec un compte invité (anonyme). Il peut le
--  transformer en vrai compte : e-mail vérifié par un code + pseudo.
--  C'est LE MÊME compte (même user_id) : collection, boosters et
--  historique sont conservés, et il peut se reconnecter sur un autre
--  téléphone avec son e-mail.
--    • pseudo unique (sans tenir compte des majuscules), 3 à 20 caractères ;
--    • 1 booster offert à la création du compte, une seule fois,
--      donné par le SERVEUR (le téléphone ne peut pas le réclamer deux fois).
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

alter table public.joueurs add column if not exists pseudo text;
alter table public.joueurs add column if not exists bonus_compte_recu boolean not null default false;

-- Pseudo unique : « Nathan » et « nathan » sont le même pseudo.
create unique index if not exists joueurs_pseudo_unique on public.joueurs (lower(pseudo));

insert into public.reglages_tirage (cle, valeur, explication) values
  ('bonus_compte', 1, 'Boosters offerts quand un joueur crée son compte (e-mail + pseudo)')
on conflict (cle) do nothing;

-- ---------- Règles du pseudo ----------
-- 3 à 20 caractères, au moins une lettre ou un chiffre, pas d'espace au début ni à la fin,
-- pas de caractères qui pourraient servir à tromper (< > " ' \ / @) ni de caractères invisibles.
create or replace function public.pseudo_valide(p text) returns boolean
language sql immutable set search_path = public as $$
  select p is not null
     and char_length(p) between 3 and 20
     and p = btrim(p)
     and p !~ '\s\s'
     and p ~ '[[:alnum:]]'
     and p !~ '[<>"''\\/@[:cntrl:]]';
$$;

-- Avant d'envoyer le code : le pseudo est-il libre ? Réponse : 'ok', 'invalide' ou 'pris'.
create or replace function public.pseudo_disponible(p text) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'non_connecte'; end if;
  if not public.pseudo_valide(p) then return 'invalide'; end if;
  if exists (select 1 from public.joueurs where lower(pseudo) = lower(p) and user_id <> auth.uid()) then
    return 'pris';
  end if;
  return 'ok';
end $$;

-- Le compte a-t-il un e-mail vérifié (et n'est donc plus un invité) ?
create or replace function public.compte_verifie() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and email is not null and email_confirmed_at is not null
      and coalesce(is_anonymous, false) = false
  );
$$;

-- Choisir ou changer son pseudo (seulement avec un compte vérifié).
create or replace function public.choisir_pseudo(p text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'non_connecte'; end if;
  if not public.compte_verifie() then raise exception 'compte_requis'; end if;
  if not public.pseudo_valide(p) then raise exception 'pseudo_invalide'; end if;
  begin
    update public.joueurs set pseudo = p where user_id = auth.uid();
  exception when unique_violation then
    raise exception 'pseudo_pris';
  end;
  return p;
end $$;

-- Booster(s) offert(s) à la création du compte : une seule fois par compte.
create or replace function public.recompense_compte() returns json
language plpgsql security definer set search_path = public as $$
declare
  bonus int := coalesce((select valeur from public.reglages_tirage where cle = 'bonus_compte'), 1)::int;
  j public.joueurs;
begin
  if auth.uid() is null then raise exception 'non_connecte'; end if;
  if not public.compte_verifie() then raise exception 'compte_requis'; end if;
  update public.joueurs
     set boosters = boosters + bonus, bonus_compte_recu = true
   where user_id = auth.uid() and not bonus_compte_recu
  returning * into j;
  if found then
    return json_build_object('offerts', bonus, 'boosters', j.boosters);
  end if;
  return json_build_object('offerts', 0, 'boosters', (select boosters from public.joueurs where user_id = auth.uid()));
end $$;

revoke all on function public.pseudo_disponible(text), public.compte_verifie(), public.choisir_pseudo(text), public.recompense_compte() from public, anon;
grant execute on function public.pseudo_disponible(text), public.compte_verifie(), public.choisir_pseudo(text), public.recompense_compte() to authenticated;
