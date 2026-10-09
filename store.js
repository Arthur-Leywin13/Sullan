// 📂 store.js — Cache mémoire minimal des messages récents + des médias "vue unique" déjà
// décryptés.
//
// Baileys ne fournit plus de "store" intégré. Comme la réaction 👍 ne contient que la clé
// du message visé (jid + id), il faut avoir gardé ce message quelque part pour pouvoir le
// retrouver. On garde donc les N derniers messages de chaque discussion, en mémoire (perdu
// au redémarrage — normal pour ce type de fonctionnalité).
//
// ⚠️ Pour les médias "vue unique" (ViewOnce), WhatsApp invalide le fichier côté serveur une
// fois qu'il a été ouvert : si on attend la réaction 👍 pour télécharger, c'est souvent déjà
// trop tard. On télécharge donc le buffer DÈS la réception du message (voir bot-engine.js)
// et on le garde ici tout prêt, pour que la réaction n'ait plus qu'à le renvoyer.

const MAX_PER_CHAT = 200;
const MAX_BUFFERS = 50; // les buffers sont lourds (images/vidéos) — cache plus petit

const cache = new Map();   // jid -> Map(id -> message content)
const buffers = new Map(); // "jid:id" -> { type, buffer, caption, mimetype, ptt }
const bufferOrder = [];    // ordre d'insertion, pour évincer le plus ancien

function save(msg) {
  if (!msg?.key?.remoteJid || !msg.key.id || !msg.message) return;
  const jid = msg.key.remoteJid;
  if (!cache.has(jid)) cache.set(jid, new Map());
  const chatMap = cache.get(jid);
  chatMap.set(msg.key.id, msg.message);
  if (chatMap.size > MAX_PER_CHAT) {
    chatMap.delete(chatMap.keys().next().value); // supprime le plus ancien
  }
}

function get(jid, id) {
  return cache.get(jid)?.get(id) || null;
}

function saveBuffer(jid, id, data) {
  const key = `${jid}:${id}`;
  if (!buffers.has(key)) bufferOrder.push(key);
  buffers.set(key, data);
  while (bufferOrder.length > MAX_BUFFERS) {
    const oldest = bufferOrder.shift();
    buffers.delete(oldest);
  }
}

function getBuffer(jid, id) {
  return buffers.get(`${jid}:${id}`) || null;
}

module.exports = { save, get, saveBuffer, getBuffer };
