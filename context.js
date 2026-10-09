// 📂 context.js — Extraction correcte du message cité ("reply to") et des mentions.
//
// Baileys ne fournit PAS de champ `.quoted` ou `.mentioned` tout fait sur un message :
// ces infos sont dans message.<type>.contextInfo (quotedMessage / participant / mentionedJid).
// Avant cette correction, tout le code qui lisait `m.quoted` / `m.mentioned` lisait du
// `undefined` — donc "répondre à un message" ne fonctionnait jamais, pour aucune commande.
//
// ⚠️ Important : ceci lit UNIQUEMENT le contenu réel du message cité (texte, image jointe,
// etc.). Ça ne va jamais chercher la photo de profil de qui que ce soit, ni la photo d'un
// autre groupe — .setpp/.gpp n'utilisent donc que l'image réellement envoyée/citée, jamais
// une photo de profil.

function getContextInfo(msg) {
  const m = msg.message || {};
  const candidates = [
    m.extendedTextMessage, m.imageMessage, m.videoMessage, m.audioMessage,
    m.documentMessage, m.stickerMessage, m.buttonsResponseMessage,
    m.listResponseMessage, m.templateButtonReplyMessage
  ];
  for (const c of candidates) {
    if (c?.contextInfo) return c.contextInfo;
  }
  return null;
}

// Renvoie { message, sender, key } du message cité, ou null s'il n'y en a pas.
function getQuoted(msg) {
  const ctx = getContextInfo(msg);
  if (!ctx?.quotedMessage) return null;
  return {
    message: ctx.quotedMessage,
    sender: ctx.participant || null,
    participant: ctx.participant || null,
    id: ctx.stanzaId,
    key: {
      remoteJid: msg.key.remoteJid,
      id: ctx.stanzaId,
      participant: ctx.participant,
      fromMe: false
    }
  };
}

// Renvoie la liste des JID explicitement mentionnés (@untel) dans le message, jamais déduits.
function getMentioned(msg) {
  const ctx = getContextInfo(msg);
  return ctx?.mentionedJid || [];
}

module.exports = { getContextInfo, getQuoted, getMentioned };
