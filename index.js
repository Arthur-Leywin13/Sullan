// 📂 index.js — Point d'entrée. Démarre le site web (connexion QR/code en page d'accueil,
// dashboard admin caché derrière un code d'accès) et, si un terminal interactif est
// disponible, propose aussi le pairing par code directement dans la console. Sur un
// hébergeur comme Railway (pas de terminal interactif), tout se fait depuis le site web.

const readline = require("readline");
const sessions = require("./sessions");
const { loadSettings } = require("./settings");
const { startWebServer } = require("./web/server");
const runtimeConfig = require("./runtime-config");

async function main() {
  const settings = typeof loadSettings === "function" ? loadSettings() : {};
  const ownerRaw = settings.ownerNumber?.[0] || "92300xxxxxxx";

  global.settings = settings;
  global.signature = settings.signature || "> Sullivan ❦ ✓";
  global.owner = ownerRaw.includes("@s.whatsapp.net") ? ownerRaw : ownerRaw + "@s.whatsapp.net";
  global.ownerNumber = ownerRaw;
  global.sessions = sessions; // utilisé par .pair et par le site web
  global.prefix = runtimeConfig.getPrefix(); // préfixe des commandes, modifiable depuis le site web

  // ✅ Réglages (partagés entre sessions — voir la note dans bot-engine.js)
  global.mode = "self";
  global.antilink = {};
  global.antilinkick = {};
  global.antibug = false;
  global.autogreet = {};
  global.autotyping = false;
  global.autoreact = false;
  global.autostatus = false;
  global.autostatuslike = false;

  console.log("✅ BOT OWNER:", global.owner);

  // Railway (et la plupart des hébergeurs) n'offrent pas de terminal interactif au runtime :
  // process.stdin.isTTY est alors false/undefined. Dans ce cas, on ne tente PAS de lire un
  // numéro au clavier (ça resterait bloqué indéfiniment) — tout se fait depuis /add sur le site.
  const interactive = Boolean(process.stdin.isTTY);

  // Port : Railway (et la plupart des PaaS) imposent le port via la variable d'env PORT.
  const port = process.env.PORT || settings.WEB_PORT || 3000;
  startWebServer(port);

  if (interactive) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (text) => new Promise((resolve) => rl.question(text, resolve));

    await sessions.startSession("main", {
      authDir: "auth_info", // conserve le dossier historique, compatible avec un pairing déjà fait
      getPhoneNumber: () => question("📱 Entre ton numéro WhatsApp (avec l'indicatif pays) : "),
      onPairingCode: (code) => {
        console.log("\n🔗 Lie cet appareil avec ce code dans WhatsApp (valable ~60 secondes) :\n");
        console.log("   " + code + "\n");
        console.log("WhatsApp → Appareils liés → Lier avec un numéro de téléphone.");
      },
      onConnected: () => {
        console.log("✅ [BOT ONLINE] Connecté à WhatsApp !");
        rl.close();
      }
    });
  } else {
    console.log("ℹ️ Aucun terminal interactif détecté (normal sur Railway).");
    console.log(`🌐 Va sur le site web (port ${port}) pour connecter un numéro (QR ou code).`);
  }
}

main();
