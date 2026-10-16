-- =============================================================
--  CHRONOLEGENDS — 17. Rattrapage des boosters quotidiens manqués
--
--  Avant : après plusieurs jours d'absence, le joueur ne recevait qu'UN
--  booster. Maintenant, chaque jour manqué compte, jusqu'à un plafond
--  (réglage « rattrapage_max », 3 par défaut, modifiable dans
--  Table Editor → reglages_tirage).
--    • absent 1 jour  → 1 booster ; 2 jours → 2 ; 3 jours ou plus → 3.
--  Le stock de boosters non ouverts, lui, n'a toujours pas de limite.
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

insert into public.reglages_tirage (cle, valeur, explication) values
  ('rattrapage_max', 3, 'Boosters quotidiens manqués rattrapés au retour du joueur (au maximum)')
on conflict (cle) do nothing;

-- ---------- Cadeau quotidien (reprend 5_verrou_region.sql + rattrapage) ----------

create or replace function public.reclamer_quotidien() returns json
language plpgsql security definer set search_path = public as $$
declare
  uid        uuid := auth.uid();
  maintenant timestamptz := now();          -- heure du SERVEUR, jamais celle du téléphone
  j          public.joueurs;
  nouveau    boolean;
  accordes   int := 0;                      -- boosters donnés à cette visite
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

  if not nouveau then
    -- Un booster par jour écoulé depuis le dernier cadeau (minuit, heure d'Israël),
    -- au maximum « rattrapage_max ».
    accordes := case when j.dernier_quotidien is null then 1
                     else least(public.jour_israel(maintenant) - public.jour_israel(j.dernier_quotidien),
                                public.reglage_tirage('rattrapage_max', 3)::int)
                end;
    if accordes > 0 then
      update public.joueurs
         set boosters = boosters + accordes, dernier_quotidien = maintenant
       where user_id = uid;
    else
      accordes := 0;
    end if;
  end if;

  j := public.localiser_joueur(uid);

  -- Prochain cadeau : minuit (heure d'Israël) suivant.
  prochain := (public.jour_israel(maintenant) + 1)::timestamp at time zone 'Asia/Jerusalem';

  return json_build_object(
    'nouveau', nouveau,
    'accorde', accordes > 0,
    'accordes', accordes,
    'boosters', j.boosters,
    'prochain', prochain,
    'attente_secondes', ceil(extract(epoch from prochain - maintenant)),
    'pays', j.pays,
    'region', j.region,
    'verrou', public.infos_verrou(j)
  );
end $$;

revoke execute on function public.reclamer_quotidien() from public, anon;
grant execute on function public.reclamer_quotidien() to authenticated;

-- ---------- Vérification : doit afficher rattrapage_max = 3 ----------
select cle, valeur from public.reglages_tirage where cle = 'rattrapage_max';
