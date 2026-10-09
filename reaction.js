// 📂 reaction.js — Envoie ".Nice" pour récupérer un média à vue unique discrètement dans tes
// propres messages personnels. Remplace l'ancien déclencheur par réaction 👍.
//
// Le téléchargement réel se fait en 2 temps :
//  1) prefetchViewOnce() — appelé DÈS la réception du message (bot-engine.js), avant que
//     quiconque ait pu l'ouvrir. On décrypte et on garde le buffer en mémoire (store.js).
//  2) handleNiceDownload() — quand le propriétaire envoie ".Nice" (en réponse à un vue-unique,
//     ou sans réponse pour prendre le dernier de la discussion), on renvoie le buffer en cache.
// Sans ça, attendre la commande pour télécharger arrive souvent trop tard : WhatsApp
// invalide le fichier vue-unique côté serveur dès qu'il a été ouvert par le destinataire.

const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const store = require("./store");

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Trouve le média peu importe l'imbrication (ViewOnce, Ephemeral, etc.)
function extractMediaMessage(msg) {
  if (!msg) return null;
  if (msg.imageMessage || msg.videoMessage || msg.audioMessage) return msg;
  return (
    extractMediaMessage(msg.message) ||
    extractMediaMessage(msg.viewOnceMessage?.message) ||
    extractMediaMessage(msg.viewOnceMessageV2?.message) ||
    extractMediaMessage(msg.viewOnceMessageV2Extension?.message) ||
    extractMediaMessage(msg.ephemeralMessage?.message) ||
    null
  );
}

function isViewOnce(msg) {
  if (!msg) return false;
  return Boolean(
    msg.viewOnceMessage || msg.viewOnceMessageV2 || msg.viewOnceMessageV2Extension ||
    msg.imageMessage?.viewOnce || msg.videoMessage?.viewOnce ||
    isViewOnce(msg.message) || isViewOnce(msg.ephemeralMessage?.message)
  );
}

async function downloadMedia(inner) {
  const media = inner?.imageMessage || inner?.videoMessage || inner?.audioMessage;
  if (!media) return null;

  let type = "image";
  if (inner.videoMessage) type = "video";
  if (inner.audioMessage) type = "audio";

  const stream = await downloadContentFromMessage(media, type);
  const buffer = await streamToBuffer(stream);

  const data = { type, buffer };
  if (media.caption) data.caption = media.caption;
  if (type === "audio") {
    data.mimetype = media.mimetype || "audio/mp4";
    data.ptt = Boolean(media.ptt);
  }
  return data;
}

// Appelé pour CHAQUE message entrant (bot-engine.js) : si c'est un média vue-unique,
// on le décrypte tout de suite et on le met en cache, avant qu'il ne soit ouvert/invalidé.
async function prefetchViewOnce(msg) {
  try {
    if (!msg?.message || !msg.key?.remoteJid || !msg.key?.id) return;
    if (!isViewOnce(msg.message)) return;

    const inner = extractMediaMessage(msg.message);
    if (!inner) return;

    const data = await downloadMedia(inner);
    if (data) store.saveBuffer(msg.key.remoteJid, msg.key.id, data);
  } catch (err) {
    console.error("[Reaction Prefetch] Erreur :", err.message || err);
  }
}

// `msg` = message texte envoyé par le propriétaire (".Nice"). Si c'est une réponse à un
// message vue-unique, on récupère celui-ci ; sinon, le dernier vue-unique de la discussion.
async function handleNiceDownload(sock, msg) {
  try {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    let data = null;

    // 1) réponse à un message vue-unique → buffer en cache, sinon téléchargement direct
    if (ctx?.stanzaId && ctx.quotedMessage && isViewOnce(ctx.quotedMessage)) {
      data = store.getBuffer(jid, ctx.stanzaId);
      if (!data) {
        const inner = extractMediaMessage(ctx.quotedMessage);
        data = await downloadMedia(inner);
      }
    }

    // 2) sinon, le vue-unique le plus récent de cette discussion
    if (!data) data = store.getLatestBufferForChat(jid);

    if (!data) {
      console.log("[Nice] Aucun vue unique trouvé");
      return;
    }

    const { type, buffer, caption, mimetype, ptt } = data;
    const payload = { [type]: buffer };
    if (caption) payload.caption = caption;
    if (type === "audio") {
      payload.mimetype = mimetype || "audio/mp4";
      payload.ptt = Boolean(ptt);
    }

    // Envoi discret dans les messages personnels du compte connecté (aucun message dans le chat)
    const myJid = sock.user?.id ? sock.user.id.split(":")[0] + "@s.whatsapp.net" : jid;
    await sock.sendMessage(myJid, payload);
  } catch (err) {
    console.error("[Nice Download] Erreur :", err.message || err);
  }
}

module.exports = { handleNiceDownload, prefetchViewOnce, extractMediaMessage, isViewOnce };
