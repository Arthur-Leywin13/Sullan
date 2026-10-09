// 📂 photo.js — Photos/wallpapers par mot-clé via l'API Pexels (gratuite).
// Crée ta clé sur https://www.pexels.com/api/ puis mets-la dans settings.js → PEXELS_API_KEY.

const axios = require("axios");
const { loadSettings } = require("./settings");

// mapping commande du menu → mot-clé de recherche
const KEYWORDS = {
  art: "digital art", wallpaper: "wallpaper", gamewallpaper: "gaming wallpaper",
  cyber: "cyberpunk", gremory: "fantasy demon art", hacker: "hacker computer",
  hestia: "goddess anime art", jibril: "anime angel art", rose: "rose flower",
  technology: "technology", pubg: "pubg game", freefire: "free fire game",
  mountain: "mountain landscape", islamic: "islamic calligraphy", dog: "dog",
  imgcat: "cat"
};

module.exports = async function photo({ conn, m, command, reply, chatId }) {
  const settings = loadSettings();
  const apiKey = settings.PEXELS_API_KEY;
  if (!apiKey) {
    return reply("❌ Aucune clé PEXELS_API_KEY configurée dans settings.js (gratuite sur pexels.com/api).");
  }

  const query = KEYWORDS[command] || command;
  try {
    const { data } = await axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: apiKey },
      params: { query, per_page: 15, page: Math.floor(Math.random() * 3) + 1 },
      timeout: 10000
    });
    const photos = data.photos || [];
    if (!photos.length) return reply("⚠️ Aucune image trouvée pour cette catégorie.");

    const pick = photos[Math.floor(Math.random() * photos.length)];
    const { data: imgBuffer } = await axios.get(pick.src.large, { responseType: "arraybuffer", timeout: 15000 });

    await conn.sendMessage(chatId, {
      image: Buffer.from(imgBuffer),
      caption: `🖼️ ${command} — photo par ${pick.photographer} (Pexels)`
    }, { quoted: m });
  } catch (err) {
    console.error("❌ Photo Error:", err.message || err);
    reply("⚠️ Erreur pendant la récupération de l'image.");
  }
};

module.exports.KEYWORDS = KEYWORDS;
