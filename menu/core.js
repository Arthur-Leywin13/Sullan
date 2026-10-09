// 📂 menu/core.js — Implémentations réelles de la majorité des commandes du menu Sullivan
const axios = require("axios");
const moment = require("moment-timezone");
const textfx = require("../textfx");
const { sendAnime } = require("../anime");
const { askAI } = require("../ai");
const weather = require("../weather");
const song = require("../song");
const video = require("../video");
const calc = require("../calc");
const poll = require("../poll");
const hack = require("../hack");
const matrix = require("../matrix");
const logo = require("../logo");
const photo = require("../photo");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

// ---------- Helpers ----------
async function mustBeGroup(isGroup, reply) {
  if (!isGroup) { await reply("🚫 Commande utilisable uniquement en groupe."); return false; }
  return true;
}
async function mustBeAdmin(conn, chatId, sender, reply) {
  const meta = await conn.groupMetadata(chatId);
  const p = meta.participants.find(x => x.id === sender);
  if (!p || (p.admin !== "admin" && p.admin !== "superadmin")) {
    await reply("🚫 Réservé aux admins du groupe.");
    return null;
  }
  return meta;
}
function targetFromArgsOrQuoted(m, args) {
  if (m.quoted) return m.quoted.sender || m.quoted.participant || m.quoted.key?.participant;
  if (m.mentioned?.length) return m.mentioned[0];
  if (args[0]) {
    let n = args[0].replace(/[^0-9]/g, "");
    return n ? `${n}@s.whatsapp.net` : null;
  }
  return null;
}

const core = {};

// ===================== UTILITAIRE =====================
core.ping = async ({ reply }) => {
  const start = Date.now();
  await reply("🏓 Pong...").then(() => {});
  reply(`🏓 Pong ! ${Date.now() - start}ms`);
};
core.alive = async ({ reply }) => {
  const s = process.uptime();
  const uptime = `${Math.floor(s / 86400)}d, ${Math.floor((s % 86400) / 3600)}h, ${Math.floor((s % 3600) / 60)}m, ${Math.floor(s % 60)}s`;
  const commandCount = Object.keys(core).length;
  reply(textfx.box("SULLIVAN", [
    `OWNER ➜ Sullivan`,
    `PREFIX ➜ 『 . 』`,
    `MODE ➜ ${(global.mode || "self").toUpperCase()}`,
    `UPTIME ➜ ${uptime}`,
    `COMMANDS ➜ ${commandCount}`
  ]));
};
core.runtime = async ({ reply }) => {
  const s = process.uptime();
  reply(textfx.box("RUNTIME", [`${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`]));
};
core.owner = async ({ reply }) => reply(textfx.box("OWNER", [`wa.me/${(global.ownerNumber || "").replace(/\D/g, "")}`]));
core.botname = async ({ reply }) => reply(textfx.box("BOT NAME", ["Sullivan"]));
core.intro = async ({ reply }) => reply(textfx.box("SULLIVAN", ["Bot WhatsApp multi-fonctions", "Tape .menu pour la liste des commandes"]));
core.channel = async ({ reply }) => reply(global.settings?.channelLink || "📢 Aucun canal configuré (settings.js).");
core.info = async ({ reply }) => reply("ℹ️ Sullivan — bot WhatsApp basé sur Baileys. Tape .menu pour la liste des commandes.");
core.help = async ({ conn, chatId, m }) => {
  const { menu } = require("../media/menu.js");
  conn.sendMessage(chatId, { text: menu() }, { quoted: m });
};
core.checkme = async ({ reply, sender }) => reply(`🔢 Ton identifiant : wa.me/${sender}`);
core.numinfo = async ({ reply, args }) => {
  const n = (args[0] || "").replace(/\D/g, "");
  if (!n) return reply("✏️ Utilise : .numinfo <numéro>");
  reply(`📱 Numéro : +${n}\n🌍 Indicatif : +${n.slice(0, 3)}`);
};
core.idcheck = core.checkme;

