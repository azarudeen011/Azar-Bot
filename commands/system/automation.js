const fs = require("fs");
const path = require("path");
const settings = require("../../settings");

const automationPath = path.join(process.cwd(), "data", "automation.json");

function getAutomation() {
  if (!fs.existsSync(automationPath)) {
    const defaultData = {
      autoreact: false,
      autotyping: false,
      autoread: false,
      autostatusview: false,
      autostatusreact: false,
    };
    fs.mkdirSync(path.dirname(automationPath), { recursive: true });
    fs.writeFileSync(automationPath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(automationPath, "utf8"));
}

function saveAutomation(data) {
  fs.writeFileSync(automationPath, JSON.stringify(data, null, 2));
}

const { isPairedOwner } = require("../../lib/guards");

module.exports = async function automationController(sock, msg, from, text, args) {
  if (!isPairedOwner(msg)) {
    return sock.sendMessage(from, {
      text: "❌ Owner only command."
    }, { quoted: msg });
  }

  const cmd = text.toLowerCase().split(" ")[0].replace(".", "");
  const current = getAutomation();
  const arg = args[0]?.toLowerCase();

  if (!arg || !["on", "off"].includes(arg)) {
    return sock.sendMessage(from, {
      text: `🔄 *${cmd.toUpperCase()}* is currently *${current[cmd] ? "ON" : "OFF"}*\nUse \`. ${cmd} on\` or \`. ${cmd} off\``
    }, { quoted: msg });
  }

  current[cmd] = arg === "on";
  saveAutomation(current);

  return sock.sendMessage(from, {
    text: `✅ *${cmd.toUpperCase()}* has been turned *${arg.toUpperCase()}*`
  }, { quoted: msg });
};
