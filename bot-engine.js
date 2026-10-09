// 📂 bot-engine.js — Toute la logique de traitement des messages, extraite d'index.js pour
// être réutilisable par PLUSIEURS sessions WhatsApp en parallèle (multi-numéro).
//
// ⚠️ Limitation connue et assumée : les réglages (antibug, antilink, mode self/public...)
// restent des "flags" globaux au process (global.xxx), donc partagés entre toutes les
// sessions connectées, plutôt que propres à chaque numéro. Séparer ça proprement par
// session demanderait de réécrire la quasi-totalité des fichiers de commandes — hors
// scope raisonnable ici. Pour un usage mono-numéro (le cas normal), ça ne change rien.

const { handleCommand } = require("./menu/case");
const { loadSettings } = require("./settings");
const { storeMessage, handleMessageRevocation } = require("./antidelete");
const AntiLinkKick = require("./antilinkick.js");
const { antibugHandler } = require("./antibug.js");
const textfx = require("./textfx");
const store = require("./store");
const { handleReactionDownload, prefetchViewOnce } = require("./reaction");

function bindHandlers(sock) {
  const settings = typeof loadSettings === "function" ? loadSettings() : {};

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    // "notify" = message réellement nouveau (sinon : resynchronisation d'historique)
    if (type !== "notify") return;

    const msg = messages[0];
    if (!msg?.message || !msg.key?.remoteJid) return;

    store.save(msg); // cache pour le téléchargement par réaction 👍
    // Précharge IMMÉDIATEMENT les médias vue-unique (avant qu'ils ne soient ouverts et
    // invalidés par WhatsApp) — ne bloque pas le traitement du reste du message.
    prefetchViewOnce(msg).catch(() => {});

    const jid = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

    // ✅ AntiDelete
    if (settings.ANTIDELETE === true) {
      try {
        if (msg.message) storeMessage(msg);
        if (msg.message?.protocolMessage?.type === 0) {
          await handleMessageRevocation(sock, msg);
          return;
        }
      } catch (err) {
        console.error("❌ AntiDelete Error:", err.message);
      }
    }

    // ✅ AutoTyping
    if (global.autotyping && jid !== "status@broadcast" && !msg.key.fromMe) {
      try {
        await sock.sendPresenceUpdate("composing", jid);
        await new Promise(res => setTimeout(res, 2000));
      } catch (err) {
        console.error("❌ AutoTyping Error:", err.message);
      }
    }

    // ✅ AutoReact
    if (global.autoreact && jid !== "status@broadcast" && !msg.key.fromMe) {
      try {
        const hearts = [
          "❤️", "☣️", "🅣", "🧡", "💛", "💚", "💙", "💜",
          "🖤", "🤍", "🤎", "💕", "💞", "💓",
          "💗", "💖", "💘", "💝", "🇵🇰", "♥️"
        ];
        const randomHeart = hearts[Math.floor(Math.random() * hearts.length)];
        await sock.sendMessage(jid, { react: { text: randomHeart, key: msg.key } });
      } catch (err) {
        console.error("❌ AutoReact Error:", err.message);
      }
    }

    // ✅ AutoStatus View
    if (global.autostatus && jid === "status@broadcast") {
      try {
        await sock.readMessages([{
          remoteJid: jid,
          id: msg.key.id,
          participant: msg.key.participant || msg.participant
        }]);
      } catch (err) {
        console.error("❌ AutoStatus View Error:", err.message);
      }
    }

    // ✅ AutoStatusLike (réaction emoji instantanée — WhatsApp n'a pas de "réaction sticker")
    if (global.autostatuslike && jid === "status@broadcast" && !msg.key.fromMe) {
      try {
        const participant = msg.key.participant || msg.participant;
        const emoji = settings.STATUS_LIKE_EMOJI || "❤️";
        await sock.sendMessage(
          "status@broadcast",
          { react: { text: emoji, key: msg.key } },
          { statusJidList: [participant] }
        );

        if (settings.STATUS_LIKE_SEND_STICKER_DM && settings.STATUS_LIKE_STICKER_PATH) {
          const fs = require("fs");
          const stickerBuf = fs.readFileSync(settings.STATUS_LIKE_STICKER_PATH);
          await sock.sendMessage(participant, { sticker: stickerBuf });
        }
      } catch (err) {
        console.error("❌ AutoStatusLike Error:", err.message);
      }
    }

    if (jid === "status@broadcast") return;

    // ✅ Antilink
    if (
      jid.endsWith("@g.us") &&
      global.antilink[jid] === true &&
      /(chat\.whatsapp\.com|t\.me|discord\.gg|wa\.me|bit\.ly|youtu\.be|https?:\/\/)/i.test(text) &&
      !msg.key.fromMe
    ) {
      try {
        await sock.sendMessage(jid, {
          delete: { remoteJid: jid, fromMe: false, id: msg.key.id, participant: msg.key.participant || msg.participant }
        });
      } catch (err) {
        console.error("❌ Antilink Delete Error:", err.message);
      }
    }

    // ✅ AntilinkKick
    if (
      jid.endsWith("@g.us") &&
      global.antilinkick[jid] === true &&
      /(chat\.whatsapp\.com|t\.me|discord\.gg|wa\.me|bit\.ly|youtu\.be|https?:\/\/)/i.test(text) &&
      !msg.key.fromMe
    ) {
      try {
        await AntiLinkKick.checkAntilinkKick({ conn: sock, m: msg });
      } catch (err) {
        console.error("❌ AntilinkKick Error:", err.message || err);
      }
    }

    // ✅ AntiBug
    if (global.antibug === true && !msg.key.fromMe) {
      try {
        const isBug = await antibugHandler({ conn: sock, m: msg });
        if (isBug) return;
      } catch (err) {
        console.error("❌ AntiBug Error:", err.message || err);
      }
    }

    // ✅ Command handler
    try {
      await handleCommand(sock, msg, {});
    } catch (err) {
      console.error("❌ Command error:", err.message || err);
    }
  });

  // ✅ AutoGreet
  sock.ev.on("group-participants.update", async (update) => {
    const { id, participants, action } = update;
    if (!global.autogreet?.[id]) return;

    try {
      const metadata = await sock.groupMetadata(id);
      const memberCount = metadata.participants.length;
      const groupName = metadata.subject || "Unnamed Group";
      const groupDesc = metadata.desc?.toString() || "No description set.";

      for (const user of participants) {
        const tag = `@${user.split("@")[0]}`;
        let message = "";
        const M = textfx.monospace; // jamais appliqué au @tag (casserait la mention)

        if (action === "add") {
          message =
`> *╭─❮ ❍ ${M("SULLIVAN")} ❍ ❯*
> *│ ✦ ${M("BIENVENUE")} ${tag}*
> *│ ✦ ${M("GROUPE")} ➜ ${groupName}*
> *│ ✦ ${M("MEMBRES")} ➜ ${memberCount}*
> *│ ✦ ${M("DESCRIPTION")} ➜ ${groupDesc}*
> *╰┄┄┄┄┄┄┄┄┄┄┄⪼*`;
        } else if (action === "remove") {
          message =
`> *╭─❮ ❍ ${M("SULLIVAN")} ❍ ❯*
> *│ ✦ ${M("DEPART")} ➜ ${tag}*
> *│ ✦ ${M("MEMBRES RESTANTS")} ➜ ${memberCount - 1}*
> *╰┄┄┄┄┄┄┄┄┄┄┄⪼*`;
        }

        if (message) await sock.sendMessage(id, { text: message, mentions: [user] });
      }
    } catch (err) {
      console.error("❌ AutoGreet Error:", err.message);
    }
  });

  // ✅ Téléchargement par réaction 👍 (remplace l'ancienne commande .vv)
  sock.ev.on("messages.reaction.update", async (reactions) => {
    for (const item of reactions) {
      try { await handleReactionDownload(sock, item); }
      catch (err) { console.error("❌ Reaction Listener Error:", err.message); }
    }
  });
}

module.exports = { bindHandlers };
