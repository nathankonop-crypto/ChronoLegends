-- =============================================================
--  CHRONOLEGENDS — Verrou de région (anti-VPN)
--  À coller UNE FOIS dans Supabase : SQL Editor → New query → Run.
--
--  Règle : la région « officielle » du joueur (celle de ses boosters)
--  ne change que si la nouvelle région est détectée de nouveau AU MOINS
--  24 HEURES après la première fois, sans retour dans l'ancienne région
--  entre les deux, et au plus une fois tous les 7 jours.
--  Allumer un VPN pour un booster ne suffit donc plus.
-- =============================================================

alter table public.joueurs add column if not exists region_candidate  text;         -- nouvelle région en attente
alter table public.joueurs add column if not exists candidate_depuis  timestamptz;  -- 1re fois où elle a été vue
alter table public.joueurs add column if not exists region_changee_le timestamptz;  -- dernier changement accepté

-- ---------- La règle, seule (sans rien lire ni écrire : facile à tester) ----------
create or replace function public.decider_region(
  p_officielle text, p_candidate text, p_depuis timestamptz, p_changee_le timestamptz,
  p_detectee text, p_maintenant timestamptz)
returns table (officielle text, candidate text, depuis timestamptz, changee_le timestamptz)
language plpgsql stable set search_path = public as $$
begin
  -- Pays inconnu (VPN anonyme, Tor…) : rien ne change.
  if p_detectee is null then
    return query select p_officielle, p_candidate, p_depuis, p_changee_le;
  -- Tout premier passage : la région détectée est adoptée tout de suite.
  elsif p_officielle is null then
    return query select p_detectee, null::text, null::timestamptz, p_changee_le;
  -- De retour dans sa région : la demande de changement est annulée.
  elsif p_detectee = p_officielle then
    return query select p_officielle, null::text, null::timestamptz, p_changee_le;
  -- Même nouvelle région, revue 24 h plus tard, et 7 jours depuis le dernier changement : on change.
  elsif p_candidate = p_detectee
        and p_maintenant >= p_depuis + interval '24 hours'
        and (p_changee_le is null or p_maintenant >= p_changee_le + interval '7 days') then
    return query select p_detectee, null::text, null::timestamptz, p_maintenant;
  -- Même nouvelle région, mais trop tôt : on attend.
  elsif p_candidate = p_detectee then
    return query select p_officielle, p_candidate, p_depuis, p_changee_le;
  -- Nouvelle région vue pour la première fois : elle devient candidate.
  else
    return query select p_officielle, p_detectee, p_maintenant, p_changee_le;
  end if;
end $$;

-- ---------- Appliquée au joueur, à chaque cadeau / ouverture ----------
create or replace function public.localiser_joueur(p_uid uuid) returns public.joueurs
language plpgsql security definer set search_path = public as $$
declare
  v_pays   text := public.pays_de_la_requete();
  v_region text;
  j        public.joueurs;
  d        record;
begin
  select region into v_region from public.pays_regions where code = v_pays;
  select * into j from public.joueurs where user_id = p_uid;

  select * into d from public.decider_region(j.region, j.region_candidate, j.candidate_depuis,
                                             j.region_changee_le, v_region, now());

  update public.joueurs
     set region = d.officielle, region_candidate = d.candidate,
         candidate_depuis = d.depuis, region_changee_le = d.changee_le,
         pays = case when v_region is not null then v_pays else pays end
   where user_id = p_uid
  returning * into j;
  return j;
end $$;

