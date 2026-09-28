# Recul — application de restructuration cognitive (TCC)

Application personnelle, installée sur l'iPhone comme une PWA, qui guide une session de restructuration
cognitive (colonnes de Beck) : situation → émotion → pensée automatique → questions adaptées →
pensée alternative → bilan avant / après.

> Outil d'auto-assistance à usage privé. Il ne remplace pas un professionnel de santé.

## Ce qui est fait (MVP, section 14 du cahier des charges)

| Réf. | Fonction | État |
| --- | --- | --- |
| F1 | Premier lancement (méthode, avertissement) | ✅ |
| F2 | Verrouillage par code (PBKDF2) + Face ID / Touch ID (WebAuthn), reverrouillage après 1 min en arrière-plan | ✅ |
| F3 | Session guidée : situation, émotion + intensité, pensée + croyance | ✅ |
| F4 | Problématique : Anxiété (les autres sont affichées « bientôt ») | ✅ |
| F5 | Moteur de questions (règles ci-dessous), une question par écran, passer, utile / pas utile | ✅ |
| F6 | Pensée alternative : 3 gabarits, questions de vérification, nouvelles croyance et intensité | ✅ |
| F7 | Bilan avant / après, message neutre, suggestion d'un professionnel si l'intensité reste élevée 3 fois de suite | ✅ |
| F8 | Journal : liste, recherche, filtre par émotion, détail, modification, suppression | ✅ |
| F9 | Bouton SOS sur chaque écran (3114, 15, 112, personnes de confiance, respiration, ancrage 5-4-3-2-1) et détection de mots de crise | ✅ |

En plus, parce que c'est le premier risque du cahier des charges (perte des données) :
sauvegarde manuelle **chiffrée** (AES-GCM, mot de passe) et restauration, dans Réglages. Également :
exercice de respiration proposé si l'intensité de départ est ≥ 80, suggestion de distorsion par mots-clés.

### Règles du moteur de questions (`src/lib/moteur.ts`)

- 1 question « point de départ », 2 à 3 questions de la distorsion choisie, 1 question de clôture.
- Au moins une question sur les preuves (champ `preuves` dans le JSON).
- « Je ne sais pas » → l'application choisit la distorsion la moins utilisée récemment.
- Une question posée dans les 3 dernières sessions sur la même distorsion n'est pas reproposée si d'autres sont disponibles.
- Une question marquée « pas utile » sort de la rotation pendant 10 sessions. Passer une question ne compte pas comme « pas utile ».

## Modifier le contenu sans toucher au code

- `src/content/questions.json` : émotions, problématiques, distorsions (définitions, mots-clés de suggestion), questions, gabarits.
  Pour ajouter la colère : ajouter ses questions avec `"problematique": "colere"`, ses gabarits, et passer `active` à `true`.
- `src/content/crise.json` : mots-clés de détection de crise (accents et majuscules ignorés, `*` = début de mot) et numéros d'urgence.
  **À relire et compléter vous-même.**

## Développement

```bash
npm install
npm run dev        # serveur local
npm test           # tests du moteur de questions et de la détection de crise
npm run build      # version de production dans dist/
```

Pile : React + TypeScript + Vite, IndexedDB, service worker généré au build (`vite.config.ts`, `src/sw.js`).
Aucune autre dépendance, aucun appel réseau, aucune télémétrie (politique CSP `connect-src 'self'`).

## Installer sur l'iPhone

1. Sur GitHub : **Settings → Pages → Source : GitHub Actions**. Chaque push sur `main` publie l'application
   (le code uniquement ; vos données restent sur le téléphone).
2. Sur l'iPhone, ouvrir l'adresse dans **Safari** → bouton Partager → **Sur l'écran d'accueil**.
3. Ouvrir l'application depuis l'icône, puis dans Réglages : activer le verrouillage et faire une première sauvegarde.

## Limites connues

- La base locale n'est pas chiffrée (le cahier des charges l'accepte pour le MVP) : la protection repose sur le
  verrouillage de l'iPhone et de l'application. Les sauvegardes, elles, sont chiffrées si un mot de passe est donné.
- iOS peut effacer les données d'un site peu utilisé : l'application demande un stockage persistant, mais
  **la sauvegarde régulière reste indispensable**.
- Pas encore : rappels (F12), statistiques (F11), fiches (F10), questions personnelles (F16), autres problématiques.