// ===================== OWNER =====================
core.say = async ({ reply, args }) => args.length ? reply(args.join(" ")) : reply("✏️ Utilise : .say <texte>");
core.setbio = async ({ conn, reply, args }) => {
  if (!args.length) return reply("✏️ Utilise : .setbio <texte>");
  try { await conn.updateProfileStatus(args.join(" ")); reply("✅ Bio mise à jour."); }
  catch (e) { reply("⚠️ Erreur lors de la mise à jour de la bio."); }
};
core.setname = async ({ conn, reply, args }) => {
  if (!args.length) return reply("✏️ Utilise : .setname <texte>");
  try { await conn.updateProfileName(args.join(" ")); reply("✅ Nom du bot mis à jour."); }
  catch (e) { reply("⚠️ Erreur lors de la mise à jour du nom."); }
};
core.setpp = async ({ conn, m, reply }) => {
  const quotedImg = m.quoted?.message?.imageMessage;
  const directImg = m.message?.imageMessage;
  if (!quotedImg && !directImg) return reply("✏️ Envoie une image (ou réponds à une image) avec .setpp");
  try {
    const fakeMsg = quotedImg
      ? { key: m.quoted.key, message: { imageMessage: quotedImg } }
      : { key: m.key, message: m.message };
    const buffer = await downloadMediaMessage(fakeMsg, "buffer", {});
    await conn.updateProfilePicture(conn.user.id, buffer);
    reply("✅ Photo de profil du bot mise à jour.");
  } catch (e) {
    console.error("❌ setpp Error:", e.message || e);
    reply("⚠️ Erreur lors du changement de photo.");
  }
};
core.join = async ({ conn, reply, args }) => {
  const link = args[0];
  if (!link) return reply("✏️ Utilise : .join <lien d'invitation>");
  try {
    const code = link.split("/").pop();
    await conn.groupAcceptInvite(code);
    reply("✅ Groupe rejoint !");
  } catch (e) { reply("⚠️ Lien invalide ou expiré."); }
};
core.leave = async ({ conn, chatId, reply, isGroup }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  await conn.groupLeave(chatId);
};
core.block = async ({ conn, m, args, reply }) => {
  const target = targetFromArgsOrQuoted(m, args);
  if (!target) return reply("✏️ Réponds au contact ou donne son numéro : .block <numéro>");
  await conn.updateBlockStatus(target, "block");
  reply("🚫 Contact bloqué.");
};
core.unblock = async ({ conn, m, args, reply }) => {
  const target = targetFromArgsOrQuoted(m, args);
  if (!target) return reply("✏️ Réponds au contact ou donne son numéro : .unblock <numéro>");
  await conn.updateBlockStatus(target, "unblock");
  reply("✅ Contact débloqué.");
};
core.shutdown = async ({ reply }) => { await reply("🛑 Arrêt du bot..."); process.exit(0); };
core.restart = async ({ reply }) => { await reply("🔄 Redémarrage du bot..."); process.exit(1); }; // à relancer via pm2/nodemon

