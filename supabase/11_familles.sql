-- =============================================================
--  CHRONOLEGENDS — 11. Familles de personnages historiques
--  Des « collections dans la collection » qui traversent toutes les
--  époques et toutes les régions : Conquérants, Sages, Bâtisseurs…
--  Chaque personnage historique appartient à UNE famille (ou aucune),
--  signalée par un emblème dans le coin de l'illustration.
--  La liste des familles se gère dans l'admin (bouton « Familles »).
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger
--  (les familles et le classement déjà modifiés dans l'admin
--  ne sont PAS écrasés).
-- =============================================================

create table if not exists public.familles (
  id      text primary key check (id ~ '^[a-z0-9-]+$'),
  nom     text not null check (char_length(nom) between 1 and 40),
  nom_en  text check (char_length(nom_en) <= 40),
  nom_he  text check (char_length(nom_he) <= 40),
  embleme text not null default 'etoile',
  ordre   integer not null default 0
);

alter table public.familles enable row level security;

drop policy if exists "Tout le monde peut lire les familles" on public.familles;
create policy "Tout le monde peut lire les familles" on public.familles
  for select to anon, authenticated using (true);
drop policy if exists "Seul l'admin ajoute une famille" on public.familles;
create policy "Seul l'admin ajoute une famille" on public.familles
  for insert to authenticated with check (public.est_admin());
drop policy if exists "Seul l'admin modifie une famille" on public.familles;
create policy "Seul l'admin modifie une famille" on public.familles
  for update to authenticated using (public.est_admin()) with check (public.est_admin());
drop policy if exists "Seul l'admin supprime une famille" on public.familles;
create policy "Seul l'admin supprime une famille" on public.familles
  for delete to authenticated using (public.est_admin());

grant select on public.familles to anon, authenticated;
grant insert, update, delete on public.familles to authenticated;

-- Famille de chaque carte (supprimer une famille laisse ses cartes « sans famille »).
alter table public.cartes add column if not exists famille text
  references public.familles (id) on update cascade on delete set null;

-- ---------- Les familles de départ ----------

insert into public.familles (id, nom, nom_en, nom_he, embleme, ordre) values
  ('conquerants',  'Conquérants',               'Conquerors',              'כובשים',             'epees',     1),
  ('souverains',   'Souverains et législateurs', 'Rulers and Lawgivers',    'שליטים ומחוקקים',    'couronne',  2),
  ('sages',        'Sages et philosophes',       'Sages and Philosophers',  'חכמים ופילוסופים',   'parchemin', 3),
  ('savants',      'Savants et inventeurs',      'Scholars and Inventors',  'מדענים וממציאים',    'lunette',   4),
  ('batisseurs',   'Bâtisseurs',                 'Builders',                'בונים',              'colonne',   5),
  ('spirituels',   'Guides spirituels',          'Spiritual Leaders',       'מנהיגים רוחניים',    'flamme',    6),
  ('rebelles',     'Rebelles et résistants',     'Rebels and Resisters',    'מורדים ולוחמי חירות', 'chaine',    7),
  ('explorateurs', 'Explorateurs et voyageurs',  'Explorers and Travellers', 'חוקרים ונוסעים',    'boussole',  8),
  ('lettres',      'Écrivains et historiens',    'Writers and Historians',  'סופרים והיסטוריונים', 'plume',     9),
  ('dictateurs',   'Dictateurs',                 'Dictators',               'רודנים',             'bouclier', 10)
on conflict (id) do nothing;

-- ---------- Classement proposé des personnages (seulement s'ils n'ont pas encore de famille) ----------

update public.cartes c set famille = v.famille
  from (values
    ('alexandre', 'conquerants'), ('cesar', 'conquerants'), ('cyrus-ii', 'conquerants'),
    ('chandragupta', 'conquerants'), ('hannibal', 'conquerants'), ('piye', 'conquerants'),
    ('qin-shi-huang', 'conquerants'), ('saladin', 'conquerants'), ('siyaj-kak', 'conquerants'),

    ('ashoka', 'souverains'), ('cleopatre', 'souverains'), ('darius-ier', 'souverains'),
    ('ezana', 'souverains'), ('hammurabi', 'souverains'), ('haroun-al-rachid', 'souverains'),
    ('kanishka', 'souverains'), ('pericles', 'souverains'), ('roi-david', 'souverains'),
    ('yax-kuk-mo', 'souverains'),

    ('aristote', 'sages'), ('averroes-ibn-rushd', 'sages'), ('confucius', 'sages'), ('sun-tzu', 'sages'),

    ('archimede', 'savants'), ('hypatie', 'savants'), ('ibn-sina', 'savants'), ('thales', 'savants'),

    ('imhotep', 'batisseurs'), ('hatchepsout', 'batisseurs'), ('herode-le-grand', 'batisseurs'),
    ('nabuchodonosor', 'batisseurs'), ('ramses-ii', 'batisseurs'),

    ('bouddha', 'spirituels'), ('hillel-l-ancient', 'spirituels'), ('rabbi-akiva', 'spirituels'),

    ('boudicca', 'rebelles'), ('jeanne-d-arc', 'rebelles'), ('judas-maccabee', 'rebelles'),
    ('spartacus', 'rebelles'), ('vercingetorix', 'rebelles'), ('zenobie', 'rebelles'),

    ('pytheas', 'explorateurs'), ('zhang-qian', 'explorateurs'),

    ('ban-zhao', 'lettres'), ('herodote', 'lettres'), ('sappho', 'lettres')
  ) as v(id, famille)
 where c.id = v.id and c.famille is null and c.gamme = 'personnage';

-- ---------- Vérification : nombre de personnages par famille ----------
select f.nom, count(c.id) as personnages
  from public.familles f left join public.cartes c on c.famille = f.id
 group by f.nom, f.ordre order by f.ordre;
