// Clean & Readable Command Handler
const fs = require("fs");
const path = require("path");
const { generateWAMessageFromContent } = require("@whiskeysockets/baileys");
const { toggleAntidelete } = require("../antidelete");
const { getQuoted, getMentioned } = require("../context");

// Default mode
if (!global.mode) global.mode = "self";

// Owner-only commands list
const ownerOnlyCommands = [
  "video2", "song2", "kick", "add", "nice", "tagall",
  "antilink", "antilinkick", "autostatus", "autoreact",
  "autogreet", "autotyping", "autoread", "block", "unblock",
  "shutdown", "restart", "setbio", "setname", "setpp", "save",
  "join", "delaymsg", "del", "reactch", "kickall", "antibug",
  "leave", "open", "close", "tagadmin", "hidetag", "listactive",
  "changename", "closetime", "warn", "promote", "demote",
  "promoteall", "demoteall", "say", "cpp", "harami", "ghostping",
  "adminkill", "delaymsg", "autorecording", "autostatuslike", "weather", "song", "video", "chatgpt", "llama", "claude", "mistral", "pair"
];

// Load menu.js
const menuData = {};
try {
  const menuPath = path.join(__dirname, "..", "media", "menu.js");
  Object.assign(menuData, require(menuPath));
} catch (err) {
  console.error("❌ Error loading menu.js:", err);
}

// Load core.js if exists
let core;
try {
  const corePath = path.join(__dirname, "./core.js");
  core = require(corePath);
} catch (err) {
  console.error("❌ Error loading core.js:", err);
}

// ===============================
// 🔹 MAIN COMMAND HANDLER
// ===============================
async function handleCommand(conn, msg) {
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  // Préfixe configurable (modifiable depuis le site web) — "." par défaut.
  const prefix = global.prefix || ".";
  if (!text.startsWith(prefix)) return;

  const parts = text.trim().split(/ +/);
  const command = parts[0].slice(prefix.length).toLowerCase();
  const args = parts.slice(1);

  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const senderId = msg.key.fromMe
    ? conn.user.id.split(":")[0] + "@s.whatsapp.net"
    : msg.key.participant || msg.key.remoteJid;

  const senderNum = senderId.replace(/\D/g, "");
  const botNum = (conn.user.id || "").replace(/\D/g, "");
  const isOwner = senderNum.slice(0, 10) === botNum.slice(0, 10);

  // ✅ Calcul réel du message cité ("reply to") et des mentions — jamais fait avant,
  // donc toutes les commandes basées sur "réponds à un message" (kick, promote, gpp...)
  // ne fonctionnaient pas. Ça ne lit que le contenu du message cité, jamais une photo
  // de profil ou la photo d'un autre groupe.
  msg.quoted = getQuoted(msg);
  msg.mentioned = getMentioned(msg);

  const reply = (text) => conn.sendMessage(chatId, { text }, { quoted: msg });

  // 🔸 Mode control
  if (command === "self") {
    if (!isOwner)
      return reply("🚫 *Only Owner Can Switch Modes*");

    global.mode = "self";
    return reply("🔒 BOT IS NOW IN *SELF MODE* — Only Owner can use me!");
  }

  if (command === "public") {
    if (!isOwner)
      return reply("🚫 *Only Owner Can Switch Modes*");

    global.mode = "public";
    return reply("🌍 BOT IS NOW IN *PUBLIC MODE* — Everyone can use me!");
  }

  // 🔸 Mode restrictions
  if (global.mode === "self" && !isOwner && !["menu", "repo", "idcheck"].includes(command)) {
    return;
  }

  if (global.mode === "public" && ownerOnlyCommands.includes(command) && !isOwner) {
    return reply("💀 *OWNER ONLY COMMAND!* You ain't my master londey!");
  }

  // 🔸 Direct calls
  if (["menu", "repo", "idcheck", "antidelete"].includes(command)) {
    return runCommand({
      conn,
      msg,
      args,
      command,
      chatId,
      isGroup,
      senderNum,
      reply
    });
  }

  // Default
  return runCommand({
    conn,
    msg,
    args,
    command,
    chatId,
    isGroup,
    senderNum,
    reply
  });
}

