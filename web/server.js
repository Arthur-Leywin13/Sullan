// 📂 web/server.js — Site de gestion de Sullivan.
//
//   • "/" (public, SANS mot de passe) : connecter un numéro (QR ou code), et voir l'état de
//     SES PROPRES numéros uniquement — jamais ceux des autres visiteurs.
//   • Accès admin cadenas : un petit repère discret en bas de page (5 clics) + un code
//     d'accès secret mène au tableau de bord complet (tous les numéros, préfixe, commandes).
//
// ⚠️ Sécurité : volontairement simple (cookie de visiteur en mémoire, un seul mot de passe
// admin partagé). Si le site est exposé publiquement, mets une vraie valeur forte dans
// settings.js → DASHBOARD_PASSCODE.

const express = require("express");
const QRCode = require("qrcode");
const crypto = require("crypto");
const { loadSettings } = require("../settings");
const runtimeConfig = require("../runtime-config");

const adminTokens = new Set();     // tokens admin valides (mémoire, perdus au redémarrage)
const pendingSessions = new Map(); // sessionId -> { qr, code, status, number }
const sessionOwners = new Map();   // sessionId -> visitorId (qui a lancé cette connexion)

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(v.join("="));
  }
  return out;
}

// Chaque visiteur reçoit un identifiant anonyme persistant (cookie), pour ne voir/gérer
// QUE les numéros qu'il a lui-même connectés depuis ce navigateur.
function ensureVisitor(req, res) {
  const cookies = parseCookies(req);
  if (cookies.sullivan_visitor) return cookies.sullivan_visitor;
  const id = crypto.randomBytes(16).toString("hex");
  res.setHeader("Set-Cookie", `sullivan_visitor=${id}; HttpOnly; Path=/; SameSite=Lax; Max-Age=31536000`);
  return id;
}

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  if (cookies.sullivan_admin && adminTokens.has(cookies.sullivan_admin)) return next();
  res.redirect("/");
}

// Décide quel id/dossier utiliser pour une nouvelle session : "main" si aucune session
// n'existe encore (continuité avec le dossier auth_info historique), sinon un nouvel id.
function nextSessionTarget() {
  const existing = global.sessions?.listSessions() || [];
  const hasMain = existing.some(s => s.id === "main");
  if (!hasMain) return { id: "main", authDir: "auth_info" };
  return { id: "session-" + Date.now(), authDir: undefined };
}

