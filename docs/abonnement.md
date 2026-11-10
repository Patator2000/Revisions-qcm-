# Kinésis+ : abonnement à 4,99 € par mois

**État actuel : préparé, désactivé.** Rien n'est visible sur le site et rien n'est bloqué.

## Ce qui est déjà en place

| Élément | Où | État |
|---|---|---|
| Table `subscriptions` et fonction `is_premium()` | Supabase (`supabase/classement_abonnement.sql`) | créées |
| Paiement (Stripe Checkout) | `supabase/functions/abonnement-paiement` | écrit, non déployé |
| Gestion / résiliation (portail Stripe) | `supabase/functions/abonnement-gestion` | écrit, non déployé |
| Réception des paiements (webhook) | `supabase/functions/stripe-webhook` | écrit, non déployé |
| Fenêtre « Kinésis+ » et entrée du menu | `src/app/abonnement.js` | écrit, masqué |
| Questions des cours 3 et suivants (641) | Supabase, table `premium_content` (`supabase/contenu_payant.sql`) | chargées, lisibles seulement avec un accès |
| Essai gratuit de 7 jours dès la création du profil | `has_access()`, `trial_end()`, réglage `essai_jours` | en place |
| Interrupteur | `build.py` : `ABONNEMENT_ACTIF = False` | éteint |

Sécurité : le site ne peut que **lire** son propre abonnement. Seul le webhook, avec la clé secrète de Stripe et la clé « service » de Supabase rangées sur le serveur, peut l'écrire. Aucune clé secrète n'est dans ce dépôt.

## Contenu gratuit et contenu Kinésis+

- **Gratuit, dans la page** : CM 1-2, TD 1-2 et QCM 1-2 (anatomie et physiologie).
- **Kinésis+** : tout le reste (CM, TD, QCM 3 et suivants), stocké dans Supabase et servi seulement aux abonnés ou aux profils en essai. Chaque question garde sa place, donc la progression déjà faite est conservée.
- **Mettre à jour le contenu payant** après une modification des questions : `python3 build.py --contenu`, puis exécuter `build/contenu_payant_1..3.sql` dans l'éditeur SQL de Supabase.
- **Limite** : un abonné peut toujours recopier ce qu'il voit à l'écran. La protection empêche seulement de tout récupérer sans compte.
- **Important** : tant que le dépôt GitHub est public, les questions restent lisibles dans `src/data`. Le jour du lancement, passer le dépôt en **privé** (GitHub Pages reste disponible avec un compte GitHub Pro, sinon héberger le site ailleurs, par exemple Netlify ou Cloudflare Pages).

## Mise en service (le jour venu)

1. **Stripe** : créer un compte sur stripe.com, puis un produit « Kinésis+ » avec un prix récurrent de 4,99 € par mois. Noter l'identifiant du prix (`price_...`).
2. **Portail client Stripe** : l'activer dans Stripe (Paramètres > Facturation > Portail client) en autorisant la résiliation.
3. **Secrets du serveur** (dans Supabase > Edge Functions > Secrets, jamais dans le code) :
   - `STRIPE_SECRET_KEY` : clé secrète Stripe (`sk_live_...`, ou `sk_test_...` pour tester)
   - `STRIPE_PRICE_ID` : l'identifiant du prix
   - `STRIPE_WEBHOOK_SECRET` : donné par Stripe à l'étape 5
   - `SITE_URL` : `https://patator2000.github.io/Revisions-qcm-/`
4. **Déployer les fonctions** : `supabase functions deploy abonnement-paiement`, `abonnement-gestion`, `stripe-webhook` (le fichier `supabase/config.toml` règle déjà la vérification des jetons).
5. **Webhook Stripe** : ajouter l'adresse `https://eempregmkymltwgzrofl.supabase.co/functions/v1/stripe-webhook` avec les événements `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copier le secret de signature dans `STRIPE_WEBHOOK_SECRET`.
6. **Options** dans `build.py` : `GRATUIT` liste les thèmes gratuits ; `ABONNEMENT_RESERVE = ["examens"]` réserve aussi les simulations d'examen.
7. **Allumer** : `ABONNEMENT_ACTIF = True`, puis `python3 build.py` et publier. La page ne contient alors plus que les cours 1-2. Passer le dépôt en privé.
8. **Tester en mode test Stripe** (carte de test `4242 4242 4242 4242`) avant de passer aux clés réelles.

## Avant de faire payer : à vérifier

- **Droits sur le contenu** : les questions sont construites à partir des cours (CM, TD, QCM) des enseignants. Les vendre peut nécessiter leur accord ou celui de l'université. C'est le point le plus important.
- **Statut** : encaisser de l'argent demande un statut (par exemple micro-entreprise) et une déclaration des revenus.
- **Pages légales** : mentions légales, conditions générales de vente, politique de confidentialité.
- **Droit des consommateurs** : information sur le droit de rétractation de 14 jours, résiliation simple (le portail Stripe s'en charge).
- **Frais Stripe** : une commission est prélevée sur chaque paiement (voir la grille tarifaire de Stripe).
