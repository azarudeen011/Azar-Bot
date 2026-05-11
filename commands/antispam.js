// ==============================================
// commands/antispam.js
// 🛡️ AntiSpam Command (delete | warn | kick)
// Azahrabot
// ==============================================

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const DATA_FILE = path.join(DATA_DIR, "antispam.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = async function (sock, msg, from, text, args) {
  // group only
  if (!from.endsWith("@g.us")) {
    return sock.sendMessage(from, {
      text: "❌ AntiSpam can be used only in groups.",
    });
  }

  // admin check
  const sender = msg.key.participant;
  const metadata = await sock.groupMetadata(from).catch(() => null);
  const admins =
    metadata?.participants
      ?.filter((p) => p.admin)
      .map((p) => p.id) || [];

  const isAdmin = msg.key.fromMe || admins.includes(sender);
  if (!isAdmin) {
    return sock.sendMessage(from, {
      text: "❌ Only group admins can use this command.",
    });
  }

  const data = loadData();
  if (!data[from]) {
    data[from] = { delete: true, warn: false, kick: false };
  }

  const [mode, state] = args.map(a => a?.toLowerCase());

  // show status
  if (!mode) {
    const cfg = data[from];
    return sock.sendMessage(from, {
      text:
        `🛡️ *AntiSpam Settings*\n\n` +
        `🗑️ Delete : ${cfg.delete ? "ON" : "OFF"}\n` +
        `⚠️ Warn   : ${cfg.warn ? "ON" : "OFF"}\n` +
        `🚫 Kick   : ${cfg.kick ? "ON" : "OFF"}`
    });
  }

  if (!["delete", "warn", "kick"].includes(mode) || !["on", "off"].includes(state)) {
    return sock.sendMessage(from, {
      text:
        "Usage:\n" +
        ".antispam delete on/off\n" +
        ".antispam warn on/off\n" +
        ".antispam kick on/off",
    });
  }

  data[from][mode] = state === "on";
  saveData(data);

  return sock.sendMessage(from, {
    text: `✅ AntiSpam *${mode.toUpperCase()}* set to *${state.toUpperCase()}*`,
  });
};
