-- =============================================================
--  CHRONOLEGENDS — Tests de la règle du verrou de région
--  Ne lit ni ne modifie aucune donnée : simule des situations et
--  vérifie la décision de decider_region(). Toutes les lignes
--  doivent afficher ✅.
-- =============================================================

with cas (situation, officielle, candidate, depuis, changee_le, detectee, maintenant, attendu_region, attendu_candidate) as (values
  ('1. Tout premier passage en Israël',
    null, null, null::timestamptz, null::timestamptz, 'moyen-orient', '2026-10-15 20:00+03'::timestamptz, 'moyen-orient', null),
  ('2. Joueur chez lui en Israël',
    'moyen-orient', null, null, null, 'moyen-orient', '2026-10-15 20:00+03', 'moyen-orient', null),
  ('3. Allume un VPN France : boosters inchangés, Europe en attente',
    'moyen-orient', null, null, null, 'europe', '2026-10-15 20:00+03', 'moyen-orient', 'europe'),
  ('4. VPN 5 h plus tard : toujours pas',
    'moyen-orient', 'europe', '2026-10-15 20:00+03', null, 'europe', '2026-10-16 01:00+03', 'moyen-orient', 'europe'),
  ('5. VPN à 23h59 puis 00h01 (autre jour) : toujours pas',
    'moyen-orient', 'europe', '2026-10-15 23:59+03', null, 'europe', '2026-10-16 00:01+03', 'moyen-orient', 'europe'),
  ('6. Éteint le VPN : demande annulée',
    'moyen-orient', 'europe', '2026-10-15 20:00+03', null, 'moyen-orient', '2026-10-16 09:00+03', 'moyen-orient', null),
  ('7. Vrai voyage : encore en Europe 24 h après → change',
    'moyen-orient', 'europe', '2026-10-15 20:00+03', null, 'europe', '2026-10-16 20:00+03', 'europe', null),
  ('8. 24 h passées mais déjà changé il y a 3 jours → attend',
    'moyen-orient', 'europe', '2026-10-15 20:00+03', '2026-10-13 10:00+03', 'europe', '2026-10-16 20:00+03', 'moyen-orient', 'europe'),
  ('9. 24 h passées et dernier changement il y a 8 jours → change',
    'moyen-orient', 'europe', '2026-10-15 20:00+03', '2026-10-08 10:00+03', 'europe', '2026-10-16 20:00+03', 'europe', null),
  ('10. Pays inconnu (Tor) : rien ne bouge',
    'moyen-orient', 'europe', '2026-10-15 20:00+03', null, null, '2026-10-16 20:00+03', 'moyen-orient', 'europe'),
  ('11. Autre pays entre-temps (Asie) : le compteur repart de zéro',
    'moyen-orient', 'europe', '2026-10-15 20:00+03', null, 'asie', '2026-10-16 20:00+03', 'moyen-orient', 'asie')
)
select case when d.officielle is not distinct from c.attendu_region
             and d.candidate is not distinct from c.attendu_candidate then '✅' else '❌' end as ok,
       c.situation,
       d.officielle as region_des_boosters,
       d.candidate as region_en_attente
from cas c
cross join lateral public.decider_region(c.officielle, c.candidate, c.depuis, c.changee_le, c.detectee, c.maintenant) d;
