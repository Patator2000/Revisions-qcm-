<p align="center">
  <img src="docs/logo.svg" width="84" alt="Logo Kinésis">
</p>

<h1 align="center">Kinésis</h1>
<p align="center"><b>Ton espace perso</b> · révisions (anatomie, physiologie, natation) et, bientôt, tes mails importants</p>
<p align="center"><a href="https://patator2000.github.io/Revisions-qcm-/"><b>Ouvrir le site</b></a></p>

---

## Ce que fait le site

| | |
|---|---|
| **Questions** | Vrai / Faux en anatomie (avec schémas) ; QCM A à E en natation (règlement et histoire, barème +0,4 / -0,2) ; en physiologie, Vrai / Faux, QCM type CT (5 propositions, une ou plusieurs justes) et questions ouvertes type CP |
| **Examens** | Simulations chronométrées : CCI 1, 2, 3 et 2e chance (40 questions en 25 min, 100 en 45 min), CT de physiologie (60 QCM en 1 h, barème officiel), évaluations de natation (règlement et histoire séparés) |
| **Progression** | Profil en ligne (prénom + code) qui suit sur téléphone et ordinateur ; tableau de bord avec maîtrise globale, palier suivant, gains de chaque jour, activité sur 30 jours et points faibles |
| **Modules** | Chaque profil choisit ses modules (anatomie, physiologie, natation, mails) ; un profil neuf est vide |
| **Appli** | S'installe sur téléphone et ordinateur (icône, plein écran, hors connexion) |
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
    modules.js          modules du profil (tableau de bord)
    voix.js             reconnaissance vocale Vosk
  data/                 banques de questions (anatomie, physiologie, natation)
supabase/schema.sql     tables, sécurité et automatismes de la base
supabase/classement_abonnement.sql   table profiles (historique)
supabase/modules.sql       modules de chaque profil
supabase/admin.sql       compte admin (signalements), fonction is_admin()
supabase/functions/     fonctions serveur Stripe (non déployées)
vendor/                 bibliothèques externes (supabase-js, vosk-browser)
models/                 modèle de reconnaissance vocale en français
docs/                   logo
```

## Mettre à jour le site

1. Modifier les fichiers de `src/` (questions dans `src/data/`).
2. Lancer `python3 build.py` : le script régénère `index.html` et vérifie l'encodage et les accents.
3. Pousser sur `main` : GitHub Pages publie en une à trois minutes.

## Base de données

Projet Supabase **Revisions-qcm-**. Tables protégées pour que chaque profil n'accède qu'à ses propres données :

- `progress` : la progression de chaque profil, par matière ;
- `reports` : les erreurs signalées dans les questions, avec un suivi (`nouveau`, `corrigé`, `rejeté`) ; seul le compte admin les voit toutes (menu du profil, « Signalements à traiter ») ;
- `profiles` : les modules choisis par chaque profil ;
- `premium_content` : les questions des cours 3 et suivants, lisibles seulement par les abonnés et les profils en essai.


Le schéma complet est dans [`supabase/schema.sql`](supabase/schema.sql) ; il peut être relancé sans perte de données. La clé utilisée par le site est la clé publique (« publishable ») : elle est faite pour être visible. Ne jamais mettre la clé secrète (`service_role`) dans ce dépôt.

## Crédits

Reconnaissance vocale : [vosk-browser](https://github.com/ccoreilly/vosk-browser) et le modèle français `vosk-model-small-fr-pguyot`. Profils : [Supabase](https://supabase.com).
