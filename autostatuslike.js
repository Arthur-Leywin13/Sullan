// 📂 autostatuslike.js — Active/désactive la réaction automatique instantanée aux statuts.
//
// ⚠️ Important (limite du protocole WhatsApp, pas de ma conception) :
// WhatsApp ne permet de "liker" un statut qu'avec un EMOJI de réaction native.
// Il n'existe pas de "réaction sticker" officielle sur les statuts.
// Ce module envoie donc une vraie réaction emoji instantanée (ex: ❤️) dès qu'un
// contact poste un statut. Si tu veux vraiment un sticker, l'alternative la plus
// proche est d'envoyer le sticker en message privé au contact juste après son statut
// (option STATUS_LIKE_SEND_STICKER_DM ci-dessous) — mais c'est un message direct non
// sollicité, pas une "réaction" au sens WhatsApp. Désactivé par défaut.

module.exports = async function autostatuslike({ args, reply }) {
  const mode = args[0]?.toLowerCase();
  if (!["on", "off"].includes(mode)) {
    return reply(
      "〔 ❤️ *AUTO STATUS LIKE* 〕\n" +
      "┃ .autostatuslike on  → Active\n" +
      "┃ .autostatuslike off → Désactive\n" +
      "┃\n" +
      "┃ Réagit instantanément (emoji) à chaque\n" +
      "┃ statut posté par tes contacts.\n" +
      "╰━━━━━━━━━━━━━━━━━━━━━━━━━╯"
    );
  }
  global.autostatuslike = mode === "on";
  reply(`❤️ Auto Status Like : *${mode.toUpperCase()}*`);
};
