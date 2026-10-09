// 📂 anime.js — Images/GIFs de réaction via l'API publique waifu.pics (gratuite, sans clé)
const axios = require("axios");

// mapping commande → endpoint waifu.pics (catégorie sfw)
const ENDPOINTS = {
  waifu: "waifu", neko: "neko", neko2: "neko",
  hug: "hug", kiss: "kiss", pat: "pat", cuddle: "cuddle",
  cry: "cry", slap: "slap", kill: "kill", smile: "smile",
  blush: "blush", bite: "bite", love: "hug", baka: "baka"
};

async function sendAnime({ conn, m, command, reply, chatId }) {
  const endpoint = ENDPOINTS[command];
  if (!endpoint) return reply("❌ Catégorie inconnue.");

  try {
    const { data } = await axios.get(`https://api.waifu.pics/sfw/${endpoint}`, { timeout: 10000 });
    if (!data?.url) return reply("⚠️ Image introuvable, réessaie.");

    const { data: imgBuffer } = await axios.get(data.url, { responseType: "arraybuffer", timeout: 15000 });
    await conn.sendMessage(chatId, {
      image: Buffer.from(imgBuffer),
      caption: `✨ ${command.toUpperCase()}`
    }, { quoted: m });
  } catch (err) {
    console.error("❌ Anime Error:", err.message || err);
    reply("⚠️ Erreur en récupérant l'image.");
  }
}

module.exports = { sendAnime, ENDPOINTS };
