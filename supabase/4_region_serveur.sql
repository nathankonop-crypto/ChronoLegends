-- =============================================================
--  CHRONOLEGENDS — La région du joueur est décidée par le SERVEUR
--  À coller UNE FOIS dans Supabase : SQL Editor → New query → Run.
--
--  Chaque requête arrive chez Supabase via Cloudflare, qui ajoute
--  l'en-tête « cf-ipcountry » : le pays de l'adresse IP du visiteur.
--  Testé le 14/10/2026 : un visiteur qui envoie un faux pays ou une
--  fausse IP est ignoré, Cloudflare remplace la valeur par la vraie.
--  Le téléphone n'annonce donc plus sa région : la base la lit elle-même.
-- =============================================================

-- Le diagnostic temporaire n'est plus utile.
drop function if exists public.diag_entetes();

-- ---------- Pays → région du jeu ----------
create table if not exists public.pays_regions (
  code   text primary key,          -- code ISO à 2 lettres, ex. « IL »
  region text not null check (region in ('europe', 'afrique', 'moyen-orient', 'asie', 'ameriques', 'oceanie')),
  nom    text not null
);
alter table public.pays_regions enable row level security;   -- aucune règle : réservé aux fonctions du serveur
revoke all on public.pays_regions from anon, authenticated;

