-- =============================================================
--  CHRONOLEGENDS — Joueurs, boosters et collections CÔTÉ SERVEUR
--  À coller UNE FOIS dans Supabase : SQL Editor → New query → Run.
--
--  Principe : le téléphone ne décide plus de rien qui a de la valeur.
--  - l'heure utilisée est TOUJOURS celle du serveur (now()) ;
--  - le cadeau quotidien, le stock de boosters, le tirage des cartes
--    et la collection sont gérés par des fonctions de la base ;
--  - les joueurs peuvent LIRE leurs propres données, jamais les écrire
--    directement : seules ces fonctions le peuvent.
-- =============================================================

-- ---------- Tables ----------

create table if not exists public.joueurs (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  boosters           integer not null default 3 check (boosters >= 0),
  dernier_quotidien  timestamptz,                 -- heure SERVEUR (UTC) du dernier cadeau réclamé
  cree_le            timestamptz not null default now()
);

create table if not exists public.collection (
  user_id            uuid not null references public.joueurs (user_id) on delete cascade,
  carte_id           text not null references public.cartes (id) on delete cascade,
  exemplaires        integer not null default 1 check (exemplaires > 0),
  premiere_obtention timestamptz not null default now(),
  primary key (user_id, carte_id)
);

-- Journal de chaque ouverture (utile pour repérer un comportement anormal).
create table if not exists public.ouvertures (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references public.joueurs (user_id) on delete cascade,
  region    text not null,
  cartes    text[] not null,
  ouvert_le timestamptz not null default now()
);
create index if not exists ouvertures_user_id on public.ouvertures (user_id, ouvert_le desc);

-- ---------- Sécurité : lecture de SES données uniquement, aucune écriture directe ----------

alter table public.joueurs    enable row level security;
alter table public.collection enable row level security;
alter table public.ouvertures enable row level security;

drop policy if exists "Le joueur lit sa fiche" on public.joueurs;
create policy "Le joueur lit sa fiche" on public.joueurs
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Le joueur lit sa collection" on public.collection;
create policy "Le joueur lit sa collection" on public.collection
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Le joueur lit ses ouvertures" on public.ouvertures;
create policy "Le joueur lit ses ouvertures" on public.ouvertures
  for select to authenticated using (user_id = auth.uid());

revoke all on public.joueurs, public.collection, public.ouvertures from anon, authenticated;
grant select on public.joueurs, public.collection, public.ouvertures to authenticated;

-- ---------- Le « jour » du jeu : minuit heure d'Israël, calculé par le serveur ----------

create or replace function public.jour_israel(t timestamptz) returns date
language sql stable set search_path = public as $$
  select (t at time zone 'Asia/Jerusalem')::date;
$$;

-- ---------- Réclamer le booster quotidien ----------
-- Crée la fiche du joueur à sa première visite (3 boosters de bienvenue).
-- Ensuite : +1 booster si l'on est passé à un nouveau jour (heure d'Israël)
-- depuis le dernier cadeau. Sinon refus + temps restant.
-- « for update » verrouille la fiche : des requêtes envoyées en même temps
-- passent une par une, et seule la première peut obtenir le cadeau.

create or replace function public.reclamer_quotidien() returns json
language plpgsql security definer set search_path = public as $$
declare
  uid        uuid := auth.uid();
  maintenant timestamptz := now();          -- heure du SERVEUR, jamais celle du téléphone
  j          public.joueurs;
  nouveau    boolean;
  accorde    boolean := false;
  prochain   timestamptz;
