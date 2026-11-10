// Ouvre l'espace Stripe où l'abonné peut changer de carte, voir ses factures ou résilier en un clic.
import { admin, cors, currentUser, json, SITE_URL, stripe } from "../_shared/commun.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "méthode non autorisée" }, 405);

  const user = await currentUser(req);
  if (!user) return json({ error: "profil non connecté" }, 401);

  const { data } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (!data?.stripe_customer_id) return json({ error: "aucun abonnement" }, 404);

  const portal = await stripe.billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: SITE_URL });
  return json({ url: portal.url });
});
