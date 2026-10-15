-- =============================================================
--  CHRONOLEGENDS — 14. Pas de doublon à l'intérieur d'un même booster
--
--  Avant : quand toutes les cartes d'une rareté étaient déjà dans le booster
--  (régions avec peu de cartes), le tirage reprenait tout de suite une carte
--  déjà tirée. Un joueur pouvait ainsi avoir 3 fois la même carte.
--
--  Maintenant, pour chaque carte du booster :
--    1. une carte de la rareté tirée, PAS encore dans ce booster ;
--    2. sinon, une carte d'une rareté voisine, pas encore dans ce booster
--       (d'abord juste en dessous, puis juste au-dessus, puis plus loin) ;
--       on ne monte jamais jusqu'à Légendaire ou Mythique pour combler un trou :
--       ces raretés ne sortent que si le tirage (ou la pitié) les a choisies ;
--    3. seulement si la région n'a vraiment pas assez de cartes différentes :
--       un doublon (même ordre de préférence), plutôt que de planter.
--  Les doublons ENTRE deux boosters restent possibles (échanges entre joueurs).
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

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
       where region = p_region and rarete = rangs[essai] and statut = 'validee'
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
   where region = p_region and statut = 'validee'
   order by (id = any (p_deja)), random() limit 1;
  return choix;
end $$;

revoke execute on function public.tirer_carte(text, text, text[]) from public, anon, authenticated;

-- ---------- Vérification : 200 boosters simulés par région ----------
-- Rien n'est enregistré (fonction temporaire, effacée à la fin de la session).
-- Résultat attendu : 0 booster avec doublon, sauf dans les régions qui ont
-- moins de 5 cartes différentes (Amériques, Océanie) : là, c'est inévitable.
create or replace function pg_temp.essai_boosters(p_nb int)
returns table(region_testee text, cartes_differentes bigint, boosters int, avec_doublon int)
language plpgsql as $$
declare
  r text; n int; i int; ids text[]; nb int;
begin
  for r in select distinct c.region from public.cartes c where c.statut = 'validee' order by 1 loop
    nb := 0;
    for n in 1..p_nb loop
      ids := '{}';
      for i in 1..5 loop
        ids := ids || public.tirer_carte(r, public.tirer_rarete(case when i <= 3 then 'cartes_1_a_3'
                                                                     when i = 4 then 'carte_4' else 'carte_5' end), ids);
      end loop;
      if (select count(distinct x) from unnest(ids) as x) < 5 then nb := nb + 1; end if;
    end loop;
    region_testee := r;
    cartes_differentes := (select count(*) from public.cartes c where c.region = r and c.statut = 'validee');
    boosters := p_nb;
    avec_doublon := nb;
    return next;
  end loop;
end $$;

select * from pg_temp.essai_boosters(200);
