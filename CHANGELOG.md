# Sullivan — Journal des modifications

## Sécurité
- ❌ Supprimé : backdoor caché (bypass owner via un numéro contenant une séquence codée en dur)
- ❌ Remplacé : dépendance Baileys non officielle → `@whiskeysockets/baileys@6.7.9` (officiel, version figée)

## Branding
- Projet entièrement rebrandé **Sullivan**. Les 4 modules qui étaient livrés obfusqués
  (antibug.js, antilink.js, antilinkick.js, autotyping.js) ont été entièrement réécrits en clair
  (même logique de protection, vérifiée au préalable) — plus aucune obfuscation ni crédit externe.

## Fonctionnalités réelles ajoutées
- `.weather <ville>` — météo réelle (Open-Meteo, gratuit) + image
- `.song` / `.song2` / `.play` — télécharge et envoie le vrai fichier audio
- `.video` / `.video2` — télécharge et envoie la vraie vidéo
- `.chatgpt` `.llama` `.claude` `.mistral` — IA réelle via Groq
- `.waifu` `.neko` `.hug` `.kiss` `.pat` `.cuddle` `.cry` `.slap` `.kill` `.smile` `.blush` `.bite` `.love` `.baka` — vraies images (waifu.pics)
- `.github` `.gitrepos` `.gitstarred` `.gitfollow` — vraies stats + suivi GitHub (token requis)
- `.gitclone` — clone réel, en sandbox temporaire, sans jamais exécuter de code du dépôt
- `.fliptext` `.smallcaps` `.bubble` `.mirror` `.reverse` `.strike` `.zalgo` `.cpp` `.fancy`
- `.calc` — calculatrice sûre (sans eval)
- `.poll` — sondage natif WhatsApp
- `.hack` `.matrix` — effets décoratifs fictifs (aucune action réelle)
- `.logo` `.dragonball` `.deadpool` `.blackpink` `.neonlight` `.d3comic` `.cat` — génération d'image locale (Jimp, aucune API externe)
- `.wallpaper` `.gamewallpaper` `.cyber` `.dog` `.rose` `.technology` `.pubg` `.freefire` `.mountain` `.islamic` `.hacker` `.hestia` `.jibril` `.gremory` `.imgcat` `.art` — photos par mot-clé (Pexels, clé gratuite)
- `.setpp` / `.gpp` — changement réel de photo de profil (bot / groupe)
- Commandes groupe : `.add` `.kickall` `.open` `.close` `.tagall` `.hidetag` `.tagadmin` `.promote` `.demote` `.promoteall` `.demoteall` `.adminkill` `.changename` `.ginfo` `.del` `.reactch`
- Commandes owner : `.setbio` `.setname` `.join` `.leave` `.block` `.unblock` `.shutdown` `.restart` `.say`
- `.autostatuslike on/off` — réaction **emoji** instantanée sur les statuts des contacts
  (WhatsApp n'a pas de "réaction sticker" sur les statuts — seule l'emoji existe nativement)
- Menus avec image : dépose tes fichiers dans `media/menu-images/` (noms dans `settings.js` → `menuImages`)

## Encore à faire (mots-clés anime/personnages spécifiques)
`itachi`, `erza`, `mikasa`, `nezuko`, `megumin`, `emilia`, `kurumi`, `shinobu`, `asuna`, `elaina`,
`chitoge`, `zerotwo`, `luffy`, `boruto`, `deidara`, `itori`, `yumeko`, `exo`, `bts` et quelques autres
commandes "personnage précis" : pas encore branchées à une source d'images fiable et vérifiée.
Dis-moi lesquelles tu veux en priorité.

## Avant déploiement
1. `npm install`
2. Remplir `settings.js` selon les fonctionnalités voulues (clés optionnelles)
3. Déposer tes images de menu dans `media/menu-images/`

## Correction de bugs (passe supplémentaire)
- 🐛 **Pairing code** : `requestPairingCode()` renvoie le code directement via sa valeur de retour ; l'ancien code l'ignorait et allait le chercher dans un champ inexistant (`sock.authState.creds.pairingCode`) → le code ne s'affichait jamais. Corrigé avec `await`.
- 🐛 Numéro saisi pour le pairing non nettoyé (espaces/`+` possibles) → nettoyage automatique ajouté.
- 🐛 `Owner/owner.js` contenait `["SULLIVAN"]` au lieu d'un numéro (dégât collatéral du rebranding précédent) → JID owner invalide. Remplacé par un placeholder numérique clair à modifier.
- 🐛 `messages.upsert` traitait tout l'historique renvoyé lors d'une resynchronisation comme des messages neufs (le bot pouvait "réagir" à de vieux messages). Ajout du filtre `type === "notify"`.
- 🐛 AutoTyping / AutoReact / AutoStatusLike ne vérifiaient pas `!msg.key.fromMe` → le bot réagissait/tapait à ses propres messages, et tentait de liker ses propres statuts (impossible côté WhatsApp, juste des erreurs silencieuses).
- 🐛 `global.signature` contenait encore l'ancien nom en unicode stylisé (police différente, non capté par le premier rebranding) → corrigé en "Sullivan".

