-- =============================================================
--  CHRONOLEGENDS — 22. Régions secondaires des personnages
--  Les personnages qui ont vécu, régné ou combattu dans plusieurs
--  régions peuvent aussi sortir dans les boosters de ces régions
--  (colonne créée par 21_plusieurs_regions.sql).
--  La région principale (écrite sur la carte) ne change pas.
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

update public.cartes as c set regions_secondaires = v.regions
from (values
  ('alexandre',          array['europe', 'afrique', 'asie']),
  ('cesar',              array['afrique', 'moyen-orient']),
  ('cleopatre',          array['europe']),
  ('hannibal',           array['europe', 'moyen-orient']),
  ('darius-ier',         array['afrique', 'europe', 'asie']),
  ('ramses-ii',          array['moyen-orient']),
  ('saladin',            array['afrique']),
  ('mehmed-ii',          array['europe']),
  ('zenobie',            array['afrique', 'europe']),
  ('averroes-ibn-rushd', array['afrique']),
  ('djalal-ad-din-rumi', array['asie']),
  ('al-khwarizmi',       array['asie']),
  ('ibn-sina',           array['asie']),
  ('cyrus-ii',           array['asie'])
) as v(id, regions)
where c.id = v.id;

-- Vérification : la liste des cartes concernées et leurs régions.
select id, nom, region, regions_secondaires
  from public.cartes
 where cardinality(regions_secondaires) > 0
 order by region, nom;
