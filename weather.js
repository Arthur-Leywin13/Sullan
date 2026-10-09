// 📂 weather.js — Météo réelle via Open-Meteo (gratuit, sans clé API) + image d'icône

const axios = require("axios");

// Codes météo Open-Meteo → emoji + description FR
const CODES = {
  0: ["☀️", "Ciel dégagé"], 1: ["🌤️", "Plutôt dégagé"], 2: ["⛅", "Partiellement nuageux"],
  3: ["☁️", "Couvert"], 45: ["🌫️", "Brouillard"], 48: ["🌫️", "Brouillard givrant"],
  51: ["🌦️", "Bruine légère"], 53: ["🌦️", "Bruine"], 55: ["🌧️", "Bruine forte"],
  61: ["🌧️", "Pluie légère"], 63: ["🌧️", "Pluie"], 65: ["⛈️", "Pluie forte"],
  71: ["🌨️", "Neige légère"], 73: ["🌨️", "Neige"], 75: ["❄️", "Neige forte"],
  80: ["🌦️", "Averses"], 81: ["🌧️", "Averses fortes"], 82: ["⛈️", "Averses violentes"],
  95: ["⛈️", "Orage"], 96: ["⛈️", "Orage avec grêle"], 99: ["⛈️", "Orage violent"]
};

// Image d'icône correspondant au temps (service public, pas de clé requise)
function iconUrl(code, isDay) {
  const key = CODES[code] ? code : 0;
  const day = isDay ? "day" : "night";
  return `https://raw.githubusercontent.com/basmilius/weather-icons/dev/production/fill/svg/${
    code === 0 ? (isDay ? "clear-day" : "clear-night") : "overcast"
  }.svg`.replace(".svg", ".png"); // le dépôt sert aussi des PNG sous /png/
}

module.exports = async function weather({ conn, m, args, reply, chatId }) {
  const city = args.join(" ");
  if (!city) return reply("✏️ Utilise : .weather <ville>");

  try {
    const geo = await axios.get("https://geocoding-api.open-meteo.com/v1/search", {
      params: { name: city, count: 1, language: "fr" }, timeout: 10000
    });
    const place = geo.data?.results?.[0];
    if (!place) return reply(`❌ Ville introuvable : ${city}`);

    const fc = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: place.latitude, longitude: place.longitude,
        current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day"
      },
      timeout: 10000
    });
    const cur = fc.data.current;
    const [emoji, desc] = CODES[cur.weather_code] || ["❓", "Inconnu"];

    const caption =
      `${emoji} *Météo à ${place.name}, ${place.country}*\n\n` +
      `🌡️ Température : *${cur.temperature_2m}°C*\n` +
      `💧 Humidité : ${cur.relative_humidity_2m}%\n` +
      `💨 Vent : ${cur.wind_speed_10m} km/h\n` +
      `📋 Conditions : ${desc}`;

    // On tente d'envoyer une image d'illustration ; sinon on retombe sur du texte seul.
    try {
      const imgRes = await axios.get(
        `https://source.unsplash.com/600x400/?weather,${encodeURIComponent(desc)}`,
        { responseType: "arraybuffer", timeout: 10000 }
      );
      await conn.sendMessage(chatId, { image: Buffer.from(imgRes.data), caption }, { quoted: m });
    } catch {
      await reply(caption);
    }
  } catch (err) {
    console.error("❌ Weather Error:", err.message || err);
    reply("⚠️ Erreur pendant la récupération de la météo.");
  }
};
