-- =============================================================
--  CHRONOLEGENDS — 10. Finitions tirées au sort (Animée, Diamant)
--  La finition n'est plus un réglage de la carte : c'est une
--  version plus rare de la même carte, tirée au sort par le
--  serveur à chaque ouverture de booster, pour chaque carte.
--    • Animée  : 1 carte sur 25  (~ 1 booster sur 5)
--    • Diamant : 1 carte sur 150 (~ 1 booster sur 30), la plus rare
--  La collection compte chaque version à part.
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

-- ---------- Collection : une ligne par carte ET par finition ----------

alter table public.collection add column if not exists finition text not null default 'normale';
alter table public.collection drop constraint if exists collection_finition_valide;
alter table public.collection add constraint collection_finition_valide
  check (finition in ('normale', 'animee', 'diamant'));

-- Clé : (joueur, carte, finition) au lieu de (joueur, carte). Les cartes déjà
-- obtenues deviennent des versions « normale ».
do $$
declare cle text;
begin
  select conname into cle from pg_constraint
   where conrelid = 'public.collection'::regclass and contype = 'p';
  if cle is not null and cle <> 'collection_cle_finition' then
    execute format('alter table public.collection drop constraint %I', cle);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'collection_cle_finition') then
    alter table public.collection add constraint collection_cle_finition
      primary key (user_id, carte_id, finition);
  end if;
end $$;

-- Journal des ouvertures : on garde aussi les finitions tirées.
alter table public.ouvertures add column if not exists finitions text[];

-- ---------- Ouvrir un booster (reprend 5_verrou_region.sql + finitions) ----------

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
    -- Finition de cet exemplaire, indépendante de la rareté.
    f := random();
    fins := fins || case when f < 1.0 / 150 then 'diamant'
                         when f < 1.0 / 150 + 1.0 / 25 then 'animee'
                         else 'normale' end;
  end loop;

  select coalesce(array_agg(distinct carte_id), '{}') into possedees
    from public.collection where user_id = uid and carte_id = any (ids);

  update public.joueurs set boosters = boosters - 1 where user_id = uid returning * into j;

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
                           'verrou', public.infos_verrou(j));
end $$;

revoke execute on function public.ouvrir_booster() from public, anon;
grant execute on function public.ouvrir_booster() to authenticated;

-- ---------- Les cartes n'ont plus de finition fixe ----------
-- (la colonne cartes.finition reste, toujours « normale », mais n'est plus utilisée)
update public.cartes set finition = 'normale' where finition <> 'normale';

-- ---------- Vérification : doit afficher la clé (joueur, carte, finition) ----------
select conname, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conrelid = 'public.collection'::regclass and contype in ('p', 'c');
