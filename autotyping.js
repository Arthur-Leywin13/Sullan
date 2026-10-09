// 📂 autotyping.js — Active/désactive la simulation de frappe ("en train d'écrire...").
// La logique d'envoi de présence vit dans index.js (global.autotyping) ; ce fichier
// ne gère que le toggle.

module.exports = async function autotyping({ args, reply }) {
  const mode = args[0]?.toLowerCase();
  if (!["on", "off"].includes(mode)) {
    return reply(
      "〔 ⌨️ *AUTO-TYPING* 〕\n" +
      "┃ Usage :\n" +
      "┃   .autotyping on\n" +
      "┃   .autotyping off\n" +
      "┃\n" +
      "┃ Simule la frappe avant chaque réponse.\n" +
      "╰━━━━━━━━━━━━━━━━━━━╯"
    );
  }
  global.autotyping = mode === "on";
  reply(`⌨️ *AUTO-TYPING* : Statut *${mode === "on" ? "🟢 ACTIVÉ" : "🔴 DÉSACTIVÉ"}*`);
};
