// 📂 sessions.js — Gère plusieurs connexions WhatsApp (sessions) en parallèle :
// une session "main" (celle lancée au démarrage, par pairing code dans le terminal),
// et d'éventuelles sessions additionnelles créées via .pair ou via le site web (QR).

const fs = require("fs");
const path = require("path");
const P = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const { bindHandlers } = require("./bot-engine");

const SESSIONS_ROOT = path.join(__dirname, "sessions-data");
if (!fs.existsSync(SESSIONS_ROOT)) fs.mkdirSync(SESSIONS_ROOT, { recursive: true });

// id -> { sock, status, number, qr, authDir }
const sessions = new Map();

function listSessions() {
  return [...sessions.entries()].map(([id, s]) => ({
    id,
    number: s.number,
    status: s.status
  }));
}

function getSession(id) {
  return sessions.get(id);
}

// Attend que la connexion soit effectivement "en cours" avant de demander un code de
// pairing (sinon le code s'affiche mais n'atteint jamais vraiment le serveur — bug de
// timing connu avec Baileys).
function waitForConnecting(sock) {
  return new Promise((resolve) => {
    if (sock.ws?.socket?.readyState === 1) return resolve();
    const onUpdate = (u) => {
      if (u.connection === "connecting" || u.qr) {
        sock.ev.off("connection.update", onUpdate);
        resolve();
      }
    };
    sock.ev.on("connection.update", onUpdate);
    setTimeout(resolve, 4000);
  });
}

/**
 * Démarre (ou relance) une session.
 * opts:
 *   - authDir          : dossier des identifiants (défaut: sessions-data/<id>)
 *   - phoneNumber      : si fourni → pairing code pour ce numéro
 *   - getPhoneNumber   : fonction async appelée pour obtenir le numéro à la volée (ex: readline CLI)
 *   - onPairingCode(code)
 *   - onQR(qrString)   : si ni phoneNumber ni getPhoneNumber → Baileys génère un QR automatiquement
 *   - onConnected(number)
 *   - onStatus(status) : "connecting" | "connected" | "reconnecting" | "logged_out"
 */
async function startSession(id, opts = {}) {
  const authDir = opts.authDir || path.join(SESSIONS_ROOT, id);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({ version, auth: state, logger: P({ level: "fatal" }) });
  sessions.set(id, { sock, status: "connecting", number: sessions.get(id)?.number || null, qr: null, authDir });
  opts.onStatus?.("connecting");

  sock.ev.on("creds.update", saveCreds);
  bindHandlers(sock);

  let restarting = false;

  sock.ev.on("connection.update", async (update) => {
    const s = sessions.get(id);
    if (!s) return;

    if (update.qr) {
      s.qr = update.qr;
      opts.onQR?.(update.qr);
    }

    if (update.connection === "open") {
      s.status = "connected";
      s.number = sock.user?.id?.split(":")[0]?.replace(/\D/g, "") || null;
      s.qr = null;
      opts.onStatus?.("connected");
      opts.onConnected?.(s.number);
    }

    if (update.connection === "close") {
      if (restarting) return;
      const statusCode = update.lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      if (isLoggedOut && !state.creds?.registered) {
        // Pairing jamais finalisé → identifiants partiels invalides → on nettoie et on retente
        console.log(`[${id}] ⚠️ Connexion coupée pendant le pairing, nouvelle tentative...`);
        restarting = true;
        try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
        await startSession(id, opts);
        restarting = false;
        return;
      }

      if (isLoggedOut) {
        console.log(`[${id}] 🚪 Session déconnectée (logout).`);
        s.status = "logged_out";
        opts.onStatus?.("logged_out");
        try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
        sessions.delete(id);
        return;
      }

      console.log(`[${id}] 🔁 Reconnexion...`);
      s.status = "reconnecting";
      opts.onStatus?.("reconnecting");
      restarting = true;
      await startSession(id, opts);
      restarting = false;
    }
  });

  if (!state.creds?.registered) {
    let phoneNumber = opts.phoneNumber;
    if (!phoneNumber && opts.getPhoneNumber) phoneNumber = await opts.getPhoneNumber();

    if (phoneNumber) {
      await waitForConnecting(sock);
      try {
        const code = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ""));
        opts.onPairingCode?.(code);
      } catch (err) {
        console.error(`[${id}] ❌ Erreur pairing:`, err.message || err);
      }
    }
    // Sinon : pas de numéro fourni → Baileys génère un QR automatiquement (capté par onQR ci-dessus)
  }

  return sock;
}

function disconnectSession(id) {
  const s = sessions.get(id);
  if (!s) return false;
  try { s.sock.logout(); } catch {}
  try { fs.rmSync(s.authDir, { recursive: true, force: true }); } catch {}
  sessions.delete(id);
  return true;
}

module.exports = { startSession, getSession, listSessions, disconnectSession, SESSIONS_ROOT };
