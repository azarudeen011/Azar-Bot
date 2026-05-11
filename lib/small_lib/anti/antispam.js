// ==============================================
// 🚫 Azahrabot AntiSpam System (STRICT + SAFE)
// Triggers ONLY on 7+ repeated spam or crash text
// ==============================================

const fs = require("fs");
const path = require("path");

// -----------------------------
// Global cache (FAST, in-memory)
// -----------------------------
if (!global.__AZAHRA_ANTISPAM__) {
  global.__AZAHRA_ANTISPAM__ = { users: {} };
}
const CACHE = global.__AZAHRA_ANTISPAM__;

// -----------------------------
// Config file
// -----------------------------
const DATA_FILE = path.join(__dirname, "../../../data/antispam.json");

// Unicode often used in crash / bug texts
const DANGEROUS_UNICODE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/;

// -----------------------------
// Load group config
// -----------------------------
function loadConfig() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    return {};
  }
}

function getGroupConfig(jid) {
  const cfg = loadConfig();
  return cfg[jid] || { delete: true, warn: false, kick: false };
}

// -----------------------------
// Cleanup old memory
// -----------------------------
setInterval(() => {
  const now = Date.now();
  for (const g in CACHE.users) {
    for (const u in CACHE.users[g]) {
      if (now - CACHE.users[g][u].last > 15 * 60 * 1000) {
        delete CACHE.users[g][u];
      }
    }
    if (Object.keys(CACHE.users[g]).length === 0) delete CACHE.users[g];
  }
}, 5 * 60 * 1000);

// -----------------------------
// Spam analysis (STRICT)
// -----------------------------
function analyze(group, user, text) {
  const now = Date.now();

  if (!CACHE.users[group]) CACHE.users[group] = {};
  if (!CACHE.users[group][user]) {
    CACHE.users[group][user] = {
      last: 0,
      count: 0,
      lastText: "",
      warns: 0,
    };
  }

  const u = CACHE.users[group][user];
  u.last = now;

  // Count ONLY exact same message
  if (text === u.lastText) {
    u.count++;
  } else {
    u.count = 1;
    u.lastText = text;
  }

  // Crash / bug payload detection
  const malicious =
    text.length > 2500 ||
    DANGEROUS_UNICODE.test(text) ||
    /(.)\1{20,}/.test(text);

  return {
    spam: u.count >= 7, // 🔑 ONLY 7+ repeats trigger
    malicious,
    user: u,
  };
}

// -----------------------------
// Main handler
// -----------------------------
async function handleAntiSpam(sock, msg, from, sender, isAdmin) {
  try {
    const isGroup = from.endsWith("@g.us");
    if (isAdmin || msg.key.fromMe) return;

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      "";

    if (!text) return;

    const res = analyze(from, sender, text);
    if (!res.spam && !res.malicious) return;

    const cfg = isGroup ? getGroupConfig(from) : { delete: true };

    // Always delete detected spam / crash
    if (cfg.delete) {
      await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
    }

    // DM → delete only (NO kick ever)
    if (!isGroup) return;

    // Malicious payload → instant kick (if enabled)
    if (res.malicious && cfg.kick) {
      await sock.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
      return;
    }

    // Warn logic
    if (cfg.warn) {
      res.user.warns++;
      if (res.user.warns >= 3 && cfg.kick) {
        await sock.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
        return;
      }
    }

    // Direct kick mode (no warn)
    if (cfg.kick && !cfg.warn) {
      await sock.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
    }
  } catch (e) {
    console.log("AntiSpam error:", e?.message || e);
  }
}

module.exports = { handleAntiSpam };
