-- =============================================================
--  CHRONOLEGENDS — 8. Nouvelle gamme « Objet »
--  Autorise la gamme « objet » pour les cartes (symbole O sur la carte).
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

-- On retire l'ancienne liste des gammes autorisées…
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.cartes'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%gamme%'
  loop
    execute format('alter table public.cartes drop constraint %I', r.conname);
  end loop;
end $$;

-- …et on la remet avec « objet » en plus.
alter table public.cartes add constraint cartes_gamme_check
  check (gamme in ('personnage', 'archetype', 'evenement', 'lieu', 'mythologie', 'objet'));
