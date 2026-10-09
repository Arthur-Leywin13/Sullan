// 📂 song.js — Recherche YouTube + téléchargement réel + envoi en audio (pas un lien)

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

module.exports = async function song({ conn, m, args, reply, chatId }) {
  const query = args.join(" ");
  if (!query) return reply("✏️ Utilise : .song <titre ou artiste>");

  try {
    await reply(`🔎 Recherche en cours : *${query}*...`);

    const search = await yts(query);
    const video = search.videos?.[0];
    if (!video) return reply("❌ Aucun résultat trouvé.");

    if (video.seconds > 900) {
      return reply("⚠️ Cette chanson dépasse 15 minutes, envoi annulé (trop lourd).");
    }

    const info = await ytdl.getInfo(video.url);
    const stream = ytdl.downloadFromInfo(info, { filter: "audioonly", quality: "highestaudio" });
    const buffer = await bufferFromStream(stream);

    await conn.sendMessage(chatId, {
      audio: buffer,
      mimetype: "audio/mpeg",
      fileName: `${video.title}.mp3`,
      ptt: false
    }, { quoted: m });
  } catch (err) {
    console.error("❌ Song Error:", err.message || err);
    reply("⚠️ Échec du téléchargement (vidéo protégée, trop longue, ou erreur réseau).");
  }
};
