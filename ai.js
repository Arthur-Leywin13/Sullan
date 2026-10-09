// 📂 ai.js — Un seul point d'appel Groq, réutilisé par chatgpt/llama/claude/mistral.
// ⚠️ Groq n'héberge pas réellement GPT/Claude/Mistral : ce sont des alias vers de vrais
// modèles disponibles sur Groq, pour coller aux noms du menu d'origine.
// Mets ta clé dans settings.js → GROQ_API_KEY avant utilisation.

const Groq = require("groq-sdk");
const { loadSettings } = require("./settings");

const MODEL_MAP = {
  chatgpt: "llama-3.3-70b-versatile",
  llama: "llama-3.3-70b-versatile",
  claude: "llama-3.1-8b-instant",   // alias — Groq n'héberge pas Claude
  mistral: "mixtral-8x7b-32768"
};

async function askAI(label, prompt, reply) {
  const settings = typeof loadSettings === "function" ? loadSettings() : {};
  const apiKey = settings.GROQ_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    return reply(`❌ Aucune clé GROQ_API_KEY configurée dans settings.js. Impossible d'utiliser .${label}.`);
  }
  if (!prompt) {
    return reply(`✏️ Utilise : .${label} <ta question>`);
  }

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: MODEL_MAP[label] || MODEL_MAP.chatgpt,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800
    });
    const text = completion.choices?.[0]?.message?.content?.trim() || "⚠️ Pas de réponse.";
    return reply(text);
  } catch (err) {
    console.error(`❌ AI (${label}) Error:`, err.message || err);
    return reply("⚠️ Erreur pendant l'appel au modèle IA.");
  }
}

module.exports = { askAI };