begin
  if uid is null then
    raise exception 'non_connecte';
  end if;

  insert into public.joueurs (user_id, boosters, dernier_quotidien)
  values (uid, 3, maintenant)
  on conflict (user_id) do nothing;
  nouveau := found;

  select * into j from public.joueurs where user_id = uid for update;

  if not nouveau and (j.dernier_quotidien is null
                      or public.jour_israel(j.dernier_quotidien) < public.jour_israel(maintenant)) then
    update public.joueurs
       set boosters = boosters + 1, dernier_quotidien = maintenant
     where user_id = uid
    returning * into j;
    accorde := true;
  end if;

  -- Prochain cadeau : minuit (heure d'Israël) suivant.
  prochain := (public.jour_israel(maintenant) + 1)::timestamp at time zone 'Asia/Jerusalem';

  return json_build_object(
    'nouveau', nouveau,
    'accorde', accorde,
    'boosters', j.boosters,
    'prochain', prochain,
    'attente_secondes', ceil(extract(epoch from prochain - maintenant))
  );
end $$;

-- ---------- Tirage d'une carte (utilisé par ouvrir_booster) ----------
-- Même règle que l'ancien jeu : rareté demandée ou en dessous sans doublon,
-- puis avec doublon, puis au-dessus seulement si la région n'a rien en dessous.

create or replace function public.tirer_carte(p_region text, p_rarete text, p_deja text[])
returns text
language plpgsql volatile set search_path = public as $$
declare
  rangs text[] := array['ordinaire', 'notable', 'rare', 'epique', 'legendaire', 'mythique'];
  idx   int := coalesce(array_position(rangs, p_rarete), 1);
  i     int;
  choix text;
begin
  for i in reverse idx..1 loop
    select id into choix from public.cartes
     where region = p_region and rarete = rangs[i] and not (id = any (p_deja))
     order by random() limit 1;
    if found then return choix; end if;
  end loop;

  for i in reverse idx..1 loop
    select id into choix from public.cartes
     where region = p_region and rarete = rangs[i]
     order by random() limit 1;
    if found then return choix; end if;
  end loop;

  for i in (idx + 1)..array_length(rangs, 1) loop
    select id into choix from public.cartes
     where region = p_region and rarete = rangs[i]
     order by random() limit 1;
    if found then return choix; end if;
  end loop;

  return null;
end $$;

-- ---------- Ouvrir un booster ----------
-- Tout se passe sur le serveur : vérification du stock, tirage au hasard,
-- ajout à la collection. Le téléphone reçoit seulement le résultat.

create or replace function public.ouvrir_booster(p_region text) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid       uuid := auth.uid();
  j         public.joueurs;
  r         double precision := random();
  speciale  text;
  palier    text;
  ids       text[] := '{}';
  possedees text[];
  resultat  json;
begin
  if uid is null then
    raise exception 'non_connecte';
  end if;
  if p_region not in ('europe', 'afrique', 'moyen-orient', 'asie', 'ameriques', 'oceanie') then
    raise exception 'region_inconnue';
  end if;

  -- Verrou : deux ouvertures simultanées ne peuvent pas utiliser le même booster.
  select * into j from public.joueurs where user_id = uid for update;
  if not found then
    raise exception 'joueur_inconnu';
  end if;
  if j.boosters <= 0 then
    raise exception 'plus_de_booster';
  end if;
  if not exists (select 1 from public.cartes where region = p_region) then
    raise exception 'region_vide';
  end if;

  -- 2 Ordinaires + 1 Notable + 1 Rare + 1 carte spéciale
  speciale := case when r < 0.01 then 'mythique'
                   when r < 0.09 then 'legendaire'
                   when r < 0.35 then 'epique'
                   else 'rare' end;
  foreach palier in array array['ordinaire', 'ordinaire', 'notable', 'rare', speciale] loop
    ids := ids || public.tirer_carte(p_region, palier, ids);
  end loop;

  select coalesce(array_agg(carte_id), '{}') into possedees
    from public.collection where user_id = uid and carte_id = any (ids);

  update public.joueurs set boosters = boosters - 1 where user_id = uid returning * into j;

  insert into public.collection (user_id, carte_id, exemplaires)
  select uid, c, count(*) from unnest(ids) as c group by c
  on conflict (user_id, carte_id) do update
    set exemplaires = public.collection.exemplaires + excluded.exemplaires;

  insert into public.ouvertures (user_id, region, cartes) values (uid, p_region, ids);

  -- Résultat trié du plus courant au plus rare (la plus belle carte en dernier).
  -- « nouvelle » : carte jamais obtenue avant ce booster (1re occurrence seulement).
  select json_agg(json_build_object('id', t.id, 'nouvelle', t.nouvelle) order by t.rang, t.pos)
    into resultat
    from (select x.id, x.pos,
                 array_position(array['ordinaire', 'notable', 'rare', 'epique', 'legendaire', 'mythique'], c.rarete) as rang,
                 (not (x.id = any (possedees)) and x.pos = min(x.pos) over (partition by x.id)) as nouvelle
            from unnest(ids) with ordinality as x(id, pos)
            join public.cartes c on c.id = x.id) as t;

  return json_build_object('cartes', resultat, 'boosters', j.boosters);
end $$;

-- ---------- Qui peut appeler quoi ----------
revoke execute on function public.tirer_carte(text, text, text[]) from public, anon, authenticated;
revoke execute on function public.reclamer_quotidien() from public, anon;
revoke execute on function public.ouvrir_booster(text) from public, anon;
grant execute on function public.reclamer_quotidien() to authenticated;
grant execute on function public.ouvrir_booster(text) to authenticated;
