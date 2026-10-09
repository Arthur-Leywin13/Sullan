// 📂 runtime-config.js — Petite config persistée sur disque (le préfixe des commandes),
// modifiable depuis le site web sans redémarrer le bot.

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "data");
const FILE = path.join(DIR, "runtime-config.json");

const DEFAULTS = { prefix: "." };

function load() {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(config) {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(config, null, 2));
}

function getPrefix() {
  return global.prefix || DEFAULTS.prefix;
}

function setPrefix(newPrefix) {
  const prefix = String(newPrefix || "").trim();
  if (!prefix || prefix.length > 3 || /\s/.test(prefix)) {
    throw new Error("Préfixe invalide (1 à 3 caractères, sans espace).");
  }
  const config = load();
  config.prefix = prefix;
  save(config);
  global.prefix = prefix;
  return prefix;
}

module.exports = { load, save, getPrefix, setPrefix, DEFAULTS };
