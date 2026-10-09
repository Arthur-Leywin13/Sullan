// 📂 poll.js — Sondage natif WhatsApp (via le type de message "poll" de Baileys)
// Usage : .poll Question ? | option1 | option2 | option3

module.exports = async function poll({ conn, args, reply, chatId }) {
  const raw = args.join(" ");
  const parts = raw.split("|").map(s => s.trim()).filter(Boolean);
  if (parts.length < 3) {
    return reply("✏️ Utilise : .poll Question ? | option1 | option2 | option3 (2 options minimum)");
  }
  const [name, ...values] = parts;
  try {
    await conn.sendMessage(chatId, {
      poll: { name, values: values.slice(0, 12), selectableCount: 1 }
    });
  } catch (err) {
    console.error("❌ Poll Error:", err.message || err);
    reply("⚠️ Ta version de Baileys ne supporte peut-être pas les sondages natifs.");
  }
};