-- 245 pays (source : liste « countries-list » 3.1.1). Ajustements du jeu :
-- Turquie, Chypre et pays du Proche/Moyen-Orient → moyen-orient ; Russie → europe ;
-- Égypte → afrique (comme les cartes égyptiennes). Antarctique : aucune région.
insert into public.pays_regions (code, region, nom) values
  ('AD', 'europe', 'Andorra'),
  ('AE', 'moyen-orient', 'United Arab Emirates'),
  ('AF', 'asie', 'Afghanistan'),
  ('AG', 'ameriques', 'Antigua and Barbuda'),
  ('AI', 'ameriques', 'Anguilla'),
  ('AL', 'europe', 'Albania'),
  ('AM', 'asie', 'Armenia'),
  ('AO', 'afrique', 'Angola'),
  ('AR', 'ameriques', 'Argentina'),
  ('AS', 'oceanie', 'American Samoa'),
  ('AT', 'europe', 'Austria'),
  ('AU', 'oceanie', 'Australia'),
  ('AW', 'ameriques', 'Aruba'),
  ('AX', 'europe', 'Aland'),
  ('AZ', 'asie', 'Azerbaijan'),
  ('BA', 'europe', 'Bosnia and Herzegovina'),
  ('BB', 'ameriques', 'Barbados'),
  ('BD', 'asie', 'Bangladesh'),
  ('BE', 'europe', 'Belgium'),
  ('BF', 'afrique', 'Burkina Faso'),
  ('BG', 'europe', 'Bulgaria'),
  ('BH', 'moyen-orient', 'Bahrain'),
  ('BI', 'afrique', 'Burundi'),
  ('BJ', 'afrique', 'Benin'),
  ('BL', 'ameriques', 'Saint Barthelemy'),
  ('BM', 'ameriques', 'Bermuda'),
  ('BN', 'asie', 'Brunei'),
  ('BO', 'ameriques', 'Bolivia'),
  ('BQ', 'ameriques', 'Bonaire'),
  ('BR', 'ameriques', 'Brazil'),
  ('BS', 'ameriques', 'Bahamas'),
  ('BT', 'asie', 'Bhutan'),
  ('BW', 'afrique', 'Botswana'),
  ('BY', 'europe', 'Belarus'),
  ('BZ', 'ameriques', 'Belize'),
  ('CA', 'ameriques', 'Canada'),
  ('CC', 'asie', 'Cocos (Keeling) Islands'),
  ('CD', 'afrique', 'Democratic Republic of the Congo'),
  ('CF', 'afrique', 'Central African Republic'),
  ('CG', 'afrique', 'Republic of the Congo'),
  ('CH', 'europe', 'Switzerland'),
  ('CI', 'afrique', 'Ivory Coast'),
  ('CK', 'oceanie', 'Cook Islands'),
  ('CL', 'ameriques', 'Chile'),
  ('CM', 'afrique', 'Cameroon'),
  ('CN', 'asie', 'China'),
  ('CO', 'ameriques', 'Colombia'),
  ('CR', 'ameriques', 'Costa Rica'),
  ('CU', 'ameriques', 'Cuba'),
  ('CV', 'afrique', 'Cape Verde'),
  ('CW', 'ameriques', 'Curacao'),
  ('CX', 'asie', 'Christmas Island'),
  ('CY', 'moyen-orient', 'Cyprus'),
  ('CZ', 'europe', 'Czech Republic'),
  ('DE', 'europe', 'Germany'),
  ('DJ', 'afrique', 'Djibouti'),
  ('DK', 'europe', 'Denmark'),
  ('DM', 'ameriques', 'Dominica'),
  ('DO', 'ameriques', 'Dominican Republic'),
  ('DZ', 'afrique', 'Algeria'),
  ('EC', 'ameriques', 'Ecuador'),
  ('EE', 'europe', 'Estonia'),
  ('EG', 'afrique', 'Egypt'),
  ('EH', 'afrique', 'Western Sahara'),
  ('ER', 'afrique', 'Eritrea'),
  ('ES', 'europe', 'Spain'),
  ('ET', 'afrique', 'Ethiopia'),
  ('FI', 'europe', 'Finland'),
  ('FJ', 'oceanie', 'Fiji'),
  ('FK', 'ameriques', 'Falkland Islands'),
  ('FM', 'oceanie', 'Micronesia'),
  ('FO', 'europe', 'Faroe Islands'),
  ('FR', 'europe', 'France'),
  ('GA', 'afrique', 'Gabon'),
  ('GB', 'europe', 'United Kingdom'),
  ('GD', 'ameriques', 'Grenada'),
  ('GE', 'asie', 'Georgia'),
  ('GF', 'ameriques', 'French Guiana'),
  ('GG', 'europe', 'Guernsey'),
  ('GH', 'afrique', 'Ghana'),
  ('GI', 'europe', 'Gibraltar'),
  ('GL', 'ameriques', 'Greenland'),
  ('GM', 'afrique', 'Gambia'),
  ('GN', 'afrique', 'Guinea'),
  ('GP', 'ameriques', 'Guadeloupe'),
  ('GQ', 'afrique', 'Equatorial Guinea'),
  ('GR', 'europe', 'Greece'),
  ('GT', 'ameriques', 'Guatemala'),
  ('GU', 'oceanie', 'Guam'),
  ('GW', 'afrique', 'Guinea-Bissau'),
  ('GY', 'ameriques', 'Guyana'),
  ('HK', 'asie', 'Hong Kong'),
  ('HN', 'ameriques', 'Honduras'),
  ('HR', 'europe', 'Croatia'),
  ('HT', 'ameriques', 'Haiti'),
  ('HU', 'europe', 'Hungary'),
  ('ID', 'asie', 'Indonesia'),
  ('IE', 'europe', 'Ireland'),
  ('IL', 'moyen-orient', 'Israel'),
  ('IM', 'europe', 'Isle of Man'),
  ('IN', 'asie', 'India'),
  ('IO', 'asie', 'British Indian Ocean Territory'),
  ('IQ', 'moyen-orient', 'Iraq'),
  ('IR', 'moyen-orient', 'Iran'),
  ('IS', 'europe', 'Iceland'),
  ('IT', 'europe', 'Italy'),
  ('JE', 'europe', 'Jersey'),
  ('JM', 'ameriques', 'Jamaica'),
  ('JO', 'moyen-orient', 'Jordan'),
  ('JP', 'asie', 'Japan'),
  ('KE', 'afrique', 'Kenya'),
  ('KG', 'asie', 'Kyrgyzstan'),
  ('KH', 'asie', 'Cambodia'),
  ('KI', 'oceanie', 'Kiribati'),
  ('KM', 'afrique', 'Comoros'),
  ('KN', 'ameriques', 'Saint Kitts and Nevis'),
  ('KP', 'asie', 'North Korea'),
  ('KR', 'asie', 'South Korea'),
  ('KW', 'moyen-orient', 'Kuwait'),
  ('KY', 'ameriques', 'Cayman Islands'),
  ('KZ', 'asie', 'Kazakhstan'),
  ('LA', 'asie', 'Laos'),
  ('LB', 'moyen-orient', 'Lebanon'),
  ('LC', 'ameriques', 'Saint Lucia'),
  ('LI', 'europe', 'Liechtenstein'),
  ('LK', 'asie', 'Sri Lanka'),
  ('LR', 'afrique', 'Liberia'),
  ('LS', 'afrique', 'Lesotho'),
  ('LT', 'europe', 'Lithuania'),
  ('LU', 'europe', 'Luxembourg'),
  ('LV', 'europe', 'Latvia'),
  ('LY', 'afrique', 'Libya'),
  ('MA', 'afrique', 'Morocco'),
  ('MC', 'europe', 'Monaco'),
  ('MD', 'europe', 'Moldova'),
  ('ME', 'europe', 'Montenegro'),
  ('MF', 'ameriques', 'Saint Martin'),
  ('MG', 'afrique', 'Madagascar'),
  ('MH', 'oceanie', 'Marshall Islands'),
  ('MK', 'europe', 'North Macedonia'),
  ('ML', 'afrique', 'Mali'),
  ('MM', 'asie', 'Myanmar (Burma)'),
  ('MN', 'asie', 'Mongolia'),
  ('MO', 'asie', 'Macao'),
  ('MP', 'oceanie', 'Northern Mariana Islands'),
  ('MQ', 'ameriques', 'Martinique'),
  ('MR', 'afrique', 'Mauritania'),
  ('MS', 'ameriques', 'Montserrat'),
  ('MT', 'europe', 'Malta'),
  ('MU', 'afrique', 'Mauritius'),
  ('MV', 'asie', 'Maldives'),
  ('MW', 'afrique', 'Malawi'),
  ('MX', 'ameriques', 'Mexico'),
  ('MY', 'asie', 'Malaysia'),
  ('MZ', 'afrique', 'Mozambique'),
  ('NA', 'afrique', 'Namibia'),
  ('NC', 'oceanie', 'New Caledonia'),
  ('NE', 'afrique', 'Niger'),
  ('NF', 'oceanie', 'Norfolk Island'),
  ('NG', 'afrique', 'Nigeria'),
  ('NI', 'ameriques', 'Nicaragua'),
  ('NL', 'europe', 'Netherlands'),
  ('NO', 'europe', 'Norway'),
  ('NP', 'asie', 'Nepal'),
  ('NR', 'oceanie', 'Nauru'),
  ('NU', 'oceanie', 'Niue'),
  ('NZ', 'oceanie', 'New Zealand'),
  ('OM', 'moyen-orient', 'Oman'),
  ('PA', 'ameriques', 'Panama'),
  ('PE', 'ameriques', 'Peru'),
  ('PF', 'oceanie', 'French Polynesia'),
  ('PG', 'oceanie', 'Papua New Guinea'),
  ('PH', 'asie', 'Philippines'),
  ('PK', 'asie', 'Pakistan'),
  ('PL', 'europe', 'Poland'),
  ('PM', 'ameriques', 'Saint Pierre and Miquelon'),
  ('PN', 'oceanie', 'Pitcairn Islands'),
  ('PR', 'ameriques', 'Puerto Rico'),
  ('PS', 'moyen-orient', 'Palestine'),
  ('PT', 'europe', 'Portugal'),
  ('PW', 'oceanie', 'Palau'),
  ('PY', 'ameriques', 'Paraguay'),
  ('QA', 'moyen-orient', 'Qatar'),
  ('RE', 'afrique', 'Reunion'),
  ('RO', 'europe', 'Romania'),
  ('RS', 'europe', 'Serbia'),
  ('RU', 'europe', 'Russia'),
  ('RW', 'afrique', 'Rwanda'),
  ('SA', 'moyen-orient', 'Saudi Arabia'),
  ('SB', 'oceanie', 'Solomon Islands'),
  ('SC', 'afrique', 'Seychelles'),
  ('SD', 'afrique', 'Sudan'),
  ('SE', 'europe', 'Sweden'),
  ('SG', 'asie', 'Singapore'),
  ('SH', 'afrique', 'Saint Helena'),
  ('SI', 'europe', 'Slovenia'),
  ('SJ', 'europe', 'Svalbard and Jan Mayen'),
  ('SK', 'europe', 'Slovakia'),
  ('SL', 'afrique', 'Sierra Leone'),
  ('SM', 'europe', 'San Marino'),
  ('SN', 'afrique', 'Senegal'),
  ('SO', 'afrique', 'Somalia'),
  ('SR', 'ameriques', 'Suriname'),
  ('SS', 'afrique', 'South Sudan'),
  ('ST', 'afrique', 'Sao Tome and Principe'),
  ('SV', 'ameriques', 'El Salvador'),
  ('SX', 'ameriques', 'Sint Maarten'),
  ('SY', 'moyen-orient', 'Syria'),
  ('SZ', 'afrique', 'Eswatini'),
  ('TC', 'ameriques', 'Turks and Caicos Islands'),
  ('TD', 'afrique', 'Chad'),
  ('TG', 'afrique', 'Togo'),
  ('TH', 'asie', 'Thailand'),
  ('TJ', 'asie', 'Tajikistan'),
  ('TK', 'oceanie', 'Tokelau'),
  ('TL', 'oceanie', 'East Timor'),
  ('TM', 'asie', 'Turkmenistan'),
  ('TN', 'afrique', 'Tunisia'),
  ('TO', 'oceanie', 'Tonga'),
  ('TR', 'moyen-orient', 'Turkey'),
  ('TT', 'ameriques', 'Trinidad and Tobago'),
  ('TV', 'oceanie', 'Tuvalu'),
  ('TW', 'asie', 'Taiwan'),
  ('TZ', 'afrique', 'Tanzania'),
  ('UA', 'europe', 'Ukraine'),
  ('UG', 'afrique', 'Uganda'),
  ('UM', 'oceanie', 'U.S. Minor Outlying Islands'),
  ('US', 'ameriques', 'United States'),
  ('UY', 'ameriques', 'Uruguay'),
  ('UZ', 'asie', 'Uzbekistan'),
  ('VA', 'europe', 'Vatican City'),
  ('VC', 'ameriques', 'Saint Vincent and the Grenadines'),
  ('VE', 'ameriques', 'Venezuela'),
  ('VG', 'ameriques', 'British Virgin Islands'),
  ('VI', 'ameriques', 'U.S. Virgin Islands'),
  ('VN', 'asie', 'Vietnam'),
  ('VU', 'oceanie', 'Vanuatu'),
  ('WF', 'oceanie', 'Wallis and Futuna'),
  ('WS', 'oceanie', 'Samoa'),
  ('XK', 'europe', 'Kosovo'),
  ('YE', 'moyen-orient', 'Yemen'),
  ('YT', 'afrique', 'Mayotte'),
  ('ZA', 'afrique', 'South Africa'),
  ('ZM', 'afrique', 'Zambia'),
  ('ZW', 'afrique', 'Zimbabwe')
