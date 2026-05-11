// ==============================================
// 🚨 Azahrabot AntiLink-GC System (v1.0)
// Specifically detects and blocks WhatsApp Group/Channel links
// ==============================================

const fs = require("fs");
const path = require("path");

// Single global cache across requires
if (!global.__AzahraAntiLinkGCCache) {
  global.__AzahraAntiLinkGCCache = {
    warnCache: {},
    lastSync: 0
  };
}
const GLOBAL = global.__AzahraAntiLinkGCCache;

// 🔧 Data storage paths
const DATA_DIR = path.join(__dirname, "../../../data");
const CONFIG_FILE = path.join(DATA_DIR, "antilinkgc_config.json");
const WARN_FILE = path.join(DATA_DIR, "antilinkgc_warns.json");

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

/* ========== Link detection (WhatsApp Specific) ========== */
function isWhatsAppLink(text = "") {
  // Matches chat.whatsapp.com/invite_code or whatsapp.com/channel/id
  const regex = /(chat\.whatsapp\.com\/[a-zA-Z0-9_-]+|whatsapp\.com\/channel\/[a-zA-Z0-9_-]+)/i;
  return regex.test(text);
}

/* ========== Handler ========== */
async function handleAntilinkgc(sock, msg, from, sender, isAdmin) {
  try {
    if (!from.endsWith("@g.us")) return;
    if (isAdmin || msg.key.fromMe) return;

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      "";

    if (!isWhatsAppLink(text)) return;

    const cfg = getGroupMode(from);
    let acted = false;

    // 🧹 Delete link instantly
    if (cfg.delete) {
      await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
      acted = true;
    }

    // ⚠️ Warn system
    if (cfg.warn) {
      const count = addWarn(from, sender);
      await sock.sendMessage(from, {
        text: `🚨 *WhatsApp Link Detected!* @${sender.split("@")[0]}\nGroup/Channel links are strictly prohibited here.\n📊 *Warn Count:* ${count} / 3`,
        mentions: [sender],
      });

      if (count >= 3 && cfg.kick) {
        await sock.sendMessage(from, {
          text: `🚫 *Member Removed*\n@${sender.split("@")[0]} reached maximum warnings for link spam.`,
          mentions: [sender],
        });
        await sock.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
        resetWarns(from, sender);
      }
      acted = true;
    }

    // 🚫 Direct Kick (if warn is off but kick is on)
    if (!cfg.warn && cfg.kick) {
      await sock.sendMessage(from, {
        text: `🚨 *Instant Ban!* @${sender.split("@")[0]} was removed for sharing a WhatsApp link.`,
        mentions: [sender],
      });
      await sock.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
      acted = true;
    }
  } catch (e) {
    console.error("AntiLink-GC handler error:", e);
  }
}

/* ========== Exports ========== */
module.exports = {
  handleAntilinkgc,
  isWhatsAppLink,
  getGroupMode,
  setGroupMode,
  resetWarns
};
