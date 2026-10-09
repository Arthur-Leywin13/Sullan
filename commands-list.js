// 📂 commands-list.js — Liste des commandes disponibles (pour l'affichage sur le site web).
// Combine les commandes de menu/core.js avec les commandes "fichier racine" dispatchées
// directement par menu/case.js (toggles, groupe, etc.).

const core = require("./menu/core.js");

const ROOT_COMMANDS = [
  "menu", "idcheck", "antidelete", "kick", "antibug", "antilink", "antilinkick",
  "autogreet", "autoreact", "autoread", "autorecording", "autostatus", "autotyping",
  "autostatuslike", "pair", "self", "public"
];

function listCommands() {
  // core.js inclut déjà les commandes photo (mots-clés) et logo (styles), branchées par
  // des boucles sur leurs KEYWORDS/STYLES — pas besoin de les ajouter séparément ici.
  return [...new Set([...Object.keys(core), ...ROOT_COMMANDS])].sort();
}

module.exports = { listCommands };