## Correction : boucle de déconnexion au pairing
- 🐛 Si le bot est arrêté (Ctrl+C) après avoir affiché un code de pairing mais AVANT de
  l'avoir entré dans WhatsApp, les identifiants partiels restaient dans `auth_info/` et
  invalidaient toutes les tentatives suivantes (`Connection Closed` en boucle).
  → Le bot détecte maintenant ce cas (déconnexion "loggedOut" avant inscription) et nettoie
  automatiquement `auth_info/` avant de relancer une tentative de pairing propre.
- Ajout du vrai code/raison de déconnexion dans les logs pour diagnostiquer plus facilement.
- Garde anti double-redémarrage simultané.

## Correction : code de pairing qui n'arrive jamais au téléphone
- 🐛 Le code était demandé juste après la création du socket, avant que la connexion
  WebSocket vers WhatsApp soit réellement établie → le code s'affichait côté terminal
  mais n'était jamais transmis au serveur (le téléphone ne recevait rien, pas même une
  notification d'échec). Le bot attend maintenant que la connexion soit effectivement en
  cours avant de demander le code.
- Si une déconnexion régénère un nouveau code pendant que tu tapes l'ancien, un
  avertissement visible (⚠️⚠️⚠️) t'indique que l'ancien code est périmé.

## Nouvelle commande
- `.vv` — télécharge et renvoie un média à vue unique (image/vidéo/audio) depuis un message cité, y compris dans les messages éphémères.

## Bug corrigé (important, touchait presque toutes les commandes)
- 🐛 Le routeur (`menu/case.js`) ne transmettait que `jid`, mais `weather.js`, `song.js`,
  `video.js`, `anime.js`, `logo.js`, `photo.js` et la majorité de `menu/core.js` attendent
  `chatId` → ces commandes recevaient `undefined` à la place du salon et échouaient en
  silence. Le routeur transmet maintenant `jid` ET `chatId` (même valeur) pour couvrir
  tous les styles de commandes, anciens et nouveaux. Ajout aussi du support `module.exports.execute(...)` pour les commandes écrites dans ce style (ex: `.vv`).

## Gros ajouts (multi-session, site web, réactions, police)

