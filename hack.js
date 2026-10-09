// 📂 hack.js — Effet visuel purement décoratif ("faux terminal"), pour le fun.
// Ne fait RIEN de réel : aucune commande système, aucun accès réseau, aucune cible.

module.exports = async function hack({ args, reply }) {
  const target = args.join(" ") || "le système";
  const steps = [
    `🔍 Scan de ${target}...`,
    "🔓 Contournement du pare-feu... [simulation]",
    "📡 Interception de paquets... [simulation]",
    "💾 Extraction de données... [simulation]",
    `✅ "Piratage" de ${target} terminé (c'est pour le fun, rien de réel ne s'est passé 😄)`
  ];
  for (const line of steps) {
    await reply(line);
    await new Promise(r => setTimeout(r, 700));
  }
};
