# Sullivan — Bot WhatsApp Multi-Fonctions

Bot WhatsApp basé sur [Baileys](https://github.com/WhiskeySockets/Baileys), développé et maintenu par Arthur.

## Installation

```bash
npm install
node index.js
```

Au premier lancement, entre ton numéro WhatsApp (avec l'indicatif pays) pour générer le code d'appairage, puis dans WhatsApp : **Appareils liés → Lier avec un numéro de téléphone**.

## Configuration (`settings.js`)

| Clé | Utilité | Obligatoire ? |
|---|---|---|
| `ownerNumber` (`Owner/owner.js`) | Ton numéro, accès total au bot | Oui |
| `GROQ_API_KEY` | `.chatgpt` `.llama` `.claude` `.mistral` | Non — sans clé, ces commandes sont juste désactivées |
| `PEXELS_API_KEY` | `.wallpaper` `.cyber` `.dog` `.rose` etc. (clé gratuite sur pexels.com/api) | Non |
| `GITHUB_TOKEN` | `.gitfollow` | Non |
| `menuImages` | Chemins des images affichées avec chaque sous-menu | Non — dépose les fichiers dans `media/menu-images/` |

## Fonctionnalités principales

- **Groupe** : kick, promote/demote, tagall, hidetag, open/close, changename, kickall, adminkill...
- **Automatisations** : antibug, antilink, antilinkick, autoreact, autogreet, autostatus, autotyping, autostatuslike (réaction emoji instantanée aux statuts des contacts)
- **Téléchargement** : `.song`/`.video` envoient le vrai fichier (pas un lien)
- **Météo** : `.weather <ville>` (données réelles + image)
- **IA** : `.chatgpt` `.llama` `.claude` `.mistral` (via Groq)
- **Anime/réactions** : `.waifu` `.hug` `.kiss` `.pat` etc.
- **Texte** : `.fliptext` `.smallcaps` `.bubble` `.zalgo` etc.
- **Logos** : génération locale d'images stylisées (`.logo`, `.dragonball`, `.blackpink`...)
- **Outils** : `.calc`, `.poll`, GitHub (`.github`, `.gitclone`, `.gitfollow`)

Voir `CHANGELOG.md` pour le détail complet et la liste de ce qui reste à faire.

## Sécurité

- Aucun accès owner caché : seul le numéro défini dans `Owner/owner.js` a les droits complets.
- Dépendance Baileys officielle, version figée.
- `.gitclone` n'exécute jamais le code d'un dépôt cloné (clonage seul, dans un dossier temporaire supprimé ensuite).

## Déploiement sur Railway

1. Pousse ce projet sur un repo GitHub, puis crée un nouveau projet Railway à partir de ce repo.
2. Railway détecte automatiquement Node.js et lance `npm install && npm start`.
3. **Volume persistant obligatoire** : sans ça, `auth_info/`, `sessions-data/` et `data/`
   (dossiers créés au runtime) sont effacés à chaque redéploiement/redémarrage, et il faudra
   re-pairer tous les numéros à chaque fois. Dans Railway : onglet **Volumes** → ajoute un
   volume monté sur `/app` (ou au minimum sur ces trois dossiers).
4. Railway assigne le port automatiquement via la variable d'environnement `PORT` — déjà géré
   par `index.js`, rien à configurer.
5. Railway n'offre pas de terminal interactif au runtime : le bot le détecte automatiquement
   et saute l'invite de pairing dans la console. Pour connecter ton numéro :
   - Ouvre l'URL publique Railway de ton service
   - Clique 5 fois sur le logo → entre le code du dashboard (`settings.js` → `DASHBOARD_PASSCODE`)
   - **Ajouter un numéro** → onglet QR (scanner) ou onglet Code (numéro + code à entrer dans WhatsApp)
6. Mets une vraie valeur dans `DASHBOARD_PASSCODE` avant de déployer publiquement — le code
   par défaut (`Sullivan08`) ne doit pas rester tel quel sur un site accessible sur Internet.
