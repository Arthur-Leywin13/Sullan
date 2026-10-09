// 📂 reaction.js — Réagis 👍 à un média (y compris à vue unique) pour le récupérer
// discrètement dans tes propres messages personnels. Remplace l'ancienne commande .vv.
//
// Le téléchargement réel se fait en 2 temps :
//  1) prefetchViewOnce() — appelé DÈS la réception du message (bot-engine.js), avant que
//     quiconque ait pu l'ouvrir. On décrypte et on garde le buffer en mémoire (store.js).
//  2) handleReactionDownload() — au moment du 👍, on renvoie le buffer déjà en cache s'il
//     existe ; sinon on tente un téléchargement direct (cas d'un média classique, pas vue
//     unique, qui reste accessible plus longtemps).
// Sans ça, attendre la réaction pour télécharger arrive souvent trop tard : WhatsApp
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

// `item` = un élément de l'événement Baileys "messages.reaction.update" :
// { key: <clé du message visé>, reaction: { text, key, senderTimestampMs } }
async function handleReactionDownload(sock, item) {
  try {
    const emoji = item?.reaction?.text;
    if (emoji !== "👍") return; // uniquement le pouce levé

    const remoteJid = item.key?.remoteJid;
    const messageId = item.key?.id;
    if (!remoteJid || !messageId) return;

    // 1) buffer déjà décrypté à la réception (cas vue-unique) → priorité
    let data = store.getBuffer(remoteJid, messageId);

    // 2) sinon, tentative de téléchargement direct depuis le message mis en cache
    if (!data) {
      const targetMessage = store.get(remoteJid, messageId);
      if (!targetMessage) return; // message trop ancien / jamais vu passer
      const inner = extractMediaMessage(targetMessage);
      if (!inner) return; // pas un média
      data = await downloadMedia(inner);
    }
    if (!data) return;

    const { type, buffer, caption, mimetype, ptt } = data;
    const payload = { [type]: buffer };
    if (caption) payload.caption = caption;
    if (type === "audio") {
      payload.mimetype = mimetype || "audio/mp4";
      payload.ptt = Boolean(ptt);
    }

    // Envoi discret dans les messages personnels du compte connecté (aucune confirmation dans le chat)
    const myJid = sock.user?.id ? sock.user.id.split(":")[0] + "@s.whatsapp.net" : remoteJid;
    await sock.sendMessage(myJid, payload);
  } catch (err) {
    console.error("[Reaction Download] Erreur :", err.message || err);
  }
}

module.exports = { handleReactionDownload, prefetchViewOnce, extractMediaMessage, isViewOnce };