-- Ce que le joueur voit pendant l'attente : la région détectée et quand
-- elle pourra devenir la sienne (s'il y est toujours à ce moment-là).
create or replace function public.infos_verrou(j public.joueurs) returns json
language sql stable set search_path = public as $$
  select case when j.region_candidate is null then null else json_build_object(
    'region_detectee', j.region_candidate,
    'changement_le', greatest(
      j.candidate_depuis + interval '24 hours',
      coalesce(j.region_changee_le + interval '7 days', '-infinity'::timestamptz)))
  end;
$$;

-- ---------- Cadeau quotidien : renvoie aussi la région décidée par le serveur ----------
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
     where user_id = uid;
    accorde := true;
  end if;

  j := public.localiser_joueur(uid);

  -- Prochain cadeau : minuit (heure d'Israël) suivant.
  prochain := (public.jour_israel(maintenant) + 1)::timestamp at time zone 'Asia/Jerusalem';

  return json_build_object(
    'nouveau', nouveau,
    'accorde', accorde,
    'boosters', j.boosters,
    'prochain', prochain,
    'attente_secondes', ceil(extract(epoch from prochain - maintenant)),
    'pays', j.pays,
    'region', j.region,
    'verrou', public.infos_verrou(j)
  );
end $$;

-- ---------- Ouvrir un booster : la région n'est plus envoyée par le téléphone ----------

create or replace function public.ouvrir_booster() returns json
language plpgsql security definer set search_path = public as $$
declare
  uid       uuid := auth.uid();
  j         public.joueurs;
  v_region  text;
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

  -- Verrou : deux ouvertures simultanées ne peuvent pas utiliser le même booster.
  select * into j from public.joueurs where user_id = uid for update;
  if not found then
    raise exception 'joueur_inconnu';
  end if;
  if j.boosters <= 0 then
    raise exception 'plus_de_booster';
  end if;

  -- Région d'après l'adresse IP de CETTE requête (ou la dernière connue).
  j := public.localiser_joueur(uid);
  v_region := j.region;
  if v_region is null then
    raise exception 'region_inconnue';
  end if;
  if not exists (select 1 from public.cartes where region = v_region) then
    raise exception 'region_vide';
  end if;

  -- 2 Ordinaires + 1 Notable + 1 Rare + 1 carte spéciale
  speciale := case when r < 0.01 then 'mythique'
                   when r < 0.09 then 'legendaire'
                   when r < 0.35 then 'epique'
                   else 'rare' end;
  foreach palier in array array['ordinaire', 'ordinaire', 'notable', 'rare', speciale] loop
    ids := ids || public.tirer_carte(v_region, palier, ids);
  end loop;

  select coalesce(array_agg(carte_id), '{}') into possedees
    from public.collection where user_id = uid and carte_id = any (ids);

  update public.joueurs set boosters = boosters - 1 where user_id = uid returning * into j;

  insert into public.collection (user_id, carte_id, exemplaires)
  select uid, c, count(*) from unnest(ids) as c group by c
  on conflict (user_id, carte_id) do update
    set exemplaires = public.collection.exemplaires + excluded.exemplaires;

  insert into public.ouvertures (user_id, region, cartes) values (uid, v_region, ids);

  -- Résultat trié du plus courant au plus rare (la plus belle carte en dernier).
  -- « nouvelle » : carte jamais obtenue avant ce booster (1re occurrence seulement).
  select json_agg(json_build_object('id', t.id, 'nouvelle', t.nouvelle) order by t.rang, t.pos)
    into resultat
    from (select x.id, x.pos,
                 array_position(array['ordinaire', 'notable', 'rare', 'epique', 'legendaire', 'mythique'], c.rarete) as rang,
                 (not (x.id = any (possedees)) and x.pos = min(x.pos) over (partition by x.id)) as nouvelle
            from unnest(ids) with ordinality as x(id, pos)
            join public.cartes c on c.id = x.id) as t;

  return json_build_object('cartes', resultat, 'boosters', j.boosters, 'region', v_region,
                           'verrou', public.infos_verrou(j));
end $$;

-- ---------- Qui peut appeler quoi ----------
revoke execute on function public.decider_region(text, text, timestamptz, timestamptz, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.localiser_joueur(uuid) from public, anon, authenticated;
revoke execute on function public.infos_verrou(public.joueurs) from public, anon, authenticated;