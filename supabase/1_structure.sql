-- =============================================================
--  CHRONOLEGENDS — Structure de la base de données (Supabase)
--  À coller UNE FOIS dans Supabase : SQL Editor → New query → Run.
--  Ce fichier ne contient aucun secret : il peut être public.
-- =============================================================

-- ---------- La table des cartes ----------
-- Chaque ligne = une carte. Les « check » refusent toute valeur inconnue
-- (ex. une rareté mal orthographiée), directement dans la base.
create table if not exists public.cartes (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),   -- ex. "jeanne-d-arc"
  nom         text not null,
  gamme       text not null default 'personnage'
              check (gamme in ('personnage', 'archetype', 'evenement', 'lieu', 'mythologie', 'objet')),
  dates       text not null default '',
  lieu        text not null default '',
  region      text not null
              check (region in ('europe', 'afrique', 'moyen-orient', 'asie', 'ameriques', 'oceanie')),
  epoque      text not null
              check (epoque in ('antiquite', 'moyen-age', 'temps-modernes', 'epoque-contemporaine')),
  rarete      text not null
              check (rarete in ('ordinaire', 'notable', 'rare', 'epique', 'legendaire', 'mythique')),
  finition    text not null default 'normale'
              check (finition in ('normale', 'doree', 'animee')),
  description text not null default '',
  image       text,                          -- chemin ou adresse de l'illustration (vide = provisoire)
  ordre       integer not null default 0,    -- position dans l'époque : sert à calculer le N° (ex. 08/41)
  cree_le     timestamptz not null default now(),
  modifie_le  timestamptz not null default now()
);

-- Met à jour « modifie_le » automatiquement à chaque modification.
create or replace function public.maj_modifie_le() returns trigger
language plpgsql set search_path = public as $$
begin
  new.modifie_le = now();
  return new;
end $$;

drop trigger if exists cartes_modifie_le on public.cartes;
create trigger cartes_modifie_le before update on public.cartes
  for each row execute function public.maj_modifie_le();

-- ---------- Qui est administrateur ? ----------
-- Liste des comptes autorisés à écrire. Personne ne peut la lire ni la
-- modifier depuis le site : seulement toi, depuis le tableau de bord Supabase.
create table if not exists public.administrateurs (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.administrateurs where user_id = auth.uid());
$$;

-- ---------- Règles de sécurité (vérifiées par le serveur) ----------
-- Row Level Security : la base refuse elle-même toute écriture qui ne vient
-- pas d'un administrateur connecté, même si quelqu'un contourne le site.
alter table public.cartes          enable row level security;
alter table public.administrateurs enable row level security;   -- aucune règle = aucun accès

drop policy if exists "Tout le monde peut lire les cartes" on public.cartes;
create policy "Tout le monde peut lire les cartes" on public.cartes
  for select to anon, authenticated using (true);

drop policy if exists "Seul l'admin ajoute" on public.cartes;
create policy "Seul l'admin ajoute" on public.cartes
  for insert to authenticated with check (public.est_admin());

drop policy if exists "Seul l'admin modifie" on public.cartes;
create policy "Seul l'admin modifie" on public.cartes
  for update to authenticated using (public.est_admin()) with check (public.est_admin());

drop policy if exists "Seul l'admin supprime" on public.cartes;
create policy "Seul l'admin supprime" on public.cartes
  for delete to authenticated using (public.est_admin());

grant select on public.cartes to anon, authenticated;
grant insert, update, delete on public.cartes to authenticated;
revoke all on public.administrateurs from anon, authenticated;
grant execute on function public.est_admin() to anon, authenticated;

-- ---------- Stockage des illustrations ----------
-- Un « bucket » public en lecture (les joueurs voient les images),
-- WebP uniquement, 2 Mo maximum par fichier.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('illustrations', 'illustrations', true, 2097152, array['image/webp'])
on conflict (id) do nothing;

drop policy if exists "Seul l'admin envoie des images" on storage.objects;
create policy "Seul l'admin envoie des images" on storage.objects
  for insert to authenticated with check (bucket_id = 'illustrations' and public.est_admin());

drop policy if exists "Seul l'admin remplace des images" on storage.objects;
create policy "Seul l'admin remplace des images" on storage.objects
  for update to authenticated using (bucket_id = 'illustrations' and public.est_admin());

drop policy if exists "Seul l'admin supprime des images" on storage.objects;
create policy "Seul l'admin supprime des images" on storage.objects
  for delete to authenticated using (bucket_id = 'illustrations' and public.est_admin());