// ===================== GROUPE =====================
core.add = async ({ conn, chatId, args, reply, isGroup, sender }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  if (!(await mustBeAdmin(conn, chatId, sender, reply))) return;
  const n = (args[0] || "").replace(/\D/g, "");
  if (!n) return reply("✏️ Utilise : .add <numéro>");
  await conn.groupParticipantsUpdate(chatId, [`${n}@s.whatsapp.net`], "add");
  reply("✅ Membre ajouté (si les paramètres du groupe le permettent).");
};
core.kickall = async ({ conn, chatId, reply, isGroup, sender }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  const meta = await mustBeAdmin(conn, chatId, sender, reply);
  if (!meta) return;
  const targets = meta.participants.map(p => p.id).filter(id => id !== sender && id.split("@")[0] !== (global.ownerNumber || ""));
  for (const t of targets) { try { await conn.groupParticipantsUpdate(chatId, [t], "remove"); } catch {} }
  reply(`💥 ${targets.length} membres retirés.`);
};
core.open = async ({ conn, chatId, reply, isGroup, sender }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  if (!(await mustBeAdmin(conn, chatId, sender, reply))) return;
  await conn.groupSettingUpdate(chatId, "not_announcement");
  reply("🔓 Groupe ouvert : tout le monde peut écrire.");
};
core.close = async ({ conn, chatId, reply, isGroup, sender }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  if (!(await mustBeAdmin(conn, chatId, sender, reply))) return;
  await conn.groupSettingUpdate(chatId, "announcement");
  reply("🔒 Groupe fermé : seuls les admins peuvent écrire.");
};
core.tagall = async ({ conn, chatId, reply, isGroup }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  const meta = await conn.groupMetadata(chatId);
  const mentions = meta.participants.map(p => p.id);
  const text = "📢 *Mention générale*\n" + mentions.map(m => `@${m.split("@")[0]}`).join(" ");
  conn.sendMessage(chatId, { text, mentions });
};
core.hidetag = async ({ conn, chatId, m, args, reply, isGroup }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  const meta = await conn.groupMetadata(chatId);
  const mentions = meta.participants.map(p => p.id);
  conn.sendMessage(chatId, { text: args.join(" ") || "‎", mentions }, { quoted: m });
};
core.tagadmin = async ({ conn, chatId, reply, isGroup }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  const meta = await conn.groupMetadata(chatId);
  const admins = meta.participants.filter(p => p.admin).map(p => p.id);
  const text = "👮 *Admins*\n" + admins.map(m => `@${m.split("@")[0]}`).join(" ");
  conn.sendMessage(chatId, { text, mentions: admins });
};
core.promote = async ({ conn, chatId, m, args, reply, isGroup, sender }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  if (!(await mustBeAdmin(conn, chatId, sender, reply))) return;
  const target = targetFromArgsOrQuoted(m, args);
  if (!target) return reply("✏️ Réponds au membre ou donne son numéro.");
  await conn.groupParticipantsUpdate(chatId, [target], "promote");
  reply("⬆️ Membre promu admin.");
};
core.demote = async ({ conn, chatId, m, args, reply, isGroup, sender }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  if (!(await mustBeAdmin(conn, chatId, sender, reply))) return;
  const target = targetFromArgsOrQuoted(m, args);
  if (!target) return reply("✏️ Réponds au membre ou donne son numéro.");
  await conn.groupParticipantsUpdate(chatId, [target], "demote");
  reply("⬇️ Admin rétrogradé.");
};
core.promoteall = async ({ conn, chatId, reply, isGroup, sender }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  const meta = await mustBeAdmin(conn, chatId, sender, reply);
  if (!meta) return;
  for (const p of meta.participants) { if (!p.admin) try { await conn.groupParticipantsUpdate(chatId, [p.id], "promote"); } catch {} }
  reply("⬆️ Tous les membres promus.");
};
core.demoteall = async ({ conn, chatId, reply, isGroup, sender }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  const meta = await mustBeAdmin(conn, chatId, sender, reply);
  if (!meta) return;
  for (const p of meta.participants) { if (p.admin) try { await conn.groupParticipantsUpdate(chatId, [p.id], "demote"); } catch {} }
  reply("⬇️ Tous les admins rétrogradés.");
};
core.adminkill = async ({ conn, chatId, reply, isGroup, sender }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  const meta = await mustBeAdmin(conn, chatId, sender, reply);
  if (!meta) return;
  const admins = meta.participants.filter(p => p.admin && p.id !== sender).map(p => p.id);
  for (const a of admins) { try { await conn.groupParticipantsUpdate(chatId, [a], "remove"); } catch {} }
  reply(`💀 ${admins.length} admins retirés.`);
};
core.changename = async ({ conn, chatId, args, reply, isGroup, sender }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  if (!(await mustBeAdmin(conn, chatId, sender, reply))) return;
  if (!args.length) return reply("✏️ Utilise : .changename <nouveau nom>");
  await conn.groupUpdateSubject(chatId, args.join(" "));
  reply("✅ Nom du groupe changé.");
};
core.gpp = async ({ conn, chatId, m, reply, isGroup, sender }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  if (!(await mustBeAdmin(conn, chatId, sender, reply))) return;
  const quotedImg = m.quoted?.message?.imageMessage;
  const directImg = m.message?.imageMessage;
  if (!quotedImg && !directImg) return reply("✏️ Envoie une image (ou réponds à une image) avec .gpp");
  try {
    const fakeMsg = quotedImg
      ? { key: m.quoted.key, message: { imageMessage: quotedImg } }
      : { key: m.key, message: m.message };
    const buffer = await downloadMediaMessage(fakeMsg, "buffer", {});
    await conn.updateProfilePicture(chatId, buffer);
    reply("✅ Photo du groupe mise à jour.");
  } catch (e) {
    console.error("❌ gpp Error:", e.message || e);
    reply("⚠️ Erreur lors du changement de photo du groupe.");
  }
};
core.ginfo = async ({ conn, chatId, reply, isGroup }) => {
  if (!(await mustBeGroup(isGroup, reply))) return;
  const meta = await conn.groupMetadata(chatId);
  reply(`👥 *${meta.subject}*\n📋 ${meta.desc || "Pas de description"}\n👤 Membres : ${meta.participants.length}`);
};
core.listactive = core.ginfo;
core.warn = async ({ reply }) => {
  global.warnCount = global.warnCount || {};
  reply("⚠️ Avertissement envoyé (compteur simple, non persistant — à relier à une base de données si besoin).");
};
core.closetime = async ({ reply }) => reply("⚠️ Fermeture programmée : nécessite un scheduler (ex: node-cron), non inclus par défaut.");
core.delaymsg = async ({ reply, args, conn, chatId }) => {
  const seconds = parseInt(args[0], 10);
  const text = args.slice(1).join(" ");
  if (!seconds || !text) return reply("✏️ Utilise : .delaymsg <secondes> <message>");
  reply(`⏳ Message programmé dans ${seconds}s.`);
  setTimeout(() => conn.sendMessage(chatId, { text }), seconds * 1000);
};
core.del = async ({ conn, chatId, m, reply }) => {
  if (!m.quoted) return reply("✏️ Réponds au message à supprimer avec .del");
  try {
    await conn.sendMessage(chatId, { delete: { remoteJid: chatId, id: m.quoted.id, participant: m.quoted.sender, fromMe: false } });
  } catch (e) { reply("⚠️ Impossible de supprimer ce message."); }
};
core.reactch = async ({ conn, chatId, m, args, reply }) => {
  if (!m.quoted) return reply("✏️ Réponds à un message avec .reactch <emoji>");
  const emoji = args[0] || "👍";
  await conn.sendMessage(chatId, { react: { text: emoji, key: m.quoted.key || m.key } });
};
// Ghost ping : mentionne quelqu'un (réponds à son message, ou donne son numéro en argument)
// puis supprime l'appel instantanément — il reçoit la notification, pas de trace dans le chat.
core.ghostping = async ({ conn, chatId, m, args, isGroup, reply }) => {
  if (!isGroup) return reply("🚫 Commande utilisable uniquement en groupe.");
  let target = m.quoted?.sender || m.quoted?.participant;
  if (!target && args[0]) target = args[0].replace(/\D/g, "") + "@s.whatsapp.net";
  if (!target) return reply("✏️ Réponds au message de la cible, ou utilise : .ghostping <numéro>");

  const sent = await conn.sendMessage(chatId, { text: `@${target.split("@")[0]}`, mentions: [target] });
  try {
    await conn.sendMessage(chatId, { delete: sent.key });
  } catch (e) { /* suppression best-effort */ }
};
// Sauvegarde manuelle : réponds à un média (photo/vidéo/audio, vue unique ou non) avec .save
// pour le recevoir dans tes messages personnels — équivalent manuel de la réaction 👍.
core.save = async ({ conn, m, reply, sender }) => {
  if (!m.quoted) return reply("✏️ Réponds à une photo/vidéo/audio avec .save");
  try {
    const buffer = await downloadMediaMessage(
      { key: m.quoted.key, message: m.quoted.message },
      "buffer", {}
    );
    const inner = m.quoted.message || {};
    let type = "image";
    if (inner.videoMessage || inner.viewOnceMessageV2?.message?.videoMessage) type = "video";
    if (inner.audioMessage || inner.viewOnceMessageV2?.message?.audioMessage) type = "audio";

    const myJid = conn.user?.id ? conn.user.id.split(":")[0] + "@s.whatsapp.net" : sender;
    const payload = { [type]: buffer };
    if (type === "audio") payload.mimetype = "audio/mp4";
    await conn.sendMessage(myJid, payload);
    reply("✅ Envoyé dans tes messages personnels.");
  } catch (e) {
    reply("⚠️ Impossible de récupérer ce média (déjà ouvert/expiré, ou pas un média).");
  }
};

