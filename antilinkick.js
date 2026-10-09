// 📂 antilinkick.js — Supprime ET expulse pour tout lien d'invitation externe
// (WhatsApp, wa.me, Discord, Telegram) ; YouTube/Instagram/TikTok restent autorisés.

const ALLOWLIST = ["youtube.com", "youtu.be", "instagram.com", "tiktok.com"];
const BLOCKLIST = ["chat.whatsapp.com/", "whatsapp.com/channel/", "wa.me/", "discord.gg/", "t.me/"];

module.exports = async function antilinkick({ m, isGroup, args, reply }) {
  try {
    if (!isGroup) return reply("🚫 Cette commande est réservée aux *groupes* !");

    const mode = args[0]?.toLowerCase();
    if (!["on", "off"].includes(mode)) {
      return reply(
        "〔 🛡️ *ANTI-LINK-KICK SYSTEM* 〕\n" +
        "┃ Usage :\n" +
        "┃   .antilinkkick on\n" +
        "┃   .antilinkkick off\n" +
        "╰━━━━━━━━━━━━━━━━━━━╯"
      );
    }

    const chatId = m.key?.remoteJid;
    if (!chatId) return reply("❌ *ID de discussion invalide.*");

    global.antilinkick = global.antilinkick || {};
    global.antilinkick[chatId] = mode === "on";
    reply(
      `〔 🛡️ *ANTI-LINK-KICK STATUS* 〕\n` +
      `┃ 🚦 Réglage : *${mode.toUpperCase()}*\n` +
      `┃ 👢 Lien détecté = Kick + Suppression\n` +
      `╰━━━━━━━━━━━━━━━━━━━╯`
    );
  } catch (err) {
    console.error("❌ Toggle AntilinkKick Error:", err);
    reply("💥 Erreur système pendant l'activation/désactivation.");
  }
};

module.exports.checkAntilinkKick = async function checkAntilinkKick({ conn, m }) {
  try {
    const chatId = m.key?.remoteJid;
    if (!chatId || !global.antilinkick?.[chatId]) return;

    const text = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
    if (!text.includes("http")) return;

    const sender = m.key.participant || m.participant || m.key.remoteJid;
    const botId = (conn.user?.id?.split(":")[0]?.replace(/[^0-9]/g, "") || "") + "@s.whatsapp.net";

    const lower = text.toLowerCase();
    const isBlocked = BLOCKLIST.some(k => lower.includes(k));
    const isAllowed = ALLOWLIST.some(k => lower.includes(k));
    if (!isBlocked || isAllowed) return;

    const meta = await conn.groupMetadata(chatId);
    const senderIsAdmin = meta.participants.some(p => p.id === sender && (p.admin === "admin" || p.admin === "superadmin"));
    const botIsAdmin = meta.participants.some(p => p.id === botId && (p.admin === "admin" || p.admin === "superadmin"));

    if (senderIsAdmin) return;   // jamais expulser un admin
    if (!botIsAdmin) return;     // le bot doit être admin pour agir

    if (m.key.id) {
      await conn.sendMessage(chatId, {
        delete: { remoteJid: chatId, id: m.key.id, fromMe: m.key.fromMe || false, participant: sender }
      });
    }

    await conn.groupParticipantsUpdate(chatId, [sender], "remove");
    await conn.sendMessage(chatId, {
      text: `⚠️ *[ ANTI-LINK-KICK ]* ⚠️\n\n🗑️ Lien détecté et supprimé !\n👤 Utilisateur : @${sender.split("@")[0]}\n👢 Action : Kick + Suppression`,
      mentions: [sender]
    });
  } catch (err) {
    console.error("❌ AntilinkKick Error:", err);
  }
};
