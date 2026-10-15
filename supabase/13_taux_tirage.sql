-- =============================================================
--  CHRONOLEGENDS — 13. Taux de tirage modifiables, pitié, statut des cartes
--
--  • Table taux_tirage : les chances de chaque rareté, par emplacement
--    du booster. Modifiable dans Supabase (Table Editor → taux_tirage).
--    Ce sont des POIDS : pas besoin que le total fasse exactement 100.
--      - cartes_1_a_3 : cartes 1, 2 et 3 (toutes raretés)
--      - carte_4      : 4e carte, « Notable ou mieux »
--      - carte_5      : 5e carte, « Rare ou mieux »
--      - carte_5_dore : 5e carte d'un booster doré
--    Un poids à 0 = cette rareté ne sort jamais à cet emplacement.
--  • Table reglages_tirage : pitié, booster doré, finitions.
--  • Pitié : joueurs.boosters_sans_legendaire, tenu UNIQUEMENT par le serveur.
--    Après « pitie_seuil » boosters sans Légendaire ni Mythique, la première
--    carte Rare ou mieux du booster suivant devient Légendaire (une Mythique
--    reste Mythique). Remis à zéro dès qu'une Légendaire ou Mythique sort.
--  • Statut des cartes : 'brouillon' ou 'validee'. Seules les cartes validées
--    sortent des boosters. Les cartes existantes passent en 'validee'.
--
--  Taux prévus pour ~2 boosters par jour (voir le détail en bas du fichier).
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger
--  (les taux déjà modifiés à la main ne sont PAS écrasés).
-- =============================================================

-- ---------- Taux par rareté et par emplacement ----------

create table if not exists public.taux_tirage (
  rarete       text primary key check (rarete in ('ordinaire', 'notable', 'rare', 'epique', 'legendaire', 'mythique')),
  ordre        integer not null,
  cartes_1_a_3 numeric not null default 0 check (cartes_1_a_3 >= 0),
  carte_4      numeric not null default 0 check (carte_4 >= 0),
  carte_5      numeric not null default 0 check (carte_5 >= 0),
  carte_5_dore numeric not null default 0 check (carte_5_dore >= 0)
);

insert into public.taux_tirage (rarete, ordre, cartes_1_a_3, carte_4, carte_5, carte_5_dore) values
  ('ordinaire',  1, 65,    0,    0,    0),
  ('notable',    2, 27,   80,    0,    0),
  ('rare',       3,  6.4, 16,   84,   50),
  ('epique',     4,  1.48, 3.65, 14,  39.5),
  ('legendaire', 5,  0.1,  0.3,  1.8,  9),
  ('mythique',   6,  0.02, 0.05, 0.2,  1.5)
on conflict (rarete) do nothing;

-- ---------- Autres réglages du tirage ----------

create table if not exists public.reglages_tirage (
  cle         text primary key,
  valeur      numeric not null,
  explication text
);

insert into public.reglages_tirage (cle, valeur, explication) values
  ('pitie_seuil',         50,   'Nombre de boosters sans Légendaire ni Mythique avant que la pitié force une Légendaire'),
  ('chance_booster_dore', 0.1,  'Chance que le PROCHAIN booster soit doré (0.1 = 1 sur 10)'),
  ('animee_sur',          25,   'Finition Animée : 1 carte sur N (booster normal)'),
  ('diamant_sur',         150,  'Finition Diamant : 1 carte sur N (booster normal)'),
  ('animee_sur_dore',     10,   'Finition Animée : 1 carte sur N (booster doré)'),
  ('diamant_sur_dore',    50,   'Finition Diamant : 1 carte sur N (booster doré)')
on conflict (cle) do nothing;

-- Tout le monde peut lire les taux (fenêtre « Chances de tirage »), seul l'admin les modifie.
alter table public.taux_tirage enable row level security;
alter table public.reglages_tirage enable row level security;

drop policy if exists "Tout le monde lit les taux" on public.taux_tirage;
create policy "Tout le monde lit les taux" on public.taux_tirage for select to anon, authenticated using (true);
drop policy if exists "Seul l'admin modifie les taux" on public.taux_tirage;
create policy "Seul l'admin modifie les taux" on public.taux_tirage
  for all to authenticated using (public.est_admin()) with check (public.est_admin());

drop policy if exists "Tout le monde lit les réglages" on public.reglages_tirage;
create policy "Tout le monde lit les réglages" on public.reglages_tirage for select to anon, authenticated using (true);
drop policy if exists "Seul l'admin modifie les réglages" on public.reglages_tirage;
create policy "Seul l'admin modifie les réglages" on public.reglages_tirage
  for all to authenticated using (public.est_admin()) with check (public.est_admin());

