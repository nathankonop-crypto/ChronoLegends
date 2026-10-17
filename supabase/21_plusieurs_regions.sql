-- =============================================================
--  CHRONOLEGENDS — 21. Une carte dans plusieurs régions
--  cartes.region reste la région PRINCIPALE (écrite sur la carte).
--  cartes.regions_secondaires : les autres régions où la carte peut
--  aussi sortir dans les boosters (ex. Alexandre le Grand :
--  Moyen-Orient, aussi Europe, Afrique et Asie).
--  Se coche dans l'admin (fiche de la carte, « Aussi dans »).
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

alter table public.cartes add column if not exists regions_secondaires text[] not null default '{}';

alter table public.cartes drop constraint if exists cartes_regions_secondaires_check;
alter table public.cartes add constraint cartes_regions_secondaires_check
  check (regions_secondaires <@ array['europe', 'afrique', 'moyen-orient', 'asie', 'ameriques', 'oceanie']::text[]);

-- Tirage d'une carte (même règles que 14_booster_sans_doublon.sql) : une carte compte
-- pour sa région principale ET pour ses régions secondaires.
create or replace function public.tirer_carte(p_region text, p_rarete text, p_deja text[])
returns text
language plpgsql volatile set search_path = public as $$
declare
  rangs   text[] := array['ordinaire', 'notable', 'rare', 'epique', 'legendaire', 'mythique'];
  idx     int := coalesce(array_position(rangs, p_rarete), 1);
  plafond int := greatest(idx, 4);   -- jamais plus haut qu'Épique pour combler, sauf si tiré plus haut
  ordre   int[] := array[coalesce(array_position(rangs, p_rarete), 1)];
  d       int;
  essai   int;
  sans_doublon boolean;
  choix   text;
begin
  -- Ordre d'essai : la rareté tirée, puis juste en dessous, juste au-dessus, puis plus loin.
  for d in 1..5 loop
    if idx - d >= 1 then ordre := ordre || (idx - d); end if;
    if idx + d <= plafond then ordre := ordre || (idx + d); end if;
  end loop;

  -- 1er passage : seulement des cartes absentes de ce booster ; 2e passage : doublon accepté.
  foreach sans_doublon in array array[true, false] loop
    foreach essai in array ordre loop
      select id into choix from public.cartes
       where (region = p_region or p_region = any (regions_secondaires))
         and rarete = rangs[essai] and statut = 'validee'
         and (not sans_doublon or not (id = any (p_deja)))
       order by random() limit 1;
      if found then
        return choix;
      end if;
    end loop;
  end loop;

  -- Dernier recours (région presque vide) : n'importe quelle carte validée de la région,
  -- de préférence une qui n'est pas déjà dans le booster. Ne plante jamais.
  select id into choix from public.cartes
   where (region = p_region or p_region = any (regions_secondaires)) and statut = 'validee'
   order by (id = any (p_deja)), random() limit 1;
  return choix;
end $$;

revoke execute on function public.tirer_carte(text, text, text[]) from public, anon, authenticated;