on conflict (code) do update set region = excluded.region, nom = excluded.nom;

-- ---------- Le joueur garde son dernier pays / sa dernière région connus ----------
alter table public.joueurs add column if not exists pays   text;
alter table public.joueurs add column if not exists region text;

-- Pays de la requête en cours, tel que donné par Cloudflare (null si inconnu).
create or replace function public.pays_de_la_requete() returns text
language sql stable set search_path = public as $$
  select nullif(upper(current_setting('request.headers', true)::json ->> 'cf-ipcountry'), '');
$$;

-- Met à jour le pays et la région du joueur d'après son adresse IP.
-- Pays inconnu (ex. réseau Tor, « XX ») : on garde la dernière région connue.
create or replace function public.localiser_joueur(p_uid uuid) returns public.joueurs
language plpgsql security definer set search_path = public as $$
declare
  v_pays   text := public.pays_de_la_requete();
  v_region text;
  j        public.joueurs;
begin
  select region into v_region from public.pays_regions where code = v_pays;
  if v_region is not null then
    update public.joueurs set pays = v_pays, region = v_region
     where user_id = p_uid
    returning * into j;
  else
    select * into j from public.joueurs where user_id = p_uid;
  end if;
  return j;
end $$;

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
    'region', j.region
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

  return json_build_object('cartes', resultat, 'boosters', j.boosters, 'region', v_region);
end $$;

-- Ancienne version (le téléphone envoyait sa région) : gardée le temps que les
-- navigateurs chargent le nouveau jeu, mais la région envoyée est IGNORÉE.
create or replace function public.ouvrir_booster(p_region text) returns json
language sql security definer set search_path = public as $$
  select public.ouvrir_booster();
$$;

-- ---------- Qui peut appeler quoi ----------
revoke execute on function public.pays_de_la_requete() from public, anon, authenticated;
revoke execute on function public.localiser_joueur(uuid) from public, anon, authenticated;
revoke execute on function public.ouvrir_booster() from public, anon;
grant execute on function public.ouvrir_booster() to authenticated;
