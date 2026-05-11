const fs = require("fs");
const path = require("path");

const afkFile = path.join(__dirname, "../data/afk.json");

// Load AFK Data
function loadAfk() {
  try {
    if (!fs.existsSync(afkFile)) {
      if (!fs.existsSync(path.dirname(afkFile))) {
        fs.mkdirSync(path.dirname(afkFile), { recursive: true });
      }
      fs.writeFileSync(afkFile, JSON.stringify({}));
      return {};
    }
    return JSON.parse(fs.readFileSync(afkFile, "utf8"));
  } catch (err) {
    console.error("❌ Failed to load AFK list:", err);
    return {};
  }
}

// Save AFK Data
function saveAfk(data) {
  try {
    fs.writeFileSync(afkFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Failed to save AFK list:", err);
  }
}

const afkManager = {
  addAfk: (jid, reason) => {
    const data = loadAfk();
    data[jid] = {
      reason: reason || "Busy",
      time: Date.now()
    };
    saveAfk(data);
  },
  removeAfk: (jid) => {
    const data = loadAfk();
    if (data[jid]) {
      delete data[jid];
      saveAfk(data);
      return true;
    }
    return false;
  },
  isAfk: (jid) => {
    const data = loadAfk();
    return !!data[jid];
  },
  getAfkReason: (jid) => {
    const data = loadAfk();
    return data[jid]?.reason || "Busy";
  }
};

module.exports = afkManager;
