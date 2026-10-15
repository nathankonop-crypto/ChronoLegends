-- =============================================================
--  CHRONOLEGENDS — 12. Booster doré
--  De temps en temps (1 booster sur 10), le prochain booster du
--  joueur est un booster doré, visible avant de l'ouvrir.
--  Dans un booster doré :
--    • carte spéciale : Rare 30 % · Épique 46 % · Légendaire 20 % · Mythique 4 %
--      (au lieu de 65 / 26 / 8 / 1)
--    • Animée : 1 carte sur 10 (au lieu de 1 sur 25)
--    • Diamant : 1 carte sur 50 (au lieu de 1 sur 150)
--  Ces chiffres sont aussi affichés dans le jeu (app.js, CHANCES_DORE).
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

-- Le PROCHAIN booster du joueur est-il doré ? (lisible par le joueur, via sa fiche)
alter table public.joueurs add column if not exists booster_dore boolean not null default false;

-- ---------- Ouvrir un booster (reprend 10_finitions.sql + booster doré) ----------

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
  fins      text[] := '{}';
  f         double precision;
  dore      boolean;
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
  -- Booster doré : meilleures chances pour la carte spéciale et les finitions.
  dore := j.booster_dore;
  if dore then
    speciale := case when r < 0.04 then 'mythique'
                     when r < 0.24 then 'legendaire'
                     when r < 0.70 then 'epique'
                     else 'rare' end;
  else
    speciale := case when r < 0.01 then 'mythique'
                     when r < 0.09 then 'legendaire'
                     when r < 0.35 then 'epique'
                     else 'rare' end;
  end if;
  foreach palier in array array['ordinaire', 'ordinaire', 'notable', 'rare', speciale] loop
    ids := ids || public.tirer_carte(v_region, palier, ids);
    -- Finition de cet exemplaire, indépendante de la rareté.
    f := random();
    fins := fins || case when f < (case when dore then 1.0 / 50 else 1.0 / 150 end) then 'diamant'
                         when f < (case when dore then 1.0 / 50 + 1.0 / 10 else 1.0 / 150 + 1.0 / 25 end) then 'animee'
                         else 'normale' end;
  end loop;

  select coalesce(array_agg(distinct carte_id), '{}') into possedees
    from public.collection where user_id = uid and carte_id = any (ids);

  -- Le booster suivant est tiré au sort dès maintenant : doré 1 fois sur 10.
  -- Le joueur le voit donc avant de l'ouvrir.
  update public.joueurs set boosters = boosters - 1, booster_dore = (random() < 0.1)
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
                 array_position(array['ordinaire', 'notable', 'rare', 'epique', 'legendaire', 'mythique'], c.rarete) as rang,
                 (not (x.id = any (possedees)) and x.pos = min(x.pos) over (partition by x.id)) as nouvelle
            from unnest(ids, fins) with ordinality as x(id, fin, pos)
            join public.cartes c on c.id = x.id) as t;

  return json_build_object('cartes', resultat, 'boosters', j.boosters, 'region', v_region,
                           'dore', dore, 'booster_dore', j.booster_dore,
                           'verrou', public.infos_verrou(j));
end $$;

revoke execute on function public.ouvrir_booster() from public, anon;
grant execute on function public.ouvrir_booster() to authenticated;

-- ---------- Vérification : doit afficher « booster_dore | boolean » ----------
select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'joueurs' and column_name = 'booster_dore';
