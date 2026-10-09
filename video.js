// 📂 video.js — Recherche YouTube + téléchargement + envoi réel de la vidéo

const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");

function bufferFromStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

module.exports = async function video({ conn, m, args, reply, chatId }) {
  const query = args.join(" ");
  if (!query) return reply("✏️ Utilise : .video <titre>");

  try {
    await reply(`🔎 Recherche en cours : *${query}*...`);

    const search = await yts(query);
    const result = search.videos?.[0];
    if (!result) return reply("❌ Aucun résultat trouvé.");

    if (result.seconds > 600) {
      return reply("⚠️ Cette vidéo dépasse 10 minutes, envoi annulé (trop lourde pour WhatsApp).");
    }

    const info = await ytdl.getInfo(result.url);
    const stream = ytdl.downloadFromInfo(info, { filter: "audioandvideo", quality: "lowest" });
    const buffer = await bufferFromStream(stream);

    await conn.sendMessage(chatId, {
      video: buffer,
      caption: `🎬 ${result.title}`,
      mimetype: "video/mp4"
    }, { quoted: m });
  } catch (err) {
    console.error("❌ Video Error:", err.message || err);
    reply("⚠️ Échec du téléchargement vidéo.");
  }
};
