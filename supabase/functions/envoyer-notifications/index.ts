// =============================================================
//  CHRONOLEGENDS — Edge Function « envoyer-notifications »
//  Appelée toutes les heures par le serveur (pg_cron, voir
//  supabase/16_notifications.sql). À l'heure du cadeau quotidien
//  (minuit, heure d'Israël), elle envoie « Votre booster gratuit est
//  arrivé ! » à tous les téléphones abonnés, dans leur langue.
//
//  Secrets Supabase (Edge Functions → Secrets) :
//    VAPID_PUBLIQUE, VAPID_PRIVEE : clés des notifications web
//    NOTIF_SECRET                 : mot de passe partagé avec le réveil pg_cron
//  SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournies par Supabase.
//
//  Test immédiat (sans attendre minuit) : appeler la fonction avec
//  le corps {"test": true}.
// =============================================================

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Heures (Israël) où un booster gratuit arrive. Pour 2 boosters par jour : [0, 12].
const HEURES = [0];

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

  // Heure actuelle en Israël (l'heure d'été est prise en compte automatiquement).
  const heure = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem", hour: "2-digit", hourCycle: "h23",
  }).format(new Date()));
  if (!corps.test && !HEURES.includes(heure)) {
    return Response.json({ envoyees: 0, raison: "pas encore l'heure", heure });
  }

  webpush.setVapidDetails(
    "https://chronolegendsgames.com",
    Deno.env.get("VAPID_PUBLIQUE")!,
    Deno.env.get("VAPID_PRIVEE")!,
  );
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: abonnes, error } = await sb.from("abonnements_push").select("endpoint, p256dh, auth, langue");
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

  return Response.json({ envoyees, oubliees: perimes.length, abonnes: abonnes?.length ?? 0, heure });
});
