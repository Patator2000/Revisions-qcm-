<p align="center">
  <img src="docs/logo.svg" width="84" alt="Logo Kinésis">
</p>

<h1 align="center">Kinésis</h1>
<p align="center"><b>Révisions L1 STAPS</b> · anatomie (Partie A) et physiologie de l'exercice</p>
<p align="center"><a href="https://patator2000.github.io/Revisions-qcm-/"><b>Ouvrir le site</b></a></p>

---

## Ce que fait le site

| | |
|---|---|
| **Questions** | 504 Vrai / Faux en anatomie ; en physiologie, Vrai / Faux, QCM type CT (5 propositions, une ou plusieurs justes) et questions ouvertes type CP |
| **Examens** | Simulations chronométrées : CCI 1, 2, 3 et 2e chance (40 questions en 25 min, 100 en 45 min), CT de physiologie (60 QCM en 1 h, barème officiel) |
| **Progression** | Profil en ligne (prénom + code) qui suit sur téléphone et ordinateur ; tableau de bord avec maîtrise globale, palier suivant, gains de chaque jour, activité sur 30 jours et points faibles |
| **Classement** | Classement entre profils (réponses de la semaine ou questions maîtrisées), prénom seulement, possibilité de ne pas y apparaître |
| **Apprentissage** | Priorité aux questions mal maîtrisées, bouton « Je réponds au pif », reprise d'une série après un rechargement, signalement d'erreurs |
| **Voix** | Réponse à l'oral (« vrai », « faux », lettres A à E, « suivante »), reconnue directement sur l'appareil |
| **Aide** | Une question sur un point du cours s'ouvre dans Claude avec l'énoncé et le corrigé |

## Organisation du dépôt

```
index.html              site publié (généré par build.py, ne pas modifier à la main)
build.py                construit index.html à partir de src/
src/
  template.html         structure de la page et styles
  app/
    app.js              cœur : matières, séries, correction, sauvegarde
    extras.js           voix (commandes), signalements, synchronisation
    dash.js             tableau de bord et historique quotidien, retour à la page après rechargement
    ask.js              questions à Claude
    profils.js          profils en ligne (Supabase), synchronisation et menu du profil
    abonnement.js       abonnement Kinésis+ (préparé, désactivé)
    voix.js             reconnaissance vocale Vosk
  data/                 banques de questions (anatomie, physiologie)
supabase/schema.sql     tables, sécurité et automatismes de la base
supabase/classement_abonnement.sql   classement et abonnement
supabase/functions/     fonctions serveur Stripe (non déployées)
vendor/                 bibliothèques externes (supabase-js, vosk-browser)
models/                 modèle de reconnaissance vocale en français
docs/                   logo, guide de l'abonnement (abonnement.md)
```

## Mettre à jour le site

1. Modifier les fichiers de `src/` (questions dans `src/data/`).
2. Lancer `python3 build.py` : le script régénère `index.html` et vérifie l'encodage et les accents.
3. Pousser sur `main` : GitHub Pages publie en une à trois minutes.

## Base de données

Projet Supabase **Revisions-qcm-**. Deux tables, protégées pour que chaque profil n'accède qu'à ses propres données :

- `progress` : la progression de chaque profil, par matière ;
- `reports` : les erreurs signalées dans les questions, avec un suivi (`nouveau`, `corrigé`, `rejeté`) ;
- `profiles` : le choix d'apparaître ou non dans le classement ;
- `subscriptions` : l'abonnement Kinésis+ (préparé, voir [`docs/abonnement.md`](docs/abonnement.md)).

Le classement passe par la fonction `leaderboard()`, qui ne renvoie que le prénom, le nombre de questions maîtrisées et les réponses des 7 derniers jours : jamais la progression détaillée des autres.

Le schéma complet est dans [`supabase/schema.sql`](supabase/schema.sql) ; il peut être relancé sans perte de données. La clé utilisée par le site est la clé publique (« publishable ») : elle est faite pour être visible. Ne jamais mettre la clé secrète (`service_role`) dans ce dépôt.

## Crédits

Reconnaissance vocale : [vosk-browser](https://github.com/ccoreilly/vosk-browser) et le modèle français `vosk-model-small-fr-pguyot`. Profils : [Supabase](https://supabase.com).
