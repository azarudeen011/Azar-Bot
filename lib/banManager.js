// ==============================================
// 🚫 Azahrabot Ban Manager (v4.0 — Memory-Cached)
// Admins & Owner Only — Auto Message Delete
// Reads from disk ONCE, then stays in memory
// ==============================================

const fs = require("fs");
const path = require("path");

const BAN_FILE = path.join(__dirname, "../data/bannedUsers.json");

// 🗂️ Ensure data directory
if (!fs.existsSync(path.dirname(BAN_FILE))) {
  fs.mkdirSync(path.dirname(BAN_FILE), { recursive: true });
}
if (!fs.existsSync(BAN_FILE)) {
  fs.writeFileSync(BAN_FILE, JSON.stringify([]));
}

// 🧠 In-memory cache — loaded ONCE at startup
let banCache = [];
try {
  banCache = JSON.parse(fs.readFileSync(BAN_FILE, "utf8"));
  if (!Array.isArray(banCache)) banCache = [];
} catch {
  banCache = [];
}

// 💾 Save cache to disk (only called when bans change)
function saveBans() {
  try {
    fs.writeFileSync(BAN_FILE, JSON.stringify(banCache, null, 2));
  } catch (err) {
    console.error("⚠️ Failed to save ban list:", err.message);
  }
}

// 🚫 Core functions — all use in-memory cache (O(1) via Set would be overkill for small lists)
function addBan(jid) {
  if (!banCache.includes(jid)) {
    banCache.push(jid);
    saveBans();
  }
}

function isBanned(jid) {
  return banCache.includes(jid);
}

function removeBan(jid) {
  const idx = banCache.indexOf(jid);
  if (idx !== -1) {
    banCache.splice(idx, 1);
    saveBans();
  }
}

async function handleBanMessages(sock, msg) {
  const sender = msg.key.participant || msg.key.remoteJid;
  if (isBanned(sender)) {
    try {
      await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
    } catch {
      // ignore failures silently
    }
  }
}

module.exports = { addBan, removeBan, isBanned, handleBanMessages };
