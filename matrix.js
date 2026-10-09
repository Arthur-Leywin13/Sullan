// 📂 matrix.js — Petit effet texte façon "pluie Matrix", purement décoratif.

module.exports = async function matrix({ reply }) {
  const chars = "ｱｲｳｴｵABCDEFｶｷｸｹｺ0123456789";
  const lines = [];
  for (let i = 0; i < 6; i++) {
    let line = "";
    for (let j = 0; j < 20; j++) line += chars[Math.floor(Math.random() * chars.length)];
    lines.push(line);
  }
  reply("```\n" + lines.join("\n") + "\n```");
};
