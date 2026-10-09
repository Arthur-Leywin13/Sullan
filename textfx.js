// 📂 textfx.js — Transformations de texte pures (aucune API externe)

const flipMap = { a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ƃ',h:'ɥ',i:'ᴉ',j:'ɾ',k:'ʞ',l:'l',m:'ɯ',n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z' };
const smallCapsMap = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
const bubbleMap = { a:'ⓐ',b:'ⓑ',c:'ⓒ',d:'ⓓ',e:'ⓔ',f:'ⓕ',g:'ⓖ',h:'ⓗ',i:'ⓘ',j:'ⓙ',k:'ⓚ',l:'ⓛ',m:'ⓜ',n:'ⓝ',o:'ⓞ',p:'ⓟ',q:'ⓠ',r:'ⓡ',s:'ⓢ',t:'ⓣ',u:'ⓤ',v:'ⓥ',w:'ⓦ',x:'ⓧ',y:'ⓨ',z:'ⓩ' };
const zalgoMarks = ['\u0300','\u0301','\u0302','\u0303','\u0304','\u0305','\u0306','\u0307','\u0308','\u0309','\u030a','\u030b','\u030c'];

function applyMap(text, map) {
  return text.toLowerCase().split('').map(c => map[c] || c).join('');
}

function fliptext(text) {
  return applyMap(text, flipMap).split('').reverse().join('');
}

function smallcaps(text) {
  return applyMap(text, smallCapsMap);
}

function bubble(text) {
  return applyMap(text, bubbleMap);
}

function mirror(text) {
  return text.split('').reverse().join('');
}

function reverse(text) {
  return text.split('').reverse().join('');
}

function strike(text) {
  return text.split('').map(c => c + '\u0336').join('');
}

function zalgo(text, intensity = 3) {
  return text.split('').map(c => {
    let out = c;
    for (let i = 0; i < intensity; i++) {
      out += zalgoMarks[Math.floor(Math.random() * zalgoMarks.length)];
    }
    return out;
  }).join('');
}

// ---------- Police "monospace mathématique" + cadre de style (demandé explicitement) ----------
// Convertit uniquement les lettres/chiffres — tout le reste (émojis, symboles ➜ ✦ etc.) reste tel quel.
function monospace(text) {
  return String(text).split("").map(ch => {
    const code = ch.charCodeAt(0);
    if (ch >= "A" && ch <= "Z") return String.fromCodePoint(0x1d670 + (code - 65));
    if (ch >= "a" && ch <= "z") return String.fromCodePoint(0x1d68a + (code - 97));
    if (ch >= "0" && ch <= "9") return String.fromCodePoint(0x1d7f6 + (code - 48));
    return ch;
  }).join("");
}

// Cadre réutilisable, dans le style demandé : titre + lignes, en police monospace.
// On ne change QUE la police/mise en forme — le contenu (titre, lignes) reste celui fourni.
function box(title, lines) {
  const out = [`> *╭─❮ ❍ ${monospace(title)} ❍ ❯*`];
  for (const l of lines) out.push(`> *│ ✦ ${monospace(l)}*`);
  out.push("> *╰┄┄┄┄┄┄┄┄┄┄┄⪼*");
  return out.join("\n");
}

module.exports = { fliptext, smallcaps, bubble, mirror, reverse, strike, zalgo, monospace, box };
