// Outils communs aux fonctions d'abonnement Kinésis+ (Supabase Edge Functions, Deno).
// Les secrets (clé Stripe, clé service) sont lus dans l'environnement du serveur :
// ils ne doivent JAMAIS être écrits dans ce dépôt ni dans le site.
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";

export const SITE_URL = Deno.env.get("SITE_URL") ?? "https://patator2000.github.io/Revisions-qcm-/";

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
});

// Client « service » : seul autorisé à écrire dans la table subscriptions
export const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

export const cors = {
  "Access-Control-Allow-Origin": new URL(SITE_URL).origin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// Profil connecté, à partir du jeton envoyé par le site
export async function currentUser(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

// Client Stripe lié au profil (créé une seule fois)
export async function customerFor(userId: string, name: string) {
  const { data } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id as string;
  const c = await stripe.customers.create({ name, metadata: { user_id: userId } });
  await admin.from("subscriptions").upsert({ user_id: userId, stripe_customer_id: c.id, status: "inactive" });
  return c.id;
}
