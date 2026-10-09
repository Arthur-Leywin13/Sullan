// 📂 media/menu.js — Tous les menus (.menu + 16 sous-menus).
//
// ⚠️ Chaque menu est une FONCTION (pas une chaîne figée) : le contenu (date, heure, uptime,
// préfixe) est recalculé à CHAQUE appel. Avant, tout était calculé une seule fois au premier
// chargement du fichier (au démarrage du bot) — uptime et heure ne bougeaient donc jamais.
//
// ⚠️ Seules des commandes RÉELLEMENT implémentées sont listées ici. L'ancienne version
// affichait ~200 commandes dont la plupart n'existaient pas (ex: des dizaines de
// personnages anime dédiés) — purement décoratif, rien ne répondait derrière.

const moment = require("moment-timezone");
const textfx = require("./../textfx");
const { listCommands } = require("../commands-list");

const M = textfx.monospace;
const P = () => global.prefix || ".";

function now() {
  return {
    date: moment().tz("Asia/Karachi").format("DD-MMM-YYYY"),
    time: moment().tz("Asia/Karachi").format("hh:mm A"),
  };
}

function uptimeStr() {
  const s = process.uptime();
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h}h ${m}m ${sec}s`;
}

// Liste de commandes → lignes du cadre, avec le préfixe courant devant chacune.
function cmdLines(names) {
  return names.map(n => `${P()}${n}`);
}

// ---------- .menu (hub principal) ----------
function menu() {
  const { date, time } = now();
  const total = (() => { try { return listCommands().length; } catch { return "?"; } })();

  const header = textfx.box("SULLIVAN", [
    "Mode: famille privée 🎩",
    `Date ➜ ${date}`,
    `Heure ➜ ${time}`,
    `Uptime ➜ ${uptimeStr()}`,
    `Préfixe ➜ ${P()}`,
    `Commandes ➜ ${total}`,
  ]);

  const categories = textfx.box("LES DOSSIERS", [
    `${P()}ownermenu ➜ 🎩 Le Parrain`,
    `${P()}groupmenu ➜ 🔫 L'Équipe`,
    `${P()}automenu ➜ 🖤 Surveillance`,
    `${P()}aimenu ➜ 🧠 Le Conseiller`,
    `${P()}downloadmenu ➜ 💿 La Cave`,
    `${P()}githubmenu ➜ 🗂️ Les Archives`,
    `${P()}logomenu ➜ 🃏 Le Sceau`,
    `${P()}toolsmenu ➜ 🧰 La Mallette`,
    `${P()}textmenu ➜ ✒️ L'Encre`,
    `${P()}utilitymenu ➜ 🥂 Le Bar`,
    `${P()}exploitsmenu ➜ 💣 Le Coffre`,
    `${P()}photomenu ➜ 🖼️ La Galerie`,
    `${P()}reactmenu ➜ ❤️ Les Faveurs`,
    `${P()}gamemenu ➜ 🎲 Les Jeux`,
    `${P()}funmenu ➜ 🚬 Le Fumoir`,
    `${P()}animemenu ➜ 🌸 Le Salon`,
  ]);

  return `${header}\n\n${categories}`;
}

// ---------- Sous-menus ----------
function ownermenu() {
  return textfx.box("LE PARRAIN", cmdLines([
    "setbio <texte>", "setname <texte>", "setpp", "gpp", "botname", "intro",
    "channel", "changename", "block", "unblock", "ginfo", "shutdown", "restart",
    "pair <numéro>", "self", "public", "idcheck", "save"
  ]));
}

function groupmenu() {
  return textfx.box("L'ÉQUIPE", cmdLines([
    "kick", "kickall", "add <numéro>", "promote", "demote", "promoteall", "demoteall",
    "tagall", "tagadmin", "hidetag <texte>", "warn", "adminkill", "ghostping",
    "del", "reactch <emoji>", "delaymsg <s> <texte>", "join <lien>", "leave",
    "open", "close", "closetime <min>"
  ]));
}

