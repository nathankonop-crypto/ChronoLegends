// =============================================================
//  CHRONOLEGENDS — Edge Function « envoyer-notifications »
//  Appelée toutes les 10 minutes par le serveur (pg_cron, voir
//  supabase/16_notifications.sql et 19_chrono_24h.sql). Chaque joueur
//  a son propre chrono de 24 h : elle envoie « Votre booster gratuit
//  est arrivé ! » aux seuls joueurs dont le booster vient d'arriver,
//  dans leur langue (la base note l'envoi : jamais deux fois).
//
//  Secrets Supabase (Edge Functions → Secrets) :
//    VAPID_PUBLIQUE, VAPID_PRIVEE : clés des notifications web
//    NOTIF_SECRET                 : mot de passe partagé avec le réveil pg_cron
//  SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournies par Supabase.
//
//  Test immédiat : appeler la fonction avec le corps {"test": true}
//  (envoie à TOUS les téléphones abonnés).
// =============================================================

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const MESSAGES: Record<string, { titre: string; texte: string }> = {
  fr: { titre: "ChronoLegends", texte: "🎁 Votre booster gratuit est arrivé ! Venez l'ouvrir." },
  en: { titre: "ChronoLegends", texte: "🎁 Your free booster has arrived! Come and open it." },
  he: { titre: "ChronoLegends", texte: "🎁 החבילה החינמית שלכם הגיעה! בואו לפתוח אותה." },
};

Deno.serve(async (req) => {
  if (req.headers.get("x-notif-secret") !== Deno.env.get("NOTIF_SECRET")) {
    return new Response("interdit", { status: 403 });
  }
  const corps = await req.json().catch(() => ({}));

  webpush.setVapidDetails(
    "https://chronolegendsgames.com",
    Deno.env.get("VAPID_PUBLIQUE")!,
    Deno.env.get("VAPID_PRIVEE")!,
  );
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Test : tous les abonnés. Sinon : ceux dont le booster vient d'arriver (supabase/19_chrono_24h.sql).
  const { data: abonnes, error } = corps.test
    ? await sb.from("abonnements_push").select("endpoint, p256dh, auth, langue")
    : await sb.rpc("abonnes_a_prevenir");
  if (error) return Response.json({ erreur: error.message }, { status: 500 });

  let envoyees = 0;
  const perimes: string[] = [];
  await Promise.all((abonnes ?? []).map(async (a) => {
    const m = MESSAGES[a.langue] ?? MESSAGES.fr;
    try {
      await webpush.sendNotification(
        { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
        JSON.stringify({ titre: m.titre, texte: m.texte, url: "./" }),
        { TTL: 6 * 3600 },   // gardée 6 h si le téléphone est éteint
      );
      envoyees++;
    } catch (e) {
      // 404 / 410 : le joueur a désinstallé ou bloqué les notifications → on oublie ce téléphone.
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) perimes.push(a.endpoint);
      else console.error("envoi impossible", code, (e as Error).message);
    }
  }));
  if (perimes.length) await sb.from("abonnements_push").delete().in("endpoint", perimes);

  return Response.json({ envoyees, oubliees: perimes.length, abonnes: abonnes?.length ?? 0 });
});
