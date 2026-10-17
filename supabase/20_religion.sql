-- =============================================================
--  CHRONOLEGENDS — 20. Religion des personnages historiques
--  Un petit symbole en bas de la carte, à côté du rond du type (P) :
--  croix (christianisme), étoile de David (judaïsme),
--  croissant et étoile (islam). Vide = pas de symbole.
--  Se choisit dans l'admin (fiche de la carte, personnages seulement).
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

alter table public.cartes add column if not exists religion text;

alter table public.cartes drop constraint if exists cartes_religion_check;
alter table public.cartes add constraint cartes_religion_check
  check (religion in ('christianisme', 'judaisme', 'islam'));

-- Personnages déjà dans le jeu (seulement ceux qui n'ont pas encore de religion).
update public.cartes set religion = 'judaisme' where religion is null and id in (
  'roi-david', 'omri', 'achab', 'jehu', 'ozias', 'ahaz', 'hezekiah', 'manasse', 'josias', 'jehoiachin',
  'judas-maccabee', 'herode-le-grand', 'hillel-l-ancient', 'rabbi-akiva', 'bar-kokhba'
);
update public.cartes set religion = 'christianisme' where religion is null and id in (
  'ezana', 'theodora', 'jeanne-d-arc'
);
update public.cartes set religion = 'islam' where religion is null and id in (
  'haroun-al-rachid', 'zubaida-bint-ja-far', 'al-khwarizmi', 'ibn-sina', 'averroes-ibn-rushd',
  'saladin', 'djalal-ad-din-rumi', 'mehmed-ii'
);
