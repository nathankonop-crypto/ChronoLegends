-- =============================================================
--  CHRONOLEGENDS — 15. La finition Animée devient la finition Émeraude
--
--  • Les exemplaires « animee » déjà obtenus deviennent « emeraude »
--    (collection et journal des boosters).
--  • Réglages : animee_sur → emeraude_sur, animee_sur_dore → emeraude_sur_dore
--    (les valeurs restent les mêmes : 1 carte sur 25, 1 sur 10 en booster doré).
--  • Le tirage des boosters donne désormais « emeraude ».
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

-- ---------- Collection ----------
alter table public.collection drop constraint if exists collection_finition_valide;
update public.collection set finition = 'emeraude' where finition = 'animee';
alter table public.collection add constraint collection_finition_valide
  check (finition in ('normale', 'emeraude', 'diamant'));

-- ---------- Journal des boosters (historique) ----------
update public.ouvertures set finitions = array_replace(finitions, 'animee', 'emeraude')
 where 'animee' = any (finitions);

-- ---------- Réglages du tirage ----------
update public.reglages_tirage
   set cle = 'emeraude_sur', explication = 'Finition Émeraude : 1 carte sur N (booster normal)'
 where cle = 'animee_sur' and not exists (select 1 from public.reglages_tirage where cle = 'emeraude_sur');
update public.reglages_tirage
   set cle = 'emeraude_sur_dore', explication = 'Finition Émeraude : 1 carte sur N (booster doré)'
 where cle = 'animee_sur_dore' and not exists (select 1 from public.reglages_tirage where cle = 'emeraude_sur_dore');
delete from public.reglages_tirage where cle in ('animee_sur', 'animee_sur_dore');

-- ---------- Ouvrir un booster (reprend 13_taux_tirage.sql, finition « emeraude ») ----------

create or replace function public.ouvrir_booster() returns json
language plpgsql security definer set search_path = public as $$
declare
  uid       uuid := auth.uid();
  j         public.joueurs;
  v_region  text;
  dore      boolean;
  pitie     boolean;
  pitie_utilisee boolean := false;
  haute     boolean := false;   -- une Légendaire ou Mythique est sortie ?
  palier    text;
  id_carte  text;
  rarete_obtenue text;
  ids       text[] := '{}';
  fins      text[] := '{}';
  f         double precision;
  p_diamant double precision;
  p_emeraude double precision;
  i         int;
  possedees text[];
  resultat  json;
  rangs     text[] := array['ordinaire', 'notable', 'rare', 'epique', 'legendaire', 'mythique'];
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
  if not exists (select 1 from public.cartes where region = v_region and statut = 'validee') then
    raise exception 'region_vide';
  end if;

  dore := j.booster_dore;
  pitie := j.boosters_sans_legendaire >= public.reglage_tirage('pitie_seuil', 50);
  p_diamant := 1.0 / public.reglage_tirage(case when dore then 'diamant_sur_dore' else 'diamant_sur' end, case when dore then 50 else 150 end);
  p_emeraude := 1.0 / public.reglage_tirage(case when dore then 'emeraude_sur_dore' else 'emeraude_sur' end, case when dore then 10 else 25 end);

  for i in 1..5 loop
    -- Cartes 1-3 libres, 4e « Notable ou mieux », 5e « Rare ou mieux » (meilleure si booster doré).
    palier := public.tirer_rarete(case when i <= 3 then 'cartes_1_a_3'
                                       when i = 4 then 'carte_4'
                                       when dore then 'carte_5_dore'
                                       else 'carte_5' end);
    -- Pitié : la première carte Rare ou mieux devient au moins Légendaire.
    if pitie and not pitie_utilisee and array_position(rangs, palier) >= 3 then
      if palier not in ('legendaire', 'mythique') then
        palier := 'legendaire';
      end if;
      pitie_utilisee := true;
    end if;

    id_carte := public.tirer_carte(v_region, palier, ids);
    ids := ids || id_carte;
    select rarete into rarete_obtenue from public.cartes where id = id_carte;
    if rarete_obtenue in ('legendaire', 'mythique') then
      haute := true;
    end if;

    -- Finition de cet exemplaire, indépendante de la rareté.
    f := random();
    fins := fins || case when f < p_diamant then 'diamant'
                         when f < p_diamant + p_emeraude then 'emeraude'
                         else 'normale' end;
  end loop;

  select coalesce(array_agg(distinct carte_id), '{}') into possedees
    from public.collection where user_id = uid and carte_id = any (ids);

  -- Booster suivant : doré ou non (tiré dès maintenant, visible avant l'ouverture).
  -- Pitié : remise à zéro si une Légendaire ou Mythique est sortie, sinon +1.
  update public.joueurs
     set boosters = boosters - 1,
         booster_dore = (random() < public.reglage_tirage('chance_booster_dore', 0.1)),
         boosters_sans_legendaire = case when haute then 0 else boosters_sans_legendaire + 1 end
   where user_id = uid returning * into j;

  insert into public.collection (user_id, carte_id, finition, exemplaires)
  select uid, x.c, x.fin, count(*)
    from unnest(ids, fins) as x(c, fin)
   group by x.c, x.fin
  on conflict (user_id, carte_id, finition) do update
    set exemplaires = public.collection.exemplaires + excluded.exemplaires;

  insert into public.ouvertures (user_id, region, cartes, finitions) values (uid, v_region, ids, fins);

  -- Résultat trié du plus courant au plus rare (la plus belle carte en dernier).
  -- « nouvelle » : carte jamais obtenue avant ce booster (1re occurrence seulement).
  select json_agg(json_build_object('id', t.id, 'finition', t.fin, 'nouvelle', t.nouvelle) order by t.rang, t.pos)
    into resultat
    from (select x.id, x.fin, x.pos,
                 array_position(rangs, c.rarete) as rang,
                 (not (x.id = any (possedees)) and x.pos = min(x.pos) over (partition by x.id)) as nouvelle
            from unnest(ids, fins) with ordinality as x(id, fin, pos)
            join public.cartes c on c.id = x.id) as t;

  return json_build_object('cartes', resultat, 'boosters', j.boosters, 'region', v_region,
                           'dore', dore, 'booster_dore', j.booster_dore, 'pitie', pitie_utilisee,
                           'verrou', public.infos_verrou(j));
end $$;

revoke execute on function public.ouvrir_booster() from public, anon;
grant execute on function public.ouvrir_booster() to authenticated;

-- ---------- Vérification : plus aucune « animee », et les réglages renommés ----------
select (select count(*) from public.collection where finition = 'animee') as animees_restantes,
       (select count(*) from public.collection where finition = 'emeraude') as emeraudes,
       (select string_agg(cle || ' = ' || valeur, ', ') from public.reglages_tirage where cle like 'emeraude%') as reglages;
