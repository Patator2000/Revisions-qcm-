// Ouvre la page de paiement Stripe pour Kinésis+ (4,99 € par mois).
// Appelée par le site avec le jeton du profil connecté ; renvoie { url } vers Stripe Checkout.
import { cors, currentUser, customerFor, json, SITE_URL, stripe } from "../_shared/commun.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "méthode non autorisée" }, 405);

  const user = await currentUser(req);
  if (!user) return json({ error: "profil non connecté" }, 401);

  const price = Deno.env.get("STRIPE_PRICE_ID");
  if (!price) return json({ error: "abonnement pas encore configuré" }, 503);

  const customer = await customerFor(user.id, user.user_metadata?.name ?? "Kinésis");
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    locale: "fr",
    success_url: `${SITE_URL}?abonnement=merci`,
    cancel_url: `${SITE_URL}?abonnement=annule`,
  });
  return json({ url: session.url });
});
