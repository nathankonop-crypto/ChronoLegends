-- =============================================================
--  CHRONOLEGENDS — 24. Chronos, quêtes du jour, quiz et succès
--
--  • Chronos : la monnaie du jeu (joueurs.chronos), gagnée en jouant.
--    Pour l'instant elle achète un booster en plus (400 Chronos, réglage
--    « prix_booster_chronos »). Vente contre de l'argent réel : plus tard.
--  • Quêtes du jour : 3 par jour (une facile, une moyenne, une difficile,
--    au moins un quiz), renouvelées à minuit heure du joueur, vérifiées
--    par le SERVEUR (ouvertures de boosters, réponses au quiz).
--    Bonus si les 3 sont récupérées ; 1 quête remplaçable par jour.
--  • Quiz : questions fabriquées à partir des cartes du joueur (région,
--    époque, dates) ; la bonne réponse reste sur le serveur.
--  • Succès : liste modifiable dans l'admin (table « succes ») ; chacun
--    une seule fois dans la partie. Types : boosters_ouverts,
--    cartes_differentes, rarete, finition, booster_dore, ensemble
--    (toutes les cartes d'un filtre : famille, époque, région, type,
--    rareté, religion, mots du nom, liste de cartes), serie, quiz.
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger
--  (les succès déjà modifiés dans l'admin ne sont PAS écrasés).
-- =============================================================

-- ---------- Colonnes du joueur ----------
alter table public.joueurs add column if not exists chronos int not null default 0 check (chronos >= 0);
alter table public.joueurs add column if not exists fuseau text;                       -- fuseau horaire du téléphone
alter table public.joueurs add column if not exists bonus_quetes_jour date;            -- bonus des 3 quêtes déjà donné ce jour-là
alter table public.joueurs add column if not exists quete_changee_jour date;           -- remplacement de quête déjà utilisé ce jour-là
alter table public.joueurs add column if not exists quiz_bonnes int not null default 0;
alter table public.joueurs add column if not exists quiz_jour date;
alter table public.joueurs add column if not exists quiz_nb_jour int not null default 0;
alter table public.joueurs add column if not exists serie int not null default 0;
alter table public.joueurs add column if not exists serie_max int not null default 0;
alter table public.joueurs add column if not exists derniere_visite date;

-- Le booster était-il doré ? (pour le succès « premier booster doré »)
alter table public.ouvertures add column if not exists dore boolean;

insert into public.reglages_tirage (cle, valeur, explication) values
  ('prix_booster_chronos', 400, 'Prix d''un booster en plus, en Chronos'),
  ('bonus_quetes_chronos', 15,  'Bonus en Chronos quand les 3 quêtes du jour sont récupérées'),
  ('quiz_max_jour',        20,  'Nombre maximum de questions de quiz par jour et par joueur')
on conflict (cle) do nothing;

-- ---------- Tables ----------
create table if not exists public.quetes_jour (
  user_id   uuid not null references public.joueurs (user_id) on delete cascade,
  jour      date not null,
  rang      int  not null check (rang between 1 and 3),
  code      text not null,
  param     text,
  progres   int  not null default 0,
  objectif  int  not null,
  chronos   int  not null,
  recuperee boolean not null default false,
  primary key (user_id, jour, rang)
);

create table if not exists public.quiz_en_cours (
  user_id  uuid primary key references public.joueurs (user_id) on delete cascade,
  question jsonb not null,          -- ce que voit le joueur
  reponse  text  not null,          -- la bonne réponse (jamais envoyée avant qu'il réponde)
  cree_le  timestamptz not null default now()
);

create table if not exists public.succes (
  id      text primary key check (id ~ '^[a-z0-9-]+$'),
  nom     text not null check (char_length(nom) between 1 and 60),
  nom_en  text check (char_length(nom_en) <= 60),
  nom_he  text check (char_length(nom_he) <= 60),
  type    text not null check (type in ('boosters_ouverts', 'cartes_differentes', 'rarete', 'finition',
                                         'booster_dore', 'ensemble', 'serie', 'quiz')),
  param   jsonb not null default '{}',
  seuil   int  not null default 1 check (seuil >= 1),
  chronos int  not null default 50 check (chronos >= 0),
  ordre   int  not null default 0,
  actif   boolean not null default true
);

create table if not exists public.succes_obtenus (
  user_id   uuid not null references public.joueurs (user_id) on delete cascade,
  succes_id text not null references public.succes (id) on delete cascade,
  obtenu_le timestamptz not null default now(),
  recupere  boolean not null default false,
  primary key (user_id, succes_id)
);

alter table public.quetes_jour    enable row level security;
alter table public.quiz_en_cours  enable row level security;
alter table public.succes         enable row level security;
alter table public.succes_obtenus enable row level security;

-- Quêtes, quiz et succès obtenus : écrits uniquement par les fonctions du serveur ci-dessous.
drop policy if exists "Chacun lit ses quêtes" on public.quetes_jour;
create policy "Chacun lit ses quêtes" on public.quetes_jour for select to authenticated using (user_id = auth.uid());
drop policy if exists "Chacun lit ses succès" on public.succes_obtenus;
create policy "Chacun lit ses succès" on public.succes_obtenus for select to authenticated using (user_id = auth.uid());
grant select on public.quetes_jour, public.succes_obtenus to authenticated;

-- Liste des succès : lue par tous, modifiée par l'admin seulement.
drop policy if exists "Tout le monde peut lire les succès" on public.succes;
create policy "Tout le monde peut lire les succès" on public.succes for select to anon, authenticated using (true);
drop policy if exists "Seul l'admin ajoute un succès" on public.succes;
create policy "Seul l'admin ajoute un succès" on public.succes for insert to authenticated with check (public.est_admin());
drop policy if exists "Seul l'admin modifie un succès" on public.succes;
create policy "Seul l'admin modifie un succès" on public.succes for update to authenticated using (public.est_admin()) with check (public.est_admin());
drop policy if exists "Seul l'admin supprime un succès" on public.succes;
create policy "Seul l'admin supprime un succès" on public.succes for delete to authenticated using (public.est_admin());
grant select on public.succes to anon, authenticated;
grant insert, update, delete on public.succes to authenticated;

-- ---------- Jour du joueur (minuit chez lui) ----------
create or replace function public.jour_joueur(p_uid uuid) returns date
language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce((select fuseau from public.joueurs where user_id = p_uid), 'Asia/Jerusalem'))::date;
$$;

-- Cartes validées d'une région (principale ou secondaire).
create or replace function public.dans_region(c public.cartes, p_region text) returns boolean
language sql immutable as $$
  select c.region = p_region or p_region = any (c.regions_secondaires);
$$;

-- ---------- Catalogue des quêtes du jour ----------
-- palier 1 = facile, 2 = moyenne, 3 = difficile
create or replace function public.catalogue_quetes()
returns table (code text, palier int, objectif int, chronos int)
language sql immutable as $$
  values ('ouvrir', 1, 1, 10), ('quiz1', 1, 1, 10),
         ('quiz3', 2, 3, 15), ('personnage', 2, 1, 15), ('nouvelle', 2, 1, 15), ('epoque', 2, 1, 15),
         ('epique', 3, 1, 20), ('ouvrir2', 3, 2, 20);
$$;

-- Une quête de ce palier, faisable aujourd'hui, absente de « exclues ». Renvoie (code, param).
create or replace function public.tirer_quete(p_uid uuid, p_palier int, p_exclues text[])
returns table (code text, param text)
language plpgsql volatile security definer set search_path = public as $$
declare
  j public.joueurs;
  q record;
begin
  select * into j from public.joueurs where user_id = p_uid;
  for q in select k.code from public.catalogue_quetes() k
            where k.palier = p_palier and not (k.code = any (p_exclues))
            order by random() loop
    if q.code = 'ouvrir2' and j.boosters < 2 then continue; end if;
    if q.code = 'personnage' and not exists (select 1 from public.cartes c where c.statut = 'validee'
         and c.gamme = 'personnage' and public.dans_region(c, j.region)) then continue; end if;
    if q.code = 'epoque' then
      select c.epoque into param from public.cartes c
       where c.statut = 'validee' and public.dans_region(c, j.region) order by random() limit 1;
      if param is null then continue; end if;
      code := q.code;
      return next; return;
    end if;
    code := q.code; param := null;
    return next; return;
  end loop;
end $$;

-- Les 3 quêtes du jour (créées au premier passage de la journée) ; au moins un quiz.
create or replace function public.assurer_quetes(p_uid uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_jour date := public.jour_joueur(p_uid);
  codes text[] := '{}';
  t record;
  p int;
  k record;
begin
  if exists (select 1 from public.quetes_jour where user_id = p_uid and jour = v_jour) then return; end if;
  for p in 1..3 loop
    select * into t from public.tirer_quete(p_uid, p, codes);
    if t.code is null then select * into t from public.tirer_quete(p_uid, 1, codes); end if;
    codes := codes || t.code;
    if t.code in ('quiz1', 'quiz3') then codes := codes || array['quiz1', 'quiz3']; end if;   -- un seul quiz par jour
    select * into k from public.catalogue_quetes() c where c.code = t.code;
    insert into public.quetes_jour (user_id, jour, rang, code, param, objectif, chronos)
    values (p_uid, v_jour, p, t.code, t.param, k.objectif, k.chronos)
    on conflict do nothing;
  end loop;
  -- Pas de quiz tiré : la quête facile devient « 1 question d'histoire ».
  if not exists (select 1 from public.quetes_jour where user_id = p_uid and jour = v_jour and code in ('quiz1', 'quiz3')) then
    update public.quetes_jour set code = 'quiz1', param = null, objectif = 1, chronos = 10
     where user_id = p_uid and jour = v_jour and rang = 1;
  end if;
end $$;

-- Fait avancer les quêtes du jour d'un type donné (sans dépasser l'objectif).
create or replace function public.avancer_quetes(p_uid uuid, p_codes text[], p_pas int, p_param text default null)
returns void
language sql volatile security definer set search_path = public as $$
  update public.quetes_jour
     set progres = least(objectif, progres + p_pas)
   where user_id = p_uid and jour = public.jour_joueur(p_uid) and code = any (p_codes)
     and (param is null or param = p_param) and not recuperee;
$$;

-- ---------- Chaque ouverture de booster fait avancer les quêtes ----------
create or replace function public.quetes_apres_ouverture() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := new.user_id;
  e text;
begin
  perform public.assurer_quetes(uid);
  perform public.avancer_quetes(uid, array['ouvrir', 'ouvrir2'], 1);
  if exists (select 1 from public.cartes where id = any (new.cartes) and gamme = 'personnage') then
    perform public.avancer_quetes(uid, array['personnage'], 1);
  end if;
  if exists (select 1 from public.cartes where id = any (new.cartes) and rarete in ('epique', 'legendaire', 'mythique')) then
    perform public.avancer_quetes(uid, array['epique'], 1);
  end if;
  for e in select distinct epoque from public.cartes where id = any (new.cartes) loop
    perform public.avancer_quetes(uid, array['epoque'], 1, e);
  end loop;
  -- Nouvelle carte : la collection (déjà mise à jour) n'en contient que les exemplaires de ce booster.
  if exists (select 1 from (select x.id, count(*) n from unnest(new.cartes) as x(id) group by x.id) b
              where (select sum(exemplaires) from public.collection
                      where user_id = uid and carte_id = b.id) = b.n) then
    perform public.avancer_quetes(uid, array['nouvelle'], 1);
  end if;
  return new;
end $$;

drop trigger if exists ouverture_quetes on public.ouvertures;
create trigger ouverture_quetes after insert on public.ouvertures
  for each row execute function public.quetes_apres_ouverture();

-- ---------- Ouvrir un booster : identique à 15_emeraude.sql, + « dore » dans le journal ----------
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
  if not exists (select 1 from public.cartes c where public.dans_region(c, v_region) and c.statut = 'validee') then
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

  -- Booster suivant : doré ou non (tiré dès maintenant ; le jeu ne le montre qu'à la découpe).
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

  insert into public.ouvertures (user_id, region, cartes, finitions, dore) values (uid, v_region, ids, fins, dore);

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

-- ---------- Quêtes : lecture, récompense, remplacement ----------
-- p_fuseau : fuseau horaire du téléphone (« Asia/Jerusalem »…), pour que le jour change à minuit chez le joueur.
create or replace function public.mes_quetes(p_fuseau text default null) returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  j public.joueurs;
  v_jour date;
  liste json;
begin
  if uid is null then raise exception 'non_connecte'; end if;
  if p_fuseau is not null and exists (select 1 from pg_timezone_names where name = p_fuseau) then
    update public.joueurs set fuseau = p_fuseau where user_id = uid and fuseau is distinct from p_fuseau;
  end if;
  v_jour := public.jour_joueur(uid);
  -- Série de jours de jeu d'affilée.
  update public.joueurs
     set serie = case when derniere_visite = v_jour then serie
                      when derniere_visite = v_jour - 1 then serie + 1 else 1 end,
         serie_max = greatest(serie_max, case when derniere_visite = v_jour then serie
                                              when derniere_visite = v_jour - 1 then serie + 1 else 1 end),
         derniere_visite = v_jour
   where user_id = uid returning * into j;
  if not found then raise exception 'joueur_inconnu'; end if;
  perform public.assurer_quetes(uid);
  select json_agg(json_build_object('rang', rang, 'code', code, 'param', param, 'progres', progres,
                                    'objectif', objectif, 'chronos', chronos, 'recuperee', recuperee) order by rang)
    into liste from public.quetes_jour where user_id = uid and jour = v_jour;
  return json_build_object(
    'chronos', j.chronos,
    'quetes', liste,
    'bonus', public.reglage_tirage('bonus_quetes_chronos', 15),
    'bonus_recupere', j.bonus_quetes_jour = v_jour,
    'changement_dispo', j.quete_changee_jour is distinct from v_jour,
    'fin_du_jour', ((v_jour + 1)::timestamp at time zone coalesce(j.fuseau, 'Asia/Jerusalem')),
    'prix_booster', public.reglage_tirage('prix_booster_chronos', 400),
    'serie', j.serie,
    'quiz_restants', greatest(0, public.reglage_tirage('quiz_max_jour', 20)::int
                                 - case when j.quiz_jour = v_jour then j.quiz_nb_jour else 0 end));
end $$;

create or replace function public.recuperer_quete(p_rang int) returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_jour date := public.jour_joueur(auth.uid());
  q public.quetes_jour;
  gain int;
  bonus int := 0;
  total int;
begin
  if uid is null then raise exception 'non_connecte'; end if;
  select * into q from public.quetes_jour where user_id = uid and jour = v_jour and rang = p_rang for update;
  if not found or q.recuperee or q.progres < q.objectif then raise exception 'quete_pas_finie'; end if;
  update public.quetes_jour set recuperee = true where user_id = uid and jour = v_jour and rang = p_rang;
  gain := q.chronos;
  -- Les 3 quêtes récupérées : bonus (une fois par jour).
  if (select count(*) from public.quetes_jour where user_id = uid and jour = v_jour and recuperee) = 3
     and (select bonus_quetes_jour is distinct from v_jour from public.joueurs where user_id = uid) then
    bonus := public.reglage_tirage('bonus_quetes_chronos', 15)::int;
    update public.joueurs set bonus_quetes_jour = v_jour where user_id = uid;
  end if;
  update public.joueurs set chronos = chronos + gain + bonus where user_id = uid returning chronos into total;
  return json_build_object('gain', gain, 'bonus', bonus, 'chronos', total);
end $$;

create or replace function public.changer_quete(p_rang int) returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_jour date := public.jour_joueur(auth.uid());
  q public.quetes_jour;
  t record;
  k record;
  autres text[];
begin
  if uid is null then raise exception 'non_connecte'; end if;
  if (select quete_changee_jour = v_jour from public.joueurs where user_id = uid) then raise exception 'deja_change'; end if;
  select * into q from public.quetes_jour where user_id = uid and jour = v_jour and rang = p_rang for update;
  if not found or q.progres >= q.objectif then raise exception 'quete_pas_changeable'; end if;
  select array_agg(code) into autres from public.quetes_jour where user_id = uid and jour = v_jour;
  select palier into k from public.catalogue_quetes() c where c.code = q.code;
  select * into t from public.tirer_quete(uid, k.palier, autres);
  if t.code is null then raise exception 'pas_d_autre_quete'; end if;
  -- Garder au moins un quiz parmi les 3.
  if q.code in ('quiz1', 'quiz3') and t.code not in ('quiz1', 'quiz3')
     and not exists (select 1 from public.quetes_jour where user_id = uid and jour = v_jour and rang <> p_rang
                       and code in ('quiz1', 'quiz3')) then
    raise exception 'pas_d_autre_quete';
  end if;
  select * into k from public.catalogue_quetes() c where c.code = t.code;
  update public.quetes_jour set code = t.code, param = t.param, progres = 0, objectif = k.objectif, chronos = k.chronos
   where user_id = uid and jour = v_jour and rang = p_rang;
  update public.joueurs set quete_changee_jour = v_jour where user_id = uid;
  return public.mes_quetes(null);
end $$;

-- ---------- Quiz d'histoire ----------
-- Question sur une carte que le joueur possède. Types :
--   region : « Dans quelle région… ? » (4 régions)    epoque : « À quelle époque… ? » (4 époques)
--   dates  : « Quelle carte correspond à ces dates ? » (4 cartes)
-- Le jeu affiche les noms dans la langue du joueur ; seule la bonne réponse reste ici.
create or replace function public.quiz_question() returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_jour date := public.jour_joueur(auth.uid());
  j public.joueurs;
  existante public.quiz_en_cours;
  c public.cartes;
  v_type text;
  choix text[];
  bonne text;
  question jsonb;
begin
  if uid is null then raise exception 'non_connecte'; end if;
  -- Une question déjà posée et pas répondue : la même (on ne peut pas en changer pour en trouver une facile).
  select * into existante from public.quiz_en_cours where user_id = uid;
  if found then return existante.question; end if;

  select * into j from public.joueurs where user_id = uid for update;
  if j.quiz_jour = v_jour and j.quiz_nb_jour >= public.reglage_tirage('quiz_max_jour', 20) then
    raise exception 'quiz_fini_pour_aujourdhui';
  end if;

  select ca.* into c from public.cartes ca
    join (select distinct carte_id from public.collection where user_id = uid) co on co.carte_id = ca.id
   where ca.statut = 'validee' order by random() limit 1;
  if c.id is null then raise exception 'aucune_carte'; end if;

  v_type := (array['region', 'epoque', 'dates'])[1 + floor(random() * 3)::int];
  if v_type = 'dates' and coalesce(c.dates, '') = '' then v_type := 'epoque'; end if;

  if v_type = 'region' then
    bonne := c.region;
    select array_agg(r order by random()) into choix from (
      select bonne as r
      union all
      (select r from unnest(array['europe', 'afrique', 'moyen-orient', 'asie', 'ameriques', 'oceanie']) as r
        where r <> c.region and not (r = any (c.regions_secondaires)) order by random() limit 3)) x;
  elsif v_type = 'epoque' then
    bonne := c.epoque;
    choix := array['antiquite', 'moyen-age', 'temps-modernes', 'epoque-contemporaine'];
  else
    bonne := c.id;
    select array_agg(i order by random()) into choix from (
      select c.id as i
      union all
      (select o.id from public.cartes o
        where o.statut = 'validee' and o.id <> c.id and coalesce(o.dates, '') <> '' and o.dates <> c.dates
        order by (o.gamme = c.gamme) desc, random() limit 3)) x;
  end if;

  question := jsonb_build_object('type', v_type, 'carte', c.id, 'choix', to_jsonb(choix));
  insert into public.quiz_en_cours (user_id, question, reponse) values (uid, question, bonne);
  update public.joueurs
     set quiz_nb_jour = case when quiz_jour = v_jour then quiz_nb_jour + 1 else 1 end,
         quiz_jour = v_jour
   where user_id = uid;
  return question;
end $$;

create or replace function public.quiz_repondre(p_choix text) returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  q public.quiz_en_cours;
  juste boolean;
begin
  if uid is null then raise exception 'non_connecte'; end if;
  delete from public.quiz_en_cours where user_id = uid returning * into q;
  if not found then raise exception 'pas_de_question'; end if;
  juste := p_choix = q.reponse;
  if juste then
    update public.joueurs set quiz_bonnes = quiz_bonnes + 1 where user_id = uid;
    perform public.assurer_quetes(uid);
    perform public.avancer_quetes(uid, array['quiz1', 'quiz3'], 1);
  end if;
  return json_build_object('juste', juste, 'reponse', q.reponse);
end $$;

-- ---------- Succès ----------
-- Progression d'un succès pour un joueur : (progres, objectif). objectif = 0 : succès impossible pour l'instant.
create or replace function public.progres_succes(p_uid uuid, s public.succes)
returns table (progres int, objectif int)
language plpgsql stable security definer set search_path = public as $$
declare
  j public.joueurs;
  p jsonb := s.param;
  v_region text;
  mots text[];
begin
  select * into j from public.joueurs where user_id = p_uid;
  objectif := s.seuil;
  if s.type = 'boosters_ouverts' then
    select count(*) into progres from public.ouvertures where user_id = p_uid;
  elsif s.type = 'booster_dore' then
    select count(*) into progres from public.ouvertures where user_id = p_uid and dore;
  elsif s.type = 'cartes_differentes' then
    select count(distinct carte_id) into progres from public.collection where user_id = p_uid;
  elsif s.type = 'rarete' then
    objectif := 1;
    select count(*) into progres from (select 1 from public.collection co join public.cartes c on c.id = co.carte_id
      where co.user_id = p_uid and c.rarete = p->>'rarete' limit 1) x;
  elsif s.type = 'finition' then
    objectif := 1;
    select count(*) into progres from (select 1 from public.collection
      where user_id = p_uid and finition = p->>'finition' limit 1) x;
  elsif s.type = 'serie' then
    progres := j.serie_max;
  elsif s.type = 'quiz' then
    progres := j.quiz_bonnes;
  elsif s.type = 'ensemble' then
    -- Toutes les cartes validées qui correspondent au filtre (« region »: « joueur » = la région du joueur).
    v_region := case when p->>'region' = 'joueur' then j.region else p->>'region' end;
    if p->>'region' = 'joueur' and v_region is null then objectif := 0; progres := 0; return next; return; end if;
    select array_agg(lower(m)) into mots from jsonb_array_elements_text(coalesce(p->'mots', '[]')) m;
    with cible as (
      select c.id from public.cartes c
       where c.statut = 'validee'
         and (p->>'famille' is null or c.famille = p->>'famille')
         and (p->>'epoque'  is null or c.epoque  = p->>'epoque')
         and (p->>'gamme'   is null or c.gamme   = p->>'gamme')
         and (p->>'rarete'  is null or c.rarete  = p->>'rarete')
         and (p->>'religion' is null or c.religion = p->>'religion')
         and (v_region is null or public.dans_region(c, v_region))
         and (mots is null or exists (select 1 from unnest(mots) m where lower(c.nom) like '%' || m || '%'))
         and (p->'cartes' is null or c.id in (select jsonb_array_elements_text(p->'cartes'))))
    select count(*), count(*) filter (where exists (select 1 from public.collection co
                                                     where co.user_id = p_uid and co.carte_id = cible.id))
      into objectif, progres from cible;
  end if;
  progres := least(progres, greatest(objectif, 0));
  return next;
end $$;

-- Tous les succès du joueur, avec leur progression ; enregistre ceux qui viennent d'être atteints.
create or replace function public.mes_succes() returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.succes;
  pr record;
  liste jsonb := '[]';
  o public.succes_obtenus;
begin
  if uid is null then raise exception 'non_connecte'; end if;
  for s in select * from public.succes where actif order by ordre, id loop
    select * into o from public.succes_obtenus where user_id = uid and succes_id = s.id;
    select * into pr from public.progres_succes(uid, s);
    if o.succes_id is null and pr.objectif > 0 and pr.progres >= pr.objectif then
      insert into public.succes_obtenus (user_id, succes_id) values (uid, s.id) returning * into o;
    end if;
    if pr.objectif = 0 and o.succes_id is null then continue; end if;   -- ensemble vide : caché
    liste := liste || jsonb_build_object('id', s.id, 'nom', s.nom, 'nom_en', s.nom_en, 'nom_he', s.nom_he,
      'type', s.type, 'chronos', s.chronos,
      'progres', case when o.succes_id is not null then greatest(pr.progres, pr.objectif) else pr.progres end,
      'objectif', greatest(pr.objectif, 1),
      'obtenu', o.succes_id is not null, 'recupere', coalesce(o.recupere, false));
  end loop;
  return liste;
end $$;

create or replace function public.recuperer_succes(p_id text) returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  gain int;
  total int;
begin
  if uid is null then raise exception 'non_connecte'; end if;
  update public.succes_obtenus set recupere = true
   where user_id = uid and succes_id = p_id and not recupere;
  if not found then raise exception 'succes_pas_obtenu'; end if;
  select chronos into gain from public.succes where id = p_id;
  update public.joueurs set chronos = chronos + coalesce(gain, 0) where user_id = uid returning chronos into total;
  return json_build_object('gain', gain, 'chronos', total);
end $$;

-- ---------- Boutique : un booster en plus ----------
create or replace function public.acheter_booster() returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prix int := public.reglage_tirage('prix_booster_chronos', 400)::int;
  j public.joueurs;
begin
  if uid is null then raise exception 'non_connecte'; end if;
  update public.joueurs set chronos = chronos - prix, boosters = boosters + 1
   where user_id = uid and chronos >= prix returning * into j;
  if not found then raise exception 'pas_assez_de_chronos'; end if;
  return json_build_object('chronos', j.chronos, 'boosters', j.boosters);
end $$;

-- ---------- Droits : seules les fonctions « joueur » sont appelables depuis le jeu ----------
revoke execute on function public.jour_joueur(uuid), public.tirer_quete(uuid, int, text[]), public.assurer_quetes(uuid),
  public.avancer_quetes(uuid, text[], int, text), public.progres_succes(uuid, public.succes) from public, anon, authenticated;
revoke execute on function public.mes_quetes(text), public.recuperer_quete(int), public.changer_quete(int),
  public.quiz_question(), public.quiz_repondre(text), public.mes_succes(), public.recuperer_succes(text),
  public.acheter_booster() from public, anon;
grant execute on function public.mes_quetes(text), public.recuperer_quete(int), public.changer_quete(int),
  public.quiz_question(), public.quiz_repondre(text), public.mes_succes(), public.recuperer_succes(text),
  public.acheter_booster() to authenticated;

-- ---------- Premiers succès (modifiables ensuite dans l'admin) ----------
insert into public.succes (id, nom, nom_en, nom_he, type, param, seuil, chronos, ordre) values
  ('premier-booster',  'Premier booster',            'First booster',             'בוסטר ראשון',              'boosters_ouverts',   '{}', 1,   50, 10),
  ('boosters-50',      '50 boosters ouverts',        '50 boosters opened',        '50 בוסטרים נפתחו',          'boosters_ouverts',   '{}', 50, 200, 11),
  ('premier-dore',     'Premier booster doré',       'First golden booster',      'בוסטר זהב ראשון',           'booster_dore',       '{}', 1,   50, 12),
  ('cartes-25',        '25 cartes différentes',      '25 different cards',        '25 קלפים שונים',            'cartes_differentes', '{}', 25,  50, 20),
  ('cartes-50',        '50 cartes différentes',      '50 different cards',        '50 קלפים שונים',            'cartes_differentes', '{}', 50, 100, 21),
  ('cartes-100',       '100 cartes différentes',     '100 different cards',       '100 קלפים שונים',           'cartes_differentes', '{}', 100, 200, 22),
  ('cartes-200',       '200 cartes différentes',     '200 different cards',       '200 קלפים שונים',           'cartes_differentes', '{}', 200, 400, 23),
  ('premiere-epique',  'Première carte Épique',      'First Epic card',           'קלף אפי ראשון',             'rarete', '{"rarete":"epique"}',     1,  50, 30),
  ('premiere-legendaire', 'Première carte Légendaire', 'First Legendary card',    'קלף אגדי ראשון',            'rarete', '{"rarete":"legendaire"}', 1, 100, 31),
  ('premiere-mythique', 'Première carte Mythique',   'First Mythic card',         'קלף מיתי ראשון',            'rarete', '{"rarete":"mythique"}',   1, 300, 32),
  ('premiere-emeraude', 'Première Émeraude',         'First Emerald',             'אזמרגד ראשון',              'finition', '{"finition":"emeraude"}', 1, 100, 33),
  ('premier-diamant',  'Premier Diamant',            'First Diamond',             'יהלום ראשון',               'finition', '{"finition":"diamant"}',  1, 300, 34),
  ('serie-7',          '7 jours de suite',           '7 days in a row',           '7 ימים ברצף',               'serie', '{}', 7,  100, 40),
  ('serie-30',         '30 jours de suite',          '30 days in a row',          '30 ימים ברצף',              'serie', '{}', 30, 300, 41),
  ('quiz-10',          '10 bonnes réponses',         '10 correct answers',        '10 תשובות נכונות',          'quiz', '{}', 10,  50, 50),
  ('quiz-50',          '50 bonnes réponses',         '50 correct answers',        '50 תשובות נכונות',          'quiz', '{}', 50, 150, 51),
  ('quiz-200',         '200 bonnes réponses',        '200 correct answers',       '200 תשובות נכונות',         'quiz', '{}', 200, 400, 52),
  ('antiquite-ma-region',      'Antiquité de ma région',       'Antiquity of my region',      'העת העתיקה באזור שלי',        'ensemble', '{"epoque":"antiquite","region":"joueur"}',            1, 300, 60),
  ('moyen-age-ma-region',      'Moyen Âge de ma région',       'Middle Ages of my region',    'ימי הביניים באזור שלי',       'ensemble', '{"epoque":"moyen-age","region":"joueur"}',            1, 300, 61),
  ('temps-modernes-ma-region', 'Temps modernes de ma région',  'Early Modern of my region',   'העת החדשה המוקדמת באזור שלי', 'ensemble', '{"epoque":"temps-modernes","region":"joueur"}',       1, 300, 62),
  ('contemporaine-ma-region',  'Époque contemporaine de ma région', 'Modern Era of my region', 'העת החדשה באזור שלי',     'ensemble', '{"epoque":"epoque-contemporaine","region":"joueur"}', 1, 300, 63),
  ('mendiants',     'Tous les mendiants',      'All the beggars',        'כל הקבצנים',          'ensemble', '{"mots":["mendiant"]}',  1, 150, 80),
  ('courtisanes',   'Toutes les courtisanes',  'All the courtesans',     'כל הקורטיזנות',        'ensemble', '{"mots":["courtisane"]}', 1, 100, 81),
  ('archers',       'Tous les archers',        'All the archers',        'כל הקשתים',           'ensemble', '{"mots":["archer"]}',    1, 100, 82),
  ('pecheurs',      'Tous les pêcheurs',       'All the fishermen',      'כל הדייגים',          'ensemble', '{"mots":["pêcheur"]}',   1, 100, 83),
  ('assyriens',     'L''armée assyrienne',     'The Assyrian army',      'הצבא האשורי',         'ensemble', '{"mots":["assyrien"]}',  1, 150, 84),
  ('ottomans',      'Le monde ottoman',        'The Ottoman world',      'העולם העות''מאני',     'ensemble', '{"mots":["ottoman"]}',   1, 150, 85),
  ('byzantins',     'Le monde byzantin',       'The Byzantine world',    'העולם הביזנטי',        'ensemble', '{"mots":["byzantin"]}',  1, 150, 86),
  ('abbassides',    'La cour abbasside',       'The Abbasid court',      'החצר העבאסית',        'ensemble', '{"mots":["abbasside"]}', 1, 100, 87),
  ('sumeriens',     'Les Sumériens',           'The Sumerians',          'השומרים',             'ensemble', '{"mots":["sumérien"]}',  1, 100, 88),
  ('croises',       'Les croisés',             'The Crusaders',          'הצלבנים',             'ensemble', '{"mots":["croisé","templier"]}', 1, 100, 89),
  ('babylone',      'Splendeurs de Babylone',  'Splendours of Babylon',  'פאר בבל',             'ensemble', '{"mots":["babylone","ishtar","etemenanki"]}', 1, 150, 90),
  ('foi-juive',     'Figures du judaïsme',     'Figures of Judaism',     'דמויות היהדות',        'ensemble', '{"religion":"judaisme"}',      1, 300, 95),
  ('foi-chretienne','Figures du christianisme','Figures of Christianity','דמויות הנצרות',        'ensemble', '{"religion":"christianisme"}', 1, 150, 96),
  ('foi-musulmane', 'Figures de l''islam',     'Figures of Islam',       'דמויות האסלאם',        'ensemble', '{"religion":"islam"}',         1, 300, 97)
on conflict (id) do nothing;

-- Un succès par famille de personnages : « Famille complète ».
insert into public.succes (id, nom, nom_en, nom_he, type, param, seuil, chronos, ordre)
select 'famille-' || f.id, left(f.nom, 60), left(coalesce(f.nom_en, f.nom), 60), left(coalesce(f.nom_he, f.nom_en, f.nom), 60),
       'ensemble', jsonb_build_object('famille', f.id), 1, 200, 70 + f.ordre
  from public.familles f
on conflict (id) do nothing;