// ---------- Mise en page commune (thème sombre, ambiance mafia) ----------
function layout(title, body, { wide = false } = {}) {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Sullivan</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #07070a; --panel: #141116; --panel-2: #1b171e; --border: #332a2e;
    --accent: #c9a24a; --accent-2: #8a6a20; --text: #ece6da; --muted: #9a8f82;
    --good: #4ade80; --warn: #fbbf24; --bad: #f87171;
  }
  * { box-sizing: border-box; }
  body {
    margin:0; min-height:100vh; color: var(--text); font-family: 'Inter', system-ui, sans-serif;
    display:flex; flex-direction:column; align-items:center; padding: 48px 16px;
    position: relative; overflow-x: hidden;
    background:
      radial-gradient(ellipse at 20% -10%, rgba(201,162,74,.08) 0%, transparent 50%),
      radial-gradient(ellipse at 100% 110%, rgba(120,20,30,.12) 0%, transparent 55%),
      var(--bg);
  }
  /* Ambiance "fumée" + grain discret, en pur CSS (aucune image externe nécessaire) */
  body::before {
    content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      radial-gradient(circle at 10% 20%, rgba(255,255,255,.025) 0%, transparent 2%),
      radial-gradient(circle at 80% 60%, rgba(255,255,255,.02) 0%, transparent 2%),
      radial-gradient(circle at 40% 80%, rgba(255,255,255,.02) 0%, transparent 2%);
    background-size: 180px 180px, 240px 240px, 200px 200px;
  }
  body::after {
    content: "🎩"; position: fixed; bottom: -60px; right: -30px; font-size: 280px;
    opacity: .035; z-index: 0; transform: rotate(-12deg); pointer-events:none;
  }
  .card, .footer-mark { position: relative; z-index: 1; }
  h1, h2, .brand { font-family: 'Playfair Display', 'Space Grotesk', serif; }
  .brand { font-size: 30px; font-weight:800; letter-spacing: 1px;
    background: linear-gradient(135deg, #f0d487, var(--accent) 55%, var(--accent-2));
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  .card {
    background: linear-gradient(180deg, var(--panel), var(--panel-2));
    border: 1px solid var(--border); border-radius: 18px; padding: 32px;
    max-width: ${wide ? "760" : "440"}px; width:100%; text-align:center;
    box-shadow: 0 20px 60px rgba(0,0,0,.55);
  }
  .logo {
    width:100px; height:100px; border-radius:50%; margin:0 auto 18px;
    background: radial-gradient(circle at 35% 30%, #2a2420, #0d0b09);
    border: 2px solid var(--accent);
    display:flex; align-items:center; justify-content:center;
    font-family:'Playfair Display',serif; font-weight:800; font-size:38px; color: var(--accent);
    box-shadow: 0 0 36px rgba(201,162,74,.25);
  }
  p { color: var(--muted); line-height:1.5; }
  input, select, button {
    font-family:inherit; font-size:15px; padding:12px 14px; border-radius:10px;
    border:1px solid var(--border); margin-top:10px; width:100%;
    background: #0d0b0c; color: var(--text);
  }
  input:focus, select:focus { outline:none; border-color: var(--accent); }
  button {
    background: linear-gradient(135deg, var(--accent), var(--accent-2)); color:#161108;
    border:none; cursor:pointer; font-weight:700; letter-spacing:.3px;
    transition: filter .15s, transform .1s;
  }
  button:hover { filter: brightness(1.1); }
  button:active { transform: scale(.98); }
  button.danger { background: linear-gradient(135deg, #f87171, #7f1d1d); color:#fff; }
  .tabs { display:flex; gap:8px; margin-top:18px; }
  .tabs button { background:#0d0b0c; border:1px solid var(--border); color:var(--muted); flex:1; }
  .tabs button.active { background: linear-gradient(135deg, var(--accent), var(--accent-2)); color:#161108; border-color:transparent; }
  table { width:100%; border-collapse: collapse; margin-top:18px; font-size:14px; }
  td, th { padding:10px 8px; border-bottom:1px solid var(--border); text-align:left; }
  th { color: var(--muted); font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:.5px; }
  .pill { display:inline-block; padding:3px 10px; border-radius:999px; font-size:12px; font-weight:600; }
  .pill.connected { background:rgba(74,222,128,.15); color: var(--good); }
  .pill.connecting, .pill.reconnecting { background:rgba(251,191,36,.15); color: var(--warn); }
  .pill.logged_out { background:rgba(248,113,113,.15); color: var(--bad); }
  .chip-grid { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; justify-content:center; }
  .chip { background:#0d0b0c; border:1px solid var(--border); border-radius:8px;
    padding:6px 12px; font-size:13px; color:#e3c877; font-family:monospace; }
  a.back { color: var(--accent); text-decoration:none; font-size:14px; display:inline-block; margin-top:18px; }
  .row { display:flex; gap:10px; }
  .row > * { flex:1; }
  .status-line { margin-top:16px; font-size:14px; color: var(--muted); }
  .code-display {
    font-family:'Space Grotesk',monospace; font-size:32px; letter-spacing:6px;
    color:#fff; background:#0d0b0c; border:1px solid var(--accent); border-radius:12px;
    padding:18px; margin-top:16px;
  }
  .section-title { margin-top:28px; margin-bottom:0; font-size:13px; text-transform:uppercase;
    letter-spacing:1px; color:var(--muted); text-align:left; }
  .footer-mark {
    margin-top:36px; opacity:.25; font-size:11px; cursor:pointer; user-select:none;
    color: var(--muted); letter-spacing:2px;
  }
  .footer-mark:hover { opacity:.5; }
</style></head>
<body>${body}</body></html>`;
}

function startWebServer(port) {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // ============================================================
  // 🔸 Page publique : connexion d'un numéro (QR ou code), en premier
  // ============================================================
  app.get("/", (req, res) => {
    const visitorId = ensureVisitor(req, res);
    const mine = (global.sessions?.listSessions() || []).filter(s => sessionOwners.get(s.id) === visitorId);

    const mineRows = mine.map(s => `
      <tr>
        <td>${s.number ? "+" + s.number : "—"}</td>
        <td><span class="pill ${s.status}">${s.status}</span></td>
        <td>
          <form method="POST" action="/my/disconnect/${encodeURIComponent(s.id)}" onsubmit="return confirm('Déconnecter ce numéro ?')">
            <button class="danger" type="submit" style="margin:0;padding:6px 12px;font-size:13px">Déconnecter</button>
          </form>
        </td>
      </tr>
    `).join("");

    res.send(layout("Sullivan", `
      <div class="card">
        <div class="logo">S</div>
        <div class="brand">SULLIVAN</div>
        <p>Connecte ton numéro WhatsApp à la famille.</p>

        <div class="tabs">
          <button id="tabQr" class="active" onclick="showTab('qr')">📷 QR Code</button>
          <button id="tabCode" onclick="showTab('code')">🔢 Code</button>
        </div>

        <div id="panelQr">
          <p>Ouvre WhatsApp → Appareils liés → Lier un appareil, et scanne :</p>
          <img id="qrImg" style="width:100%;max-width:240px;border-radius:12px;margin-top:8px" src="">
          <p class="status-line" id="qrStatus">Initialisation...</p>
        </div>

        <div id="panelCode" style="display:none">
          <p>Entre ton numéro WhatsApp (avec l'indicatif pays) :</p>
          <form id="codeForm" class="row">
            <input type="text" id="phoneInput" placeholder="Ex: 50912345678">
            <button type="submit" style="flex:0 0 auto;width:auto;padding:12px 20px">Obtenir le code</button>
          </form>
          <div id="codeResult"></div>
        </div>

        ${mine.length ? `
          <p class="section-title">Tes numéros</p>
          <table><tr><th>Numéro</th><th>Statut</th><th></th></tr>${mineRows}</table>
        ` : ""}

        <div class="footer-mark" id="mark" onclick="markClick()">•</div>
        <form id="adminForm" method="POST" action="/admin-auth" style="display:none">
          <input type="password" name="passcode" placeholder="Code d'accès">
          <button type="submit">Entrer</button>
        </form>
      </div>

      <script>
        let currentId = null;
        let clicks = 0;

        function markClick() {
          clicks++;
          if (clicks >= 5) document.getElementById('adminForm').style.display = 'block';
        }

        function showTab(tab) {
          document.getElementById('tabQr').classList.toggle('active', tab === 'qr');
          document.getElementById('tabCode').classList.toggle('active', tab === 'code');
          document.getElementById('panelQr').style.display = tab === 'qr' ? 'block' : 'none';
          document.getElementById('panelCode').style.display = tab === 'code' ? 'block' : 'none';
          if (tab === 'qr' && !currentId) startQr();
        }

        async function startQr() {
          const r = await fetch('/connect/start-qr', { method: 'POST' });
          const data = await r.json();
          currentId = data.id;
          poll();
        }

        document.getElementById('codeForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const phone = document.getElementById('phoneInput').value.trim();
          if (!phone) return;
          document.getElementById('codeResult').innerHTML = '<p class="status-line">Génération du code...</p>';
          const r = await fetch('/connect/start-code', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
          });
          const data = await r.json();
          if (data.error) {
            document.getElementById('codeResult').innerHTML = '<p style="color:var(--bad)">' + data.error + '</p>';
            return;
          }
          currentId = data.id;
          poll();
        });

        async function poll() {
          if (!currentId) return;
          const r = await fetch('/connect/status/' + currentId);
          const data = await r.json();

          if (data.qr) document.getElementById('qrImg').src = data.qr;
          document.getElementById('qrStatus').textContent = data.status || '...';

          if (data.code) {
            document.getElementById('codeResult').innerHTML =
              '<div class="code-display">' + data.code + '</div>' +
              '<p class="status-line">À entrer dans WhatsApp → Appareils liés → Lier avec un numéro de téléphone (valable ~60s)</p>';
          }

          if (data.status === 'connected') {
            document.getElementById('qrStatus').innerHTML = '✅ Connecté : +' + (data.number || '');
            if (document.getElementById('codeResult').innerHTML) {
              document.getElementById('codeResult').innerHTML += '<p style="color:var(--good)">✅ Connecté !</p>';
            }
            setTimeout(() => location.reload(), 1200);
            return;
          }
          setTimeout(poll, 1500);
        }

        showTab('qr');
      </script>
    `));
  });

  app.post("/connect/start-qr", (req, res) => {
    const visitorId = ensureVisitor(req, res);
    const target = nextSessionTarget();
    pendingSessions.set(target.id, { qr: null, code: null, status: "connecting" });
    sessionOwners.set(target.id, visitorId);

    global.sessions?.startSession(target.id, {
      authDir: target.authDir,
      onQR: (qr) => pendingSessions.set(target.id, { ...pendingSessions.get(target.id), qr }),
      onStatus: (status) => pendingSessions.set(target.id, { ...pendingSessions.get(target.id), status }),
      onConnected: (number) => pendingSessions.set(target.id, { qr: null, code: null, status: "connected", number })
    }).catch(err => console.error("[web/connect-qr] Erreur:", err.message));

    res.json({ id: target.id });
  });

  app.post("/connect/start-code", (req, res) => {
    const visitorId = ensureVisitor(req, res);
    const phone = String(req.body.phone || "").replace(/\D/g, "");
    if (!phone) return res.json({ error: "Numéro invalide." });

    const existing = global.sessions?.listSessions().find(s => s.number === phone);
    if (existing) return res.json({ error: "Ce numéro est déjà connecté." });

    const target = nextSessionTarget();
    pendingSessions.set(target.id, { qr: null, code: null, status: "connecting" });
    sessionOwners.set(target.id, visitorId);

    global.sessions?.startSession(target.id, {
      authDir: target.authDir,
      phoneNumber: phone,
      onPairingCode: (code) => pendingSessions.set(target.id, { ...pendingSessions.get(target.id), code }),
      onStatus: (status) => pendingSessions.set(target.id, { ...pendingSessions.get(target.id), status }),
      onConnected: (number) => pendingSessions.set(target.id, { qr: null, code: null, status: "connected", number })
    }).catch(err => console.error("[web/connect-code] Erreur:", err.message));

    res.json({ id: target.id });
  });

  app.get("/connect/status/:id", async (req, res) => {
    const visitorId = ensureVisitor(req, res);
    if (sessionOwners.get(req.params.id) !== visitorId) return res.json({ status: "inconnu" });

    const entry = pendingSessions.get(req.params.id);
    if (!entry) return res.json({ status: "inconnu" });
    if (!entry.qr) return res.json({ status: entry.status, code: entry.code, number: entry.number });
    try {
      const dataUrl = await QRCode.toDataURL(entry.qr);
      res.json({ status: entry.status, qr: dataUrl, code: entry.code, number: entry.number });
    } catch {
      res.json({ status: entry.status, code: entry.code, number: entry.number });
    }
  });

  // Déconnexion en self-service : un visiteur ne peut couper QUE son propre numéro.
  app.post("/my/disconnect/:id", (req, res) => {
    const visitorId = ensureVisitor(req, res);
    if (sessionOwners.get(req.params.id) === visitorId) {
      global.sessions?.disconnectSession(req.params.id);
      sessionOwners.delete(req.params.id);
    }
    res.redirect("/");
  });

  // ============================================================
  // 🔸 Accès admin (caché derrière le repère "•" + code d'accès)
  // ============================================================
  app.post("/admin-auth", (req, res) => {
    const settings = loadSettings();
    const passcode = settings.DASHBOARD_PASSCODE || "Sullivan08";
    if (req.body.passcode !== passcode) return res.redirect("/");
    const token = crypto.randomBytes(24).toString("hex");
    adminTokens.add(token);
    res.setHeader("Set-Cookie", `sullivan_admin=${token}; HttpOnly; Path=/; SameSite=Lax`);
    res.redirect("/admin");
  });

  app.get("/admin", requireAdmin, (req, res) => {
    const list = global.sessions?.listSessions() || [];
    const rows = list.map(s => `
      <tr>
        <td>${s.id}</td>
        <td>${s.number ? "+" + s.number : "—"}</td>
        <td><span class="pill ${s.status}">${s.status}</span></td>
        <td>
          <form method="POST" action="/admin/disconnect/${encodeURIComponent(s.id)}" onsubmit="return confirm('Déconnecter ce numéro ?')">
            <button class="danger" type="submit" style="margin:0;padding:6px 12px;font-size:13px">Déconnecter</button>
          </form>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="4" style="color:var(--muted)">Aucune session pour l'instant.</td></tr>`;

    res.send(layout("Tableau de bord", `
      <div class="card" style="max-width:720px">
        <div class="brand">LE CONSEIL</div>

        <p class="section-title">Tous les numéros connectés</p>
        <table>
          <tr><th>Session</th><th>Numéro</th><th>Statut</th><th></th></tr>
          ${rows}
        </table>

        <p class="section-title">Préfixe des commandes</p>
        <form method="POST" action="/admin/prefix" class="row">
          <input type="text" name="prefix" maxlength="3" value="${global.prefix || "."}" placeholder=".">
          <button type="submit" style="flex:0 0 auto;width:auto;padding:12px 20px">Enregistrer</button>
        </form>

        <a class="back" href="/admin/commands">📜 Voir toutes les commandes disponibles</a><br>
        <a class="back" href="/">← Retour à l'accueil</a>
      </div>
    `, { wide: true }));
  });

  app.post("/admin/prefix", requireAdmin, (req, res) => {
    try {
      runtimeConfig.setPrefix(req.body.prefix);
    } catch (err) {
      return res.send(layout("Préfixe", `<div class="card"><p style="color:var(--bad)">${err.message}</p><a class="back" href="/admin">← Retour</a></div>`));
    }
    res.redirect("/admin");
  });

  app.post("/admin/disconnect/:id", requireAdmin, (req, res) => {
    global.sessions?.disconnectSession(req.params.id);
    sessionOwners.delete(req.params.id);
    res.redirect("/admin");
  });

  app.get("/admin/commands", requireAdmin, (req, res) => {
    let commands = [];
    try { commands = require("../commands-list").listCommands(); } catch {}
    const prefix = global.prefix || ".";
    const chips = commands.map(c => `<span class="chip">${prefix}${c}</span>`).join("");

    res.send(layout("Commandes", `
      <div class="card" style="max-width:720px;text-align:left">
        <div class="brand" style="text-align:center">COMMANDES DISPONIBLES</div>
        <p style="text-align:center">${commands.length} commandes — préfixe actuel : <b>${prefix}</b></p>
        <div class="chip-grid">${chips}</div>
        <div style="text-align:center"><a class="back" href="/admin">← Retour au tableau de bord</a></div>
      </div>
    `, { wide: true }));
  });

  app.listen(port, () => {
    console.log(`🌐 Site web disponible sur le port ${port}`);
  });

  return app;
}

module.exports = { startWebServer };
