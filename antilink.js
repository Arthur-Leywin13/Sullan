// 📂 antilink.js — Supprime les liens d'invitation WhatsApp postés dans un groupe
// (YouTube/Instagram/TikTok restent autorisés).

const ALLOWLIST = ["youtube.com", "youtu.be", "instagram.com", "tiktok.com"];
const BLOCKLIST = ["chat.whatsapp.com/", "whatsapp.com/channel/"];

module.exports = async function antilink({ m, isGroup, args, reply }) {
  try {
    if (!isGroup) return reply("🚫 Cette commande fonctionne uniquement dans les *groupes* !");

    const mode = args[0]?.toLowerCase();
    if (!["on", "off"].includes(mode)) {
      return reply(
        "〔 🛡️ *ANTI-LINK SYSTEM* 〕\n" +
        "┃ Usage :\n" +
        "┃   .antilink on\n" +
        "┃   .antilink off\n" +
        "╰━━━━━━━━━━━━━━━╯"
      );
    }

    const chatId = m.key.remoteJid;
    global.antilink = global.antilink || {};
    global.antilink[chatId] = mode === "on";
    reply(
      `〔 🛡️ *ANTI-LINK STATUS* 〕\n` +
      `┃ 🚦 Réglage : *${mode.toUpperCase()}*\n` +
      `┃ 🔒 Groupe protégé\n` +
      `╰━━━━━━━━━━━━━━━━╯`
    );
  } catch (err) {
    console.error("❌ Antilink Command Error:", err);
    reply("💥 Erreur pendant l'activation/désactivation de l'AntiLink.");
  }
};

module.exports.checkAntilink = async function checkAntilink({ conn, m }) {
  try {
    const chatId = m.key.remoteJid;
    if (!global.antilink?.[chatId]) return;

    const text = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
    if (!text.includes("http")) return;

    const lower = text.toLowerCase();
    const isBlocked = BLOCKLIST.some(k => lower.includes(k));
    const isAllowed = ALLOWLIST.some(k => lower.includes(k));
    if (!isBlocked || isAllowed) return;

    const sender = m.key.participant || m.participant || m.key.remoteJid;
    const botId = conn.user?.id;

    const meta = await conn.groupMetadata(chatId);
    const senderIsAdmin = meta.participants.some(p => p.id === sender && (p.admin === "admin" || p.admin === "superadmin"));
    const botIsAdmin = meta.participants.some(p => p.id === botId && (p.admin === "admin" || p.admin === "superadmin"));

    if (senderIsAdmin || !botIsAdmin) return;

    await conn.sendMessage(chatId, { delete: m.key });
    await conn.sendMessage(chatId, {
      text: `⚠️ *[ ANTI-LINK ]* ⚠️\n\n❌ Lien détecté et supprimé !\n👤 Utilisateur : @${sender.split("@")[0]}`,
      mentions: [sender]
    });
  } catch (err) {
    console.error("❌ Antilink Handler Error:", err);
  }
};
