# Dashboard acquisition — LFP

Dépense Meta et CPL Meta par jour, en direct depuis l'API Meta.

## Mise en route
1. Vercel → importer le repo `lfp-acquisition`.
2. Variables d'environnement : voir `.env.example` (au minimum `META_ACCESS_TOKEN` et `META_AD_ACCOUNT_IDS`).
3. Déployer.

## Nouveau challenge
Modifier `lib/config.js` (nom, `startDate` = début des pubs, `endDate` = fin de l'acquisition), puis push.

## Leads
Si le dashboard affiche « Aucune conversion … », il liste les événements disponibles chez Meta :
mettre le bon dans `META_LEAD_ACTION` (ex. `complete_registration`).