grant select on public.taux_tirage, public.reglages_tirage to anon, authenticated;
grant insert, update, delete on public.taux_tirage, public.reglages_tirage to authenticated;

-- ---------- Compteur de pitié (serveur uniquement) ----------
-- Le joueur peut LIRE sa fiche mais jamais l'écrire : seules les fonctions du serveur la modifient.
alter table public.joueurs add column if not exists boosters_sans_legendaire integer not null default 0;

-- ---------- Statut des cartes ----------
-- Les cartes existantes deviennent « validee » ; les nouvelles cartes de l'admin
-- naissent en « brouillon » et ne sortent des boosters qu'une fois validées.
alter table public.cartes add column if not exists statut text not null default 'validee';
alter table public.cartes alter column statut set default 'brouillon';
alter table public.cartes drop constraint if exists cartes_statut_valide;
alter table public.cartes add constraint cartes_statut_valide check (statut in ('brouillon', 'validee'));

-- ---------- Lire un réglage (avec une valeur de secours) ----------

create or replace function public.reglage_tirage(p_cle text, p_defaut numeric) returns numeric
language sql stable set search_path = public as $$
  select coalesce((select valeur from public.reglages_tirage where cle = p_cle), p_defaut);
$$;

-- ---------- Tirer une rareté selon une colonne de taux_tirage ----------

create or replace function public.tirer_rarete(p_colonne text) returns text
language plpgsql volatile set search_path = public as $$
declare
  total  numeric;
  r      numeric;
  cumul  numeric := 0;
  ligne  record;
begin
  if p_colonne not in ('cartes_1_a_3', 'carte_4', 'carte_5', 'carte_5_dore') then
    raise exception 'colonne_inconnue';
  end if;
  execute format('select sum(%I) from public.taux_tirage', p_colonne) into total;
  if total is null or total <= 0 then
    return 'ordinaire';
  end if;
  r := random() * total;
  for ligne in execute format('select rarete, %I as poids from public.taux_tirage where %I > 0 order by ordre', p_colonne, p_colonne) loop
    cumul := cumul + ligne.poids;
    if r < cumul then
      return ligne.rarete;
    end if;
  end loop;
  return ligne.rarete;   -- arrondis : la dernière rareté possible
end $$;

-- ---------- Tirer une carte (reprend 3_joueurs.sql + cartes validées seulement) ----------
-- Une carte au hasard de cette rareté dans la région, si possible pas déjà dans ce booster.
-- Si la région n'en a pas : la rareté juste en dessous, puis au-dessus.

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
     where region = p_region and rarete = rangs[i] and statut = 'validee' and not (id = any (p_deja))
     order by random() limit 1;
    if found then return choix; end if;
  end loop;

  for i in reverse idx..1 loop
    select id into choix from public.cartes
     where region = p_region and rarete = rangs[i] and statut = 'validee'
     order by random() limit 1;
    if found then return choix; end if;
  end loop;

  for i in (idx + 1)..array_length(rangs, 1) loop
    select id into choix from public.cartes
     where region = p_region and rarete = rangs[i] and statut = 'validee'
     order by random() limit 1;
    if found then return choix; end if;
  end loop;

  return null;
end $$;

revoke execute on function public.tirer_carte(text, text, text[]) from public, anon, authenticated;
revoke execute on function public.tirer_rarete(text) from public, anon, authenticated;

-- ---------- Ouvrir un booster (reprend 12_booster_dore.sql + taux, pitié, statut) ----------

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
  p_animee  double precision;
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
  p_animee  := 1.0 / public.reglage_tirage(case when dore then 'animee_sur_dore' else 'animee_sur' end, case when dore then 10 else 25 end);

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
                         when f < p_diamant + p_animee then 'animee'
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

-- ---------- Vérification : doit afficher les 6 raretés et leurs taux ----------
select rarete, cartes_1_a_3, carte_4, carte_5, carte_5_dore from public.taux_tirage order by ordre;

-- =============================================================
--  Ce que donnent ces taux (booster doré 1 fois sur 10 compris) :
--    • au moins une Épique ou mieux       : ~1 booster sur 4
--    • au moins une Légendaire ou Mythique : ~1 booster sur 28
--      (≈ toutes les 2 semaines à 2 boosters par jour)
--    • une Mythique                        : ~1 booster sur 225
--      (≈ tous les 4 mois à 2 boosters par jour)
--    • pitié à 50 boosters                 : ~1 série de 50 sur 6 la déclenche
-- =============================================================
