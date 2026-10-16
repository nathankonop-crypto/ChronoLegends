-- =============================================================
--  CHRONOLEGENDS — 19. Booster gratuit : un chrono de 24 h par joueur
--
--  Avant : un booster gratuit pour tout le monde à minuit (heure d'Israël),
--  et la notification partait à tous les joueurs en même temps.
--  Maintenant, chaque joueur a SON chrono :
--    • quand il ouvre un booster, le chrono repart de 24 h ;
--    • au bout des 24 h, un booster gratuit l'attend (et sa notification part) ;
--    • s'il ne revient pas, un booster de plus toutes les 24 h, jusqu'à
--      « rattrapage_max » (3) depuis sa dernière ouverture.
--  Les arrivées et les notifications s'étalent donc sur toute la journée.
--
--  Les joueurs déjà inscrits gardent leur prochain booster à minuit (une
--  dernière fois), puis passent au chrono à leur prochaine ouverture.
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

alter table public.joueurs add column if not exists prochain_gratuit timestamptz;            -- fin du chrono
alter table public.joueurs add column if not exists gratuits_depuis_ouverture int not null default 0;
alter table public.joueurs add column if not exists notifie_le timestamptz;                  -- dernière notification envoyée

-- Joueurs existants : prochain booster au minuit (heure d'Israël) qui suit, comme avant.
update public.joueurs
   set prochain_gratuit = (public.jour_israel(now()) + 1)::timestamp at time zone 'Asia/Jerusalem'
 where prochain_gratuit is null;

-- ---------- Chaque ouverture de booster relance le chrono ----------
-- (déclencheur sur le journal des ouvertures : ouvrir_booster n'a pas besoin d'être modifiée)

create or replace function public.relancer_chrono() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.joueurs
     set prochain_gratuit = now() + interval '24 hours',
         gratuits_depuis_ouverture = 0,
         notifie_le = null
   where user_id = new.user_id;
  return new;
end $$;

drop trigger if exists ouverture_relance_chrono on public.ouvertures;
create trigger ouverture_relance_chrono after insert on public.ouvertures
  for each row execute function public.relancer_chrono();

-- ---------- Cadeau gratuit (reprend 17_rattrapage_boosters.sql, avec le chrono) ----------

create or replace function public.reclamer_quotidien() returns json
language plpgsql security definer set search_path = public as $$
declare
  uid        uuid := auth.uid();
  maintenant timestamptz := now();          -- heure du SERVEUR, jamais celle du téléphone
  j          public.joueurs;
  nouveau    boolean;
  accordes   int := 0;                      -- boosters donnés à cette visite
  plafond    int := public.reglage_tirage('rattrapage_max', 3)::int;
  prochain   timestamptz;
  restants   int;
begin
  if uid is null then
    raise exception 'non_connecte';
  end if;

  insert into public.joueurs (user_id, boosters, dernier_quotidien, prochain_gratuit)
  values (uid, 3, maintenant, maintenant + interval '24 hours')
  on conflict (user_id) do nothing;
  nouveau := found;

  select * into j from public.joueurs where user_id = uid for update;
  prochain := coalesce(j.prochain_gratuit, maintenant + interval '24 hours');
  restants := plafond - j.gratuits_depuis_ouverture;

  if not nouveau and maintenant >= prochain and restants > 0 then
    -- Un booster par tranche de 24 h écoulée depuis la fin du chrono, sans dépasser le plafond.
    accordes := least(1 + floor(extract(epoch from maintenant - prochain) / 86400)::int, restants);
    prochain := prochain + accordes * interval '24 hours';
    update public.joueurs
       set boosters = boosters + accordes,
           gratuits_depuis_ouverture = gratuits_depuis_ouverture + accordes,
           prochain_gratuit = prochain,
           dernier_quotidien = maintenant
     where user_id = uid;
  elsif j.prochain_gratuit is null then
    update public.joueurs set prochain_gratuit = prochain where user_id = uid;
  end if;

  j := public.localiser_joueur(uid);

  return json_build_object(
    'nouveau', nouveau,
    'accorde', accordes > 0,
    'accordes', accordes,
    'boosters', j.boosters,
    'prochain', prochain,
    'attente_secondes', greatest(0, ceil(extract(epoch from prochain - maintenant))),
    'pays', j.pays,
    'region', j.region,
    'verrou', public.infos_verrou(j)
  );
end $$;

revoke execute on function public.reclamer_quotidien() from public, anon;
grant execute on function public.reclamer_quotidien() to authenticated;

-- ---------- Notifications : les téléphones des joueurs dont un booster vient d'arriver ----------
-- Appelée par l'Edge Function « envoyer-notifications » (toutes les 10 minutes) : renvoie les
-- abonnements à prévenir et note l'heure d'envoi, pour ne jamais prévenir deux fois du même booster.

create or replace function public.abonnes_a_prevenir()
returns table (endpoint text, p256dh text, auth text, langue text)
language sql security definer set search_path = public as $$
  with dus as (
    update public.joueurs j
       set notifie_le = now()
     where j.prochain_gratuit <= now()
       -- le booster qui vient d'arriver ne dépasse pas le plafond…
       and floor(extract(epoch from now() - j.prochain_gratuit) / 86400)
           < public.reglage_tirage('rattrapage_max', 3)::int - j.gratuits_depuis_ouverture
       -- …et on n'a pas encore prévenu pour lui
       and (j.notifie_le is null or j.notifie_le < j.prochain_gratuit
            + floor(extract(epoch from now() - j.prochain_gratuit) / 86400) * interval '24 hours')
    returning j.user_id
  )
  select a.endpoint, a.p256dh, a.auth, a.langue
    from public.abonnements_push a join dus on dus.user_id = a.user_id;
$$;

revoke execute on function public.abonnes_a_prevenir() from public, anon, authenticated;
grant execute on function public.abonnes_a_prevenir() to service_role;

-- ---------- Réveil : toutes les 10 minutes au lieu de toutes les heures ----------
-- (on change seulement la fréquence du réveil créé par 16_notifications.sql ; ses secrets ne bougent pas)
select cron.alter_job(
  job_id   := (select jobid from cron.job where jobname = 'chronolegends-notifications'),
  schedule := '*/10 * * * *');

-- ---------- Vérification : doit afficher le réveil toutes les 10 minutes ----------
select jobname, schedule, active from cron.job where jobname = 'chronolegends-notifications';
