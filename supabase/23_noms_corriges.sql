-- =============================================================
--  CHRONOLEGENDS — 23. Noms de cartes corrigés
--  Majuscules, accents et fautes de frappe (règle française :
--  majuscule au premier mot seulement ; les adjectifs de peuple,
--  « assyrien », « romain »…, en minuscule).
--  Seuls les noms affichés changent : les identifiants (id) restent
--  les mêmes, les collections des joueurs ne bougent pas.
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

update public.cartes as c set nom = v.nom
from (values
  ('archer-assyrien',         'Archer assyrien'),
  ('archer-syrien',           'Archer syrien'),
  ('azap-ottoman',            'Azap ottoman'),
  ('batisseur-de-ziggourat',  'Bâtisseur de ziggourat'),
  ('berger-de-judee',         'Berger de Judée'),
  ('cavalier-arabe',          'Cavalier arabe'),
  ('centurion-romain',        'Centurion romain'),
  ('cesaree-maritime',        'Césarée maritime'),
  ('chevalier-croise',        'Chevalier croisé'),
  ('chevalier-templier',      'Chevalier templier'),
  ('code-d-hammurabi',        'Code d''Hammurabi'),
  ('frondeur-assyrien',       'Frondeur assyrien'),
  ('garde-royal-assyrien',    'Garde royal assyrien'),
  ('guerrier-hoplite',        'Guerrier hoplite'),
  ('haroun-al-rachid',        'Haroun al-Rachid'),
  ('hezekiah',                'Ézéchias'),
  ('hillel-l-ancient',        'Hillel l''Ancien'),
  ('lancier-assyrien',        'Lancier assyrien'),
  ('legionnaire-romain',      'Légionnaire romain'),
  ('mendiant-de-jerusalem',   'Mendiant de Jérusalem'),
  ('ouvriere-du-pressoir',    'Ouvrière du pressoir'),
  ('paysanne-sumerienne',     'Paysanne sumérienne'),
  ('porte-etndard-abbasside', 'Porte-étendard abbasside'),
  ('pretre-de-mardouk',       'Prêtre de Mardouk'),
  ('prostituee-de-cesaree',   'Prostituée de Césarée'),
  ('signifer-romain',         'Signifer romain'),
  ('sipahi-ottoman',          'Sipahi ottoman'),
  ('sparabara-perse',         'Sparabara perse'),
  ('zelote',                  'Zélote'),
  ('averroes-ibn-rushd',      'Averroès (Ibn Rushd)'),
  ('ziggurat-etemenanki',     'Ziggourat Etemenanki')
) as v(id, nom)
where c.id = v.id;

-- Noms anglais : majuscule à chaque mot, comme les autres cartes.
update public.cartes as c set nom_en = v.nom_en
from (values
  ('lancier-assyrien', 'Assyrian Spearman'),
  ('signifer-romain',  'Roman Signifer'),
  ('sipahi-ottoman',   'Ottoman Sipahi')
) as v(id, nom_en)
where c.id = v.id;

-- Vérification : les noms après correction.
select id, nom, nom_en from public.cartes
 where id in ('archer-assyrien', 'archer-syrien', 'azap-ottoman', 'batisseur-de-ziggourat', 'berger-de-judee',
   'cavalier-arabe', 'centurion-romain', 'cesaree-maritime', 'chevalier-croise', 'chevalier-templier',
   'code-d-hammurabi', 'frondeur-assyrien', 'garde-royal-assyrien', 'guerrier-hoplite', 'haroun-al-rachid',
   'hezekiah', 'hillel-l-ancient', 'lancier-assyrien', 'legionnaire-romain', 'mendiant-de-jerusalem',
   'ouvriere-du-pressoir', 'paysanne-sumerienne', 'porte-etndard-abbasside', 'pretre-de-mardouk',
   'prostituee-de-cesaree', 'signifer-romain', 'sipahi-ottoman', 'sparabara-perse', 'zelote',
   'averroes-ibn-rushd', 'ziggurat-etemenanki')
 order by nom;
