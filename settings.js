// ✅ Configuration Sullivan Bot

const ownerNumber = require('./Owner/owner'); // 🔗 Exemple : ['923123456789']

const config = {
  // 👑 Infos Owner
  ownerNumber,
  ownerName: 'Sullivan',
  botName: 'Sullivan',
  signature: '> Sullivan ✓',
  channelLink: '', // 📢 lien de ton canal WhatsApp, affiché par .channel

  // 🔑 Clés API (laisse vide pour désactiver la fonctionnalité correspondante)
  GROQ_API_KEY: '',           // .chatgpt / .llama / .claude / .mistral
  PEXELS_API_KEY: '',         // .wallpaper / .cyber / .dog / .rose / etc (gratuit sur pexels.com/api)
  GITHUB_TOKEN: '',           // .gitfollow (Personal Access Token, scope 'user:follow')
  WEB_PORT: 3000,              // port du site web (QR + tableau de bord)
  DASHBOARD_PASSCODE: 'Sullivan08', // code demandé après les 5 clics sur le logo
  // La météo (Open-Meteo) et les commandes anime (waifu.pics) sont gratuites, sans clé.

  // ⚙️ Fonctionnalités
  autoTyping: false,
  autoReact: false,
  autoStatusView: false,
  STATUS_LIKE_EMOJI: '❤️',              // emoji utilisé par .autostatuslike
  STATUS_LIKE_SEND_STICKER_DM: false,   // true = envoie aussi un sticker en DM (intrusif, off par défaut)
  STATUS_LIKE_STICKER_PATH: '',         // ex: './media/stickers/like.webp'
  public: true,
  antiLink: false,
  antiBug: false,
  greetings: true,
  readmore: false,
  ANTIDELETE: true,

  // 🖼️ Images jointes aux menus (dépose les fichiers dans media/menu-images/
  // avec ces noms exacts ; si le fichier n'existe pas, le menu part en texte seul)
  menuImages: {
    menu: 'media/menu-images/menu.jpg',
    ownermenu: 'media/menu-images/ownermenu.jpg',
    downloadmenu: 'media/menu-images/downloadmenu.jpg',
    groupmenu: 'media/menu-images/groupmenu.jpg',
    automenu: 'media/menu-images/automenu.jpg',
    aimenu: 'media/menu-images/aimenu.jpg',
    githubmenu: 'media/menu-images/githubmenu.jpg',
    logomenu: 'media/menu-images/logomenu.jpg',
    toolsmenu: 'media/menu-images/toolsmenu.jpg',
    textmenu: 'media/menu-images/textmenu.jpg',
    utilitymenu: 'media/menu-images/utilitymenu.jpg',
    exploitsmenu: 'media/menu-images/exploitsmenu.jpg',
    photomenu: 'media/menu-images/photomenu.jpg',
    reactmenu: 'media/menu-images/reactmenu.jpg',
    gamemenu: 'media/menu-images/gamemenu.jpg',
    funmenu: 'media/menu-images/funmenu.jpg',
    animemenu: 'media/menu-images/animemenu.jpg'
  }
};

// ✅ Enregistre le(s) owner(s) au format JID WhatsApp
global.owner = (
  Array.isArray(ownerNumber) ? ownerNumber : [ownerNumber]
).map(num => num.replace(/\D/g, '') + '@s.whatsapp.net');

function loadSettings() {
  return config;
}

module.exports = { loadSettings };
