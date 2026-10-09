// 📂 pair.js — .pair <numéro> : démarre une nouvelle session (multi-numéro) et renvoie le
// code de pairing dans le chat, pour aider quelqu'un d'autre à connecter son propre numéro
// sur Sullivan. Réservé à l'owner (voir ownerOnlyCommands dans menu/case.js).

module.exports = async function pair({ args, reply }) {
  const number = (args[0] || "").replace(/\D/g, "");
  if (!number) {
    return reply(
      "✏️ Utilise : .pair <numéro avec indicatif pays>\n" +
      "Exemple : .pair 50912345678"
    );
  }

  const sessions = global.sessions;
  if (!sessions) return reply("❌ Gestionnaire de sessions indisponible.");

  const existing = sessions.listSessions().find(s => s.number === number);
  if (existing) return reply(`ℹ️ Ce numéro est déjà connecté (session \`${existing.id}\`).`);

  const id = "session-" + number;
  await reply("⏳ Génération du code de pairing...");

  try {
    await sessions.startSession(id, {
      phoneNumber: number,
      onPairingCode: (code) => {
        reply(
          `🔗 *Code de pairing pour ${number}*\n\n` +
          `   ${code}\n\n` +
          `À entrer dans WhatsApp → Appareils liés → Lier avec un numéro de téléphone, ` +
          `dans les ~60 secondes. Transmets ce code à la personne concernée.`
        );
      },
      onConnected: (num) => reply(`✅ Le numéro ${num} est maintenant connecté à Sullivan.`)
    });
  } catch (err) {
    console.error("❌ .pair Error:", err.message || err);
    reply("⚠️ Erreur pendant la création de la session.");
  }
};
