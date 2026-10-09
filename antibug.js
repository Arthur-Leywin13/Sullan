// 📂 antibug.js — Détecte et neutralise les messages "bugués" connus (vCard piégées,
// flood de caractères invisibles, RTL override, chaînes géantes, etc.) et nettoie le groupe/DM.

const CRASH_PATTERNS = [
  /waiting for this msg/i,
  /vnd\.android\.cursor\.item\/vcard/i,
  /\u200B/g, /\u200C/g, /\u200D/g, /\u2060/g, /\uFEFF/g,
  /.{600,}/,
  /([\uD800-\uDBFF][\uDC00-\uDFFF]){50,}/,
  /(\uFFFD){20,}/,
  /(\u034F){10,}/,
  /https?:\/\/\S{500,}/,
  /(\u202E|\u202D)/,
  /(\u00AD){10,}/,
  /(\u25A0|\u25A1){30,}/,
  /(\u2800){10,}/,
  /(\u1D17){5,}/,
  /\uFFF9|\uFFFA|\uFFFB/,
  /(\u3000){10,}/,
  /(\u200E|\u200F){10,}/,
  /(\uA9BE|\uA9BF|\uA9BD|\uA9C0){3,}/,
  /[\u0E00-\u0E7F]{30,}/,
  /[\u1000-\u109F]{30,}/,
  /[\uA980-\uA9DF]{30,}/,
  /[\u1B00-\u1B7F]{30,}/,
  /[\uFE10-\uFE1F]{10,}/
];

module.exports = async function antibug({ args, reply }) {
  try {
    const mode = args[0]?.toLowerCase();
    if (!["on", "off"].includes(mode)) {
      return reply(
        "〔 ⚡ *ANTI-BUG SYSTEM* ⚡ 〕\n" +
        "┃ ✨ Usage :\n" +
        "┃    🛡️ .antibug on  → Active la protection\n" +
        "┃    📴 .antibug off → Désactive la protection\n" +
        "┃\n" +
        "┃ 💡 Protège contre :\n" +
        "┃    • Crashs Unicode\n" +
        "┃    • Flood\n" +
        "┃    • Messages/fichiers piégés\n" +
        "╰━━━━━━━━━━━━━━━━╯"
      );
    }
    global.antibug = mode === "on";
    reply(
      `〔 🛡️ *ANTI-BUG STATUS* 🛡️ 〕\n` +
      `┃ 🔰 Protection : *${mode.toUpperCase()}*\n` +
      `┃ ⚔️ Nettoyage automatique des messages dangereux\n` +
      `╰━━━━━━━━━━━━╯`
    );
  } catch (err) {
    console.error("❌ AntiBug Command Error:", err);
    reply("💥 Erreur pendant l'activation/désactivation de l'AntiBug.");
  }
};

// Appelé par index.js sur chaque message entrant quand global.antibug === true
module.exports.antibugHandler = async function antibugHandler({ conn, m }) {
  try {
    if (!global.antibug) return;
    const text = m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || "";
    if (!text) return;

    for (const pattern of CRASH_PATTERNS) {
      if (!pattern.test(text)) continue;

      const chatId = m.key.remoteJid;
      const offender = m.key.participant || m.key.remoteJid;

      await conn.sendMessage(chatId, { delete: m.key });

      if (chatId.endsWith("@g.us")) {
        const meta = await conn.groupMetadata(chatId);
        const botId = conn.user.id.split(":")[0] + "@s.whatsapp.net";
        const botEntry = meta.participants.find(p => p.id === botId);
        const botIsAdmin = botEntry?.admin === "admin" || botEntry?.admin === "superadmin";

        if (botIsAdmin) {
          await conn.groupParticipantsUpdate(chatId, [offender], "remove");
          await conn.updateBlockStatus(offender, "block");
          await conn.sendMessage(chatId, {
            text: "🚨 *BUG DÉTECTÉ !* 🚨\n⚠️ Contenu malveillant détecté.\n\n👢 L'expéditeur a été *retiré et bloqué*."
          });
        } else {
          await conn.sendMessage(chatId, {
            text: "⚠️ *BUG DÉTECTÉ !* Message supprimé.\n(Le bot n'est pas admin, impossible de retirer l'expéditeur.)"
          });
        }
      } else {
        await conn.updateBlockStatus(offender, "block");
        await conn.sendMessage(chatId, { text: "⚠️ *BUG DÉTECTÉ EN PRIVÉ !* Expéditeur bloqué." });
      }

      console.log("🚨 Bug detected & handled!");
      return true;
    }
  } catch (err) {
    console.error("❌ AntiBug Handler Error:", err);
  }
};
