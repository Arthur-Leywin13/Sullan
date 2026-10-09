// 📂 logo.js — Génère une image "logo" stylisée localement avec Jimp (aucune API externe,
// donc toujours fonctionnel, pas de dépendance à un site tiers qui peut disparaître).

const Jimp = require("jimp");

// Un style = un dégradé de fond + une couleur de texte ; facile à enrichir plus tard.
const STYLES = {
  logo:        { bg: [0x11, 0x11, 0x2a], text: 0xffffffff },
  d3comic:     { bg: [0xd9, 0x1e, 0x1e], text: 0xffffffff },
  dragonball:  { bg: [0xff, 0x8c, 0x00], text: 0x000000ff },
  deadpool:    { bg: [0x8b, 0x00, 0x00], text: 0xffffffff },
  blackpink:   { bg: [0xff, 0x6e, 0xc7], text: 0x000000ff },
  neonlight:   { bg: [0x0a, 0x0a, 0x0a], text: 0x00ffffff },
  cat:         { bg: [0xc9, 0x8a, 0x4e], text: 0x000000ff }
};

module.exports = async function logo({ conn, m, args, command, reply, chatId }) {
  const text = args.join(" ");
  if (!text) return reply(`✏️ Utilise : .${command} <texte>`);
  if (text.length > 20) return reply("⚠️ Texte trop long (20 caractères max).");

  try {
    const style = STYLES[command] || STYLES.logo;
    const img = new Jimp(600, 250, Jimp.rgbaToInt(style.bg[0], style.bg[1], style.bg[2], 255));
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
    img.print(font, 0, 0, { text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, 600, 250);
    const buffer = await img.getBufferAsync(Jimp.MIME_PNG);

    await conn.sendMessage(chatId, { image: buffer, caption: `🎨 Logo "${command}"` }, { quoted: m });
  } catch (err) {
    console.error("❌ Logo Error:", err.message || err);
    reply("⚠️ Erreur pendant la génération du logo.");
  }
};

module.exports.STYLES = STYLES;