// ===================== TEXTE =====================
for (const fn of ["fliptext", "smallcaps", "bubble", "mirror", "reverse", "strike", "zalgo", "zalgo2"]) {
  const base = fn.replace("2", "");
  core[fn] = ({ args, reply }) => args.length ? reply(textfx[base](args.join(" "))) : reply(`✏️ Utilise : .${fn} <texte>`);
}
core.cpp = ({ args, reply }) => args.length ? reply(textfx.bubble(args.join(" "))) : reply("✏️ Utilise : .cpp <texte>");
core.fancy = core.bubble;
core.tte = ({ args, reply }) => args.length
  ? reply(args.join(" ").split("").map(c => c + "️").join(""))
  : reply("✏️ Utilise : .tte <texte>");

// ===================== JEUX & FUN (texte) =====================
core.math = ({ reply }) => {
  const a = Math.floor(Math.random() * 50) + 1, b = Math.floor(Math.random() * 50) + 1;
  const ops = ["+", "-", "*"]; const op = ops[Math.floor(Math.random() * ops.length)];
  reply(`🧮 Combien font ${a} ${op} ${b} ?`);
};
core.rps = ({ args, reply }) => {
  const choices = ["pierre", "feuille", "ciseaux"];
  const user = (args[0] || "").toLowerCase();
  if (!choices.includes(user)) return reply("✏️ Utilise : .rps <pierre|feuille|ciseaux>");
  const bot = choices[Math.floor(Math.random() * 3)];
  let result = "🤝 Égalité !";
  if ((user === "pierre" && bot === "ciseaux") || (user === "feuille" && bot === "pierre") || (user === "ciseaux" && bot === "feuille")) result = "🎉 Tu gagnes !";
  else if (user !== bot) result = "😎 Je gagne !";
  reply(`Toi : ${user} | Moi : ${bot}\n${result}`);
};
core.guessnumber = ({ reply }) => {
  global.guessNumber = Math.floor(Math.random() * 100) + 1;
  reply("🔢 J'ai choisi un nombre entre 1 et 100, devine-le (réponds avec .math pour recommencer).");
};
core.flag = ({ reply }) => reply("🏳️ Mini-jeu drapeaux : à enrichir avec une banque de questions dédiée.");
core.scramble = ({ reply }) => {
  const words = ["ordinateur", "téléphone", "whatsapp", "javascript", "bouteille"];
  const w = words[Math.floor(Math.random() * words.length)];
  reply(`🔤 Devine le mot mélangé : ${w.split("").sort(() => Math.random() - 0.5).join("")}`);
};
core.riddle = ({ reply }) => reply("🧩 Plus je sèche, plus je deviens mouillée. Que suis-je ? (une serviette)");
core.emoji = ({ reply }) => reply("😀 Devine le film/mot à partir des emojis : 🦁👑 ?");
core.eightball = ({ args, reply }) => {
  const answers = ["Oui.", "Non.", "Probablement.", "Demande plus tard.", "Certainement pas.", "Sans aucun doute."];
  reply(`🎱 ${answers[Math.floor(Math.random() * answers.length)]}`);
};
core.truthordare = ({ reply }) => reply(Math.random() > 0.5 ? "🤔 Vérité : quelle est ta plus grande peur ?" : "🔥 Gage : envoie un vocal en chantant !");
core.trivia = ({ reply }) => reply("❓ Quelle est la capitale du Japon ? (Tokyo)");
core.joke = ({ reply }) => reply("😂 Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant ? Parce que sinon ils tombent dans le bateau !");
core.fact = ({ reply }) => reply("📚 Le miel ne se périme jamais s'il est bien conservé.");
core.historyfact = ({ reply }) => reply("🏛️ La Tour Eiffel devait être démontée après 20 ans, mais elle a été conservée pour les transmissions radio.");
core.quote = ({ reply }) => reply("💬 « La seule façon de faire du bon travail est d'aimer ce que l'on fait. » — Steve Jobs");
core.roast = ({ reply }) => reply("🔥 T'es tellement lent que même le chargement de WhatsApp Web va plus vite que toi.");
core.insult = ({ reply }) => reply("😏 Désactivé par défaut pour éviter les abus — à activer explicitement si tu veux vraiment ce genre de contenu.");
core.harami = core.insult;
core.shapar = ({ reply }) => reply("🙃 Commande décorative — dis-moi ce qu'elle doit faire et je l'implémente.");
core.heart = ({ reply }) => reply("❤️");
core.nice = ({ reply }) => reply("👍 Sympa !");

