// ==============================================
// 🚨 Azahrabot AntiLink System (v3.5 — Global Cache Sync)
// Fixes multi-require mismatch, live reset works instantly
// ==============================================

const fs = require("fs");
const path = require("path");

// Single global cache across requires
if (!global.__AzahraAntiLinkCache) {
  global.__AzahraAntiLinkCache = {
    warnCache: {},
    lastSync: 0
  };
}
const GLOBAL = global.__AzahraAntiLinkCache;

// 🔧 Data storage paths
const DATA_DIR = path.join(__dirname, "../../../data");
const CONFIG_FILE = path.join(DATA_DIR, "antilink_config.json");
const WARN_FILE = path.join(DATA_DIR, "antilink_warns.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/* ========== File helpers ========== */
function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* ========== Config system ========== */
function getGroupMode(gid) {
  const cfg = readJSON(CONFIG_FILE);
  return cfg[gid] || { delete: true, warn: false, kick: false };
}
function setGroupMode(gid, newCfg = {}) {
  const cfg = readJSON(CONFIG_FILE);
  cfg[gid] = { ...(cfg[gid] || {}), ...newCfg };
  writeJSON(CONFIG_FILE, cfg);
  return cfg[gid];
}

/* ========== Warn system ========== */
function loadWarns() {
  GLOBAL.warnCache = readJSON(WARN_FILE) || {};
  GLOBAL.lastSync = Date.now();
  return GLOBAL.warnCache;
}
function saveWarns() {
  writeJSON(WARN_FILE, GLOBAL.warnCache || {});
  GLOBAL.lastSync = Date.now();
}
function addWarn(gid, uid) {
  if (!GLOBAL.warnCache[gid]) GLOBAL.warnCache[gid] = {};
  GLOBAL.warnCache[gid][uid] = (GLOBAL.warnCache[gid][uid] || 0) + 1;
  saveWarns();
  return GLOBAL.warnCache[gid][uid];
}
function getWarnCount(gid, uid) {
  return GLOBAL.warnCache[gid]?.[uid] || 0;
}
function resetWarns(gid, uid = null) {
  if (!GLOBAL.warnCache[gid]) GLOBAL.warnCache[gid] = {};
  if (uid) delete GLOBAL.warnCache[gid][uid];
  else GLOBAL.warnCache[gid] = {};
  saveWarns();
  return true;
}
loadWarns();

/* ========== Link detection ========== */
function containsLink(text = "") {
  const regex = /\b(?:https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-z]{2,})(\/\S*)?\b/i;
  return regex.test(text);
}

/* ========== Handler ========== */
async function handleAntiLink(sock, msg, from, sender, isAdmin) {
  try {
    if (!from.endsWith("@g.us")) return;
    if (isAdmin || msg.key.fromMe) return;

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      "";

    if (!containsLink(text)) return;

    const cfg = getGroupMode(from);
    let acted = false;

    // delete
    if (cfg.delete) {
      await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
      acted = true;
    }

    // warn
    if (cfg.warn) {
      const count = addWarn(from, sender);
      await sock.sendMessage(from, {
        text: `⚠️ *Warning!* @${sender.split("@")[0]}\nYou shared a link!\n📊 *Warn Count:* ${count} / 3`,
        mentions: [sender],
      });

      if (count >= 3 && cfg.kick) {
        await sock.sendMessage(from, {
          text: `🚫 *User Removed Automatically*\n@${sender.split("@")[0]} reached 3 warnings.`,
          mentions: [sender],
        });
        await sock.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
        resetWarns(from, sender);
      }
      acted = true;
    }

    // kick-only
    if (!cfg.warn && cfg.kick) {
      await sock.sendMessage(from, {
        text: `🚨 *Link Detected!* @${sender.split("@")[0]} removed instantly.`,
        mentions: [sender],
      });
      await sock.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
      acted = true;
    }

    if (!acted) {
      await sock.sendMessage(from, {
        text: `⚙️ AntiLink detected a link from @${sender.split("@")[0]}, but no action is configured.\nUse .antilink delete|warn|kick on/off.`,
        mentions: [sender],
      });
    }
  } catch (e) {
    console.error("AntiLink handler error:", e);
  }
}

/* ========== Exports ========== */
module.exports = {
  handleAntiLink,
  containsLink,
  getGroupMode,
  setGroupMode,
  addWarn,
  getWarnCount,
  resetWarns,
  // backward aliases
  resetWarn: resetWarns,
};
