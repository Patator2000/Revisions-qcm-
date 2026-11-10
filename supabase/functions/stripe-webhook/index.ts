// Reçoit les notifications de Stripe (paiement réussi, renouvellement, résiliation...)
// et tient à jour la table subscriptions. Seul point d'écriture de l'abonnement.
// À déployer SANS vérification de jeton Supabase (Stripe n'en a pas) : la signature Stripe fait foi.
import { admin, stripe } from "../_shared/commun.ts";
import type Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

async function save(sub: Stripe.Subscription) {
  const userId = sub.metadata?.user_id;
  if (!userId) return;
  const item = sub.items?.data?.[0];
  const end = (item as unknown as { current_period_end?: number })?.current_period_end
    ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  await admin.from("subscriptions").upsert({
    user_id: userId,
    status: sub.status,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
  });
}

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  if (!signature || !SECRET) return new Response("signature manquante", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, SECRET);
  } catch (e) {
    return new Response(`signature invalide : ${(e as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.subscription) await save(await stripe.subscriptions.retrieve(s.subscription as string));
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await save(event.data.object as Stripe.Subscription);
      break;
  }
  return new Response(JSON.stringify({ recu: true }), { headers: { "Content-Type": "application/json" } });
});