// ===================== ANIME / RÉACTIONS (images réelles) =====================
for (const cmd of ["waifu", "neko", "neko2", "hug", "kiss", "pat", "cuddle", "cry", "slap", "kill", "smile", "blush", "bite", "love", "baka"]) {
  core[cmd] = (ctx) => sendAnime({ ...ctx, command: cmd });
}

// ===================== IA =====================
core.chatgpt = ({ args, reply }) => askAI("chatgpt", args.join(" "), reply);
core.llama = ({ args, reply }) => askAI("llama", args.join(" "), reply);
core.claude = ({ args, reply }) => askAI("claude", args.join(" "), reply);
core.mistral = ({ args, reply }) => askAI("mistral", args.join(" "), reply);

// ===================== MÉTÉO / MUSIQUE / VIDÉO =====================
core.weather = weather;
core.song = song;
core.song2 = song;
core.video = video;
core.video2 = video;
core.play = song;

// ===================== OUTILS =====================
core.calc = calc;
core.poll = poll;
core.hack = hack;
core.matrix = matrix;

// ===================== LOGOS (génération locale, aucune API externe) =====================
for (const style of Object.keys(logo.STYLES)) core[style] = logo;

// ===================== PHOTOS / WALLPAPERS PAR MOT-CLÉ (Pexels) =====================
for (const kw of Object.keys(photo.KEYWORDS)) core[kw] = photo;

