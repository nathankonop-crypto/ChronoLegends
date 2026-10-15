-- =============================================================
--  CHRONOLEGENDS — 16. Notifications « Votre booster gratuit est arrivé ! »
--
--  • Table abonnements_push : un téléphone (ou navigateur) abonné = une ligne.
--    Le joueur s'abonne avec l'interrupteur « Notifications » des Paramètres.
--    Personne ne peut lire cette table depuis le jeu : seules les deux
--    fonctions ci-dessous l'écrivent, et l'Edge Function la lit.
--  • Réveil automatique (pg_cron) : toutes les heures, le serveur appelle
--    l'Edge Function « envoyer-notifications », qui n'envoie qu'à l'heure
--    du cadeau quotidien (minuit, heure d'Israël — heure d'été comprise).
--
--  ⚠ Le secret NOTIF_SECRET n'est PAS écrit dans ce fichier (il est public
--  sur GitHub) : la version à coller dans Supabase le contient déjà.
--
--  À exécuter une fois dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run. Peut être relancé sans danger.
-- =============================================================

create table if not exists public.abonnements_push (
  endpoint   text primary key,               -- adresse d'envoi fournie par le navigateur
  user_id    uuid not null references public.joueurs (user_id) on delete cascade,
  p256dh     text not null,                  -- clés de chiffrement du navigateur
  auth       text not null,
  langue     text not null default 'fr' check (langue in ('fr', 'en', 'he')),
  cree_le    timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
alter table public.abonnements_push enable row level security;   -- aucune règle : illisible depuis le jeu
revoke all on public.abonnements_push from anon, authenticated;

-- ---------- S'abonner / se désabonner (le joueur connecté uniquement) ----------

create or replace function public.enregistrer_abonnement(p_endpoint text, p_p256dh text, p_auth text, p_langue text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'non_connecte';
  end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'abonnement_invalide';
  end if;
  -- Même téléphone, nouveau compte : l'abonnement passe au compte actuel.
  insert into public.abonnements_push (endpoint, user_id, p256dh, auth, langue)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, case when p_langue in ('fr', 'en', 'he') then p_langue else 'fr' end)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        langue = excluded.langue, modifie_le = now();
end $$;

create or replace function public.supprimer_abonnement(p_endpoint text)
returns void
language sql security definer set search_path = public as $$
  delete from public.abonnements_push where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke execute on function public.enregistrer_abonnement(text, text, text, text) from public, anon;
revoke execute on function public.supprimer_abonnement(text) from public, anon;
grant execute on function public.enregistrer_abonnement(text, text, text, text) to authenticated;
grant execute on function public.supprimer_abonnement(text) to authenticated;

-- ---------- Réveil automatique : toutes les heures, à l'heure pile ----------

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('chronolegends-notifications')
 where exists (select 1 from cron.job where jobname = 'chronolegends-notifications');

select cron.schedule('chronolegends-notifications', '0 * * * *', $cron$
  select net.http_post(
    url     := 'https://qhyvdodkzdhmobkvahwa.supabase.co/functions/v1/envoyer-notifications',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer CLE_PUBLIQUE_SUPABASE',
      'x-notif-secret', 'NOTIF_SECRET_A_REMPLACER'),
    body    := '{}'::jsonb)
$cron$);

-- ---------- Vérification : doit afficher le réveil « chronolegends-notifications » ----------
select jobname, schedule, active from cron.job where jobname = 'chronolegends-notifications';