function automenu() {
  return textfx.box("SURVEILLANCE", cmdLines([
    "antibug on/off", "antilink on/off", "antilinkick on/off", "autogreet on/off",
    "autoreact on/off", "autoread on/off", "autorecording on/off",
    "autostatus on/off", "autostatuslike on/off", "autotyping on/off",
    "antidelete on/off"
  ]));
}

function aimenu() {
  return textfx.box("LE CONSEILLER", cmdLines([
    "chatgpt <question>", "llama <question>", "claude <question>", "mistral <question>"
  ]));
}

function downloadmenu() {
  return textfx.box("LA CAVE", cmdLines([
    "song <nom/lien>", "song2 <nom/lien>", "video <nom/lien>", "video2 <nom/lien>", "play <nom>"
  ]));
}

function githubmenu() {
  return textfx.box("LES ARCHIVES", cmdLines([
    "github <user>", "gitclone <lien>", "gitfollow <user>", "gitfollowers <user>",
    "gitrepos <user>", "gitstarred <user>"
  ]));
}

function logomenu() {
  return textfx.box("LE SCEAU", cmdLines([
    "logo <texte>", "d3comic <texte>", "dragonball <texte>", "deadpool <texte>",
    "blackpink <texte>", "neonlight <texte>", "cat <texte>"
  ]));
}

function toolsmenu() {
  return textfx.box("LA MALLETTE", cmdLines([
    "calc <expression>", "poll <question>|<opt1>|<opt2>", "idcheck", "checkme", "numinfo <numéro>"
  ]));
}

function textmenu() {
  return textfx.box("L'ENCRE", cmdLines([
    "fliptext <texte>", "smallcaps <texte>", "bubble <texte>", "mirror <texte>",
    "reverse <texte>", "strike <texte>", "zalgo <texte>", "zalgo2 <texte>", "tte <texte>"
  ]));
}

function utilitymenu() {
  return textfx.box("LE BAR", cmdLines([
    "weather <ville>", "math", "emoji", "fact", "historyfact", "quote", "flag"
  ]));
}

function exploitsmenu() {
  return textfx.box("LE COFFRE", [
    `${P()}hack ➜ 🎭 effet décoratif (faux "piratage", pour l'ambiance)`,
    `${P()}matrix ➜ 🎭 effet décoratif (pluie de code, pour l'ambiance)`
  ]);
}

function photomenu() {
  return textfx.box("LA GALERIE", cmdLines([
    "art", "wallpaper", "gamewallpaper", "cyber", "gremory", "hacker", "hestia",
    "jibril", "rose", "technology", "pubg", "freefire", "mountain", "islamic",
    "dog", "imgcat"
  ]));
}

function reactmenu() {
  return textfx.box("LES FAVEURS", cmdLines([
    "waifu", "neko", "neko2", "hug", "kiss", "pat", "cuddle", "cry", "slap",
    "kill", "smile", "blush", "bite", "love", "baka"
  ]));
}

function gamemenu() {
  return textfx.box("LES JEUX", cmdLines([
    "rps <pierre/feuille/ciseaux>", "trivia", "riddle", "guessnumber", "scramble",
    "truthordare", "eightball <question>"
  ]));
}

function funmenu() {
  return textfx.box("LE FUMOIR", cmdLines([
    "joke", "roast", "heart", "nice", "say <texte>"
  ]));
}

function animemenu() {
  return textfx.box("LE SALON", [
    "Pas encore de commande par personnage dédié (itachi, zerotwo...).",
    `Pour des réactions anime ➜ ${P()}reactmenu`,
    `Pour des visuels anime (artworks) ➜ ${P()}photomenu (gremory, hestia, jibril)`
  ]);
}

module.exports = {
  menu, ownermenu, downloadmenu, groupmenu, automenu, aimenu, githubmenu,
  logomenu, toolsmenu, textmenu, utilitymenu, exploitsmenu, photomenu,
  reactmenu, gamemenu, funmenu, animemenu
};