// ===================== GITHUB =====================
core.github = async ({ args, reply }) => {
  const user = args[0];
  if (!user) return reply("✏️ Utilise : .github <utilisateur>");
  try {
    const { data } = await axios.get(`https://api.github.com/users/${user}`, { timeout: 10000 });
    reply(`💻 *${data.login}*\n📦 Repos publics : ${data.public_repos}\n👥 Followers : ${data.followers}\n🔗 ${data.html_url}`);
  } catch { reply("❌ Utilisateur GitHub introuvable."); }
};
core.gitfollowers = core.github;
core.gitrepos = async ({ args, reply }) => {
  const user = args[0];
  if (!user) return reply("✏️ Utilise : .gitrepos <utilisateur>");
  try {
    const { data } = await axios.get(`https://api.github.com/users/${user}/repos?sort=updated&per_page=5`, { timeout: 10000 });
    reply(data.map(r => `📁 ${r.name} (⭐ ${r.stargazers_count})`).join("\n") || "Aucun repo trouvé.");
  } catch { reply("❌ Erreur GitHub."); }
};
core.gitstarred = core.gitrepos;
core.gitclone = async ({ args, reply, conn, chatId, m }) => {
  const url = args[0];
  if (!url || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/.test(url)) {
    return reply("✏️ Utilise : .gitclone <url github> (ex: https://github.com/user/repo)");
  }
  const { execFile } = require("child_process");
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "gitclone-"));

  reply("📥 Clonage en cours (profondeur 1, aucun script exécuté)...");
  // execFile (pas exec) + argument séparé = pas d'injection shell possible.
  execFile("git", ["clone", "--depth", "1", url, dest], { timeout: 60000 }, async (err) => {
    if (err) { console.error("❌ gitclone Error:", err.message); return reply("❌ Échec du clonage (dépôt introuvable, privé, ou trop volumineux)."); }
    try {
      const files = fs.readdirSync(dest);
      reply(`✅ Dépôt cloné (${files.length} éléments à la racine).\n⚠️ Aucun fichier n'est exécuté automatiquement — clone temporaire supprimé après inspection.`);
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });
};
core.gitfollow = async ({ args, reply }) => {
  const settings = require("../settings").loadSettings();
  const token = settings.GITHUB_TOKEN;
  const username = args[0];
  if (!token) return reply("❌ Ajoute un GITHUB_TOKEN (Personal Access Token, scope 'user:follow') dans settings.js.");
  if (!username) return reply("✏️ Utilise : .gitfollow <utilisateur>");
  try {
    await axios.put(`https://api.github.com/user/following/${username}`, {}, {
      headers: { Authorization: `token ${token}`, "User-Agent": "Sullivan-Bot" }
    });
    reply(`✅ Tu suis maintenant @${username} sur GitHub.`);
  } catch (e) { reply("❌ Échec (token invalide ou utilisateur introuvable)."); }
};

module.exports = core;