// ===============================
// 🔹 COMMAND EXECUTOR
// ===============================
async function runCommand({
  conn,
  msg,
  args,
  command,
  chatId,
  isGroup,
  senderNum,
  reply
}) {
  try {
    // 🔸 idcheck
    if (command === "idcheck") {
      const botId = conn.user.id || "";
      return reply(
        `🤖 *Bot ID:* ${botId}\n📤 *Sender JID:* ${
          msg.key.participant || msg.key.remoteJid
        }\n🔢 *Sender Clean:* ${senderNum}`
      );
    }

    // 🔸 menu message (avec image si disponible dans settings.menuImages)
    if (menuData[command]) {
      // Les menus sont des FONCTIONS (pas des chaînes figées) pour que la date/l'heure/
      // l'uptime/le préfixe affichés soient toujours à jour, et pas gelés au moment où le
      // bot a démarré (bug corrigé — avant, media/menu.js calculait tout une seule fois,
      // au premier chargement du fichier, puis resservait toujours le même texte).
      const menuText = typeof menuData[command] === "function" ? menuData[command]() : menuData[command];

      const { loadSettings } = require("../settings");
      const imgPath = loadSettings().menuImages?.[command];
      if (imgPath && fs.existsSync(path.join(__dirname, "..", imgPath))) {
        return conn.sendMessage(
          chatId,
          { image: fs.readFileSync(path.join(__dirname, "..", imgPath)), caption: menuText },
          { quoted: msg }
        );
      }
      const menuMessage = generateWAMessageFromContent(
        chatId,
        { extendedTextMessage: { text: menuText } },
        { userJid: chatId }
      );
      return await conn.relayMessage(chatId, menuMessage.message, {
        messageId: menuMessage.key.id
      });
    }

    // 🔸 antidelete handler
    if (command === "antidelete") {
      return toggleAntidelete({ conn, m: msg, args, reply, jid: chatId });
    }

    // 🔸 core functions
    // BUG CORRIGÉ : seule la clé `jid` était transmise, mais la quasi-totalité des
    // commandes (weather, song, video, anime, logo, photo, core.js...) attendent `chatId`
    // → elles recevaient `undefined` à la place du salon. On transmet désormais les deux
    // noms pour couvrir toutes les commandes (anciennes et nouvelles) sans les réécrire.
    if (core && core[command] && typeof core[command] === "function") {
      return await core[command]({
        conn,
        m: msg,
        args,
        command,
        jid: chatId,
        chatId,
        isGroup,
        sender: senderNum,
        reply
      });
    }

    // 🔸 individual command files
    const filePath = path.join(__dirname, "..", `${command}.js`);
    if (fs.existsSync(filePath)) {
      const commandFile = require(filePath);
      const ctx = { conn, m: msg, args, command, jid: chatId, chatId, isGroup, sender: senderNum, reply };
      if (typeof commandFile === "function") return await commandFile(ctx);
      if (typeof commandFile.execute === "function") return await commandFile.execute(ctx);
      if (typeof commandFile.run === "function") return await commandFile.run(ctx);
    }

    // 🔸 unknown command
    return reply("*ᴜɴᴋɴᴏᴡɴ ᴄᴏᴍᴍᴀɴᴅ! ᴛʀʏ `.ᴍᴇɴᴜ` ʙᴇꜰᴏʀᴇ sʜᴏᴡɪɴɢ ᴏꜰꜰ 𓄀*");

  } catch (err) {
    console.error("⚠️ Error in command execution:", err);
    return reply("⚠️ Error in command execution!");
  }
}

// ===============================
// 🔹 Export
// ===============================
module.exports = {
  handleCommand
};