### Téléchargement par réaction (remplace `.vv`)
- Réagis avec 👍 à un média (y compris à vue unique) → Sullivan te l'envoie discrètement
  dans tes messages personnels (aucune confirmation dans le chat d'origine).
- Nouveau cache mémoire (`store.js`) des 200 derniers messages par discussion, nécessaire
  car Baileys ne garde pas d'historique par défaut.

### Multi-session
- Toute la logique de traitement des messages a été extraite dans `bot-engine.js`,
  réutilisable par plusieurs connexions WhatsApp en parallèle.
- `sessions.js` gère le cycle de vie de chaque session (connexion, reconnexion, pairing,
  nettoyage automatique en cas d'échec — même logique que le correctif précédent, généralisée).
- ⚠️ Limitation assumée : les réglages (antibug, antilink, mode self/public...) restent
  partagés entre toutes les sessions connectées (variables globales), pas isolés par numéro.
  Séparer ça proprement demanderait de réécrire la quasi-totalité des commandes — hors
  scope raisonnable pour l'instant. Pour un usage à un seul numéro, rien ne change.
- `.pair <numéro>` (owner uniquement) — démarre une nouvelle session et renvoie le code de
  pairing dans le chat, pour aider quelqu'un d'autre à connecter son propre numéro.

### Site web (QR + tableau de bord)
- Démarre automatiquement sur `http://localhost:3000` (port configurable : `settings.js` → `WEB_PORT`).
- Page d'accueil : un logo — 5 clics dessus font apparaître un champ code.
- Code par défaut : `Sullivan08` (modifiable : `settings.js` → `DASHBOARD_PASSCODE`).
- Dashboard : liste des numéros connectés (session, numéro, statut) + bouton déconnexion.
- "➕ Ajouter un numéro" : génère un QR code à scanner (alternative au pairing code).
- ⚠️ Sécurité volontairement simple (un seul mot de passe partagé, pas de HTTPS) — à mettre
  derrière un reverse proxy / VPN si le serveur est exposé publiquement sur Internet.

### Police / mise en forme
- Nouvelle police "monospace mathématique" + cadre réutilisable (`textfx.js` → `box()`),
  appliquée à `.alive`, `.runtime`, `.owner`, `.botname`, `.intro`, et au message de
  bienvenue/départ de groupe — en gardant le contenu Sullivan, seule la police/mise en forme change.
- Important : la police n'est jamais appliquée aux `@mentions` (ex: message de bienvenue),
  car convertir les chiffres casserait le lien de mention WhatsApp.
- Les 17 sous-menus (`.menu`, `.ownermenu`, etc.) gardent pour l'instant leur mise en forme
  actuelle — dis-moi si tu veux qu'ils passent aussi à ce nouveau style (gros volume de texte,
  je préfère vérifier avec toi avant de tout réécrire d'un coup).

## Avant de lancer
1. `npm install` (nouvelle dépendance : `express`)
2. `npm start`

## Préparation Railway + site web nouvelle génération

### Déploiement Railway
- `index.js` détecte l'absence de terminal interactif (`process.stdin.isTTY`) et saute
  l'invite de pairing en console sur ce type d'hébergeur (évite un blocage indéfini).
- Port géré via la variable d'environnement `PORT` (imposée par Railway), avec repli sur
  `settings.js` → `WEB_PORT` en local.
- `.gitignore` ajouté (`auth_info/`, `sessions-data/`, `data/`, `node_modules/`).
- ⚠️ Un volume persistant Railway est nécessaire (voir README) — sans ça, les sessions sont
  perdues à chaque redéploiement.

### Site web revu en profondeur
- Design sombre complet (dégradés, typographie Space Grotesk/Inter, cartes, statuts colorés).
- **Les deux méthodes de connexion fonctionnent sur la même page `/add`** : onglet QR Code
  (scan) et onglet Code (numéro → code de pairing), au choix.
- Nouvelle page `/commands` : liste de toutes les commandes disponibles (générée dynamiquement
  depuis le code, donc toujours à jour), avec le préfixe actuel affiché devant chaque commande.
- Préfixe des commandes modifiable depuis le dashboard (`runtime-config.js`, persisté sur
  disque, lit par `menu/case.js` — plus besoin de modifier le code pour changer `.` en autre chose).

### Image de menu
- L'image envoyée est utilisée comme illustration de `.menu` (`media/menu-images/menu.jpg`,
  déjà référencée dans `settings.js` → `menuImages.menu`).

## Corrections suite au retour utilisateur (bugs multiples)

### Vue unique (.réaction 👍)
- Le téléchargement se faisait trop tard : WhatsApp invalide le média côté serveur une fois
  ouvert. Le bot télécharge et décrypte désormais le média **dès sa réception** (`reaction.js`
  → `prefetchViewOnce`, appelé depuis `bot-engine.js`), et le garde en cache (`store.js`). La
  réaction 👍 renvoie ce buffer déjà prêt — ne retélécharge qu'en secours pour un média classique.

### Trace de l'ancien bot ("Tayyab")
- Trouvée dans `media/menu.js`, en police unicode stylisée (invisible à un grep normal) : nom
  et marque de l'ancien bot codés en dur dans le texte du menu principal.
- Images résiduelles `media/HELL.jpg` et `media/TAYYAB.jpg` supprimées (non utilisées par le
  code, mais toujours présentes dans le dépôt).

### Menu entièrement réécrit (`media/menu.js`)
- Nouveau style : cadre `textfx.box()` + police monospace partout (menu principal et les 16
  sous-menus), thème mafieux (🎩 Le Parrain, 🔫 L'Équipe, 🥂 Le Bar, etc.).
- Ne liste plus QUE des commandes réellement implémentées — l'ancienne version annonçait des
  dizaines de commandes anime par personnage (itachi, zerotwo, luffy...) qui n'ont jamais
  existé en code, d'où l'impression que "les nouvelles commandes ne marchent pas".
- Les menus sont maintenant des **fonctions** recalculées à chaque `.menu` (date/heure/uptime/
  préfixe à jour), plus des variables figées calculées une seule fois au démarrage.
- Chaque sous-menu a maintenant une image (la même que `.menu`, dupliquée en attendant
  d'autres visuels — `media/menu-images/*.jpg`).

### Commandes manquantes implémentées
- `.ghostping` : mentionne la cible (réponse à son message ou numéro en argument) puis
  supprime l'appel instantanément.
- `.save` : réponds à un média (photo/vidéo/audio, vue unique ou non) pour le recevoir dans
  tes messages personnels — équivalent manuel de la réaction 👍.
- `.help` corrigé : dépendait de `global.menu`, qui n'existe plus depuis la réécriture — pointe
  maintenant vers le vrai menu.

### Site web : connexion d'abord, dashboard caché, isolation par visiteur
- La page d'accueil (`/`) est maintenant directement l'écran de connexion (QR **ou** code,
  au choix) — plus besoin de mot de passe pour juste connecter un numéro.
- Chaque visiteur reçoit un cookie anonyme et ne voit/gère QUE les numéros qu'il a lui-même
  connectés depuis son navigateur — jamais ceux des autres.
- L'accès admin (tous les numéros, préfixe, liste des commandes) est caché derrière un petit
  repère discret en bas de la page d'accueil (5 clics) + un code d'accès séparé — déplacé sur
  `/admin` (ancien `/dashboard` → `/admin`, `/add` fusionné dans `/`).
- Thème visuel repensé : palette or/bordeaux/noir façon mafia, fond avec dégradés et grain
  subtil en CSS pur (aucune image externe nécessaire) — prêt à recevoir de vraies images de
  fond si tu veux m'en envoyer.
