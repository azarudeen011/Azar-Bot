const fs = require("fs");
const path = require("path");
const settings = require("../../settings");

const chatbotPath = path.join(process.cwd(), "data", "chatbot.json");

function getChatbot() {
  if (!fs.existsSync(chatbotPath)) {
    const defaultData = { enabled: false, engine: "gpt" };
    fs.mkdirSync(path.dirname(chatbotPath), { recursive: true });
    fs.writeFileSync(chatbotPath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  const data = JSON.parse(fs.readFileSync(chatbotPath, "utf8"));
  // Ensure engine field exists (backward compat)
  if (!data.engine) data.engine = "gpt";
  return data;
}

function saveChatbot(data) {
  fs.writeFileSync(chatbotPath, JSON.stringify(data, null, 2));
}

const { isPairedOwner } = require("../../lib/guards");

module.exports = async function chatbotController(sock, msg, from, text, args) {
  if (!(await isPairedOwner(sock, msg))) {
    return sock.sendMessage(from, { text: "❌ Owner only command." }, { quoted: msg });
  }

  const current = getChatbot();
  const arg1 = args[0]?.toLowerCase();
  const arg2 = args[1]?.toLowerCase();

  // ── Engine switching: .chatbot gpt on / .chatbot gemini on ──
  if (arg1 === "gpt" || arg1 === "gemini") {
    if (arg2 === "on") {
      current.engine = arg1;
      current.enabled = true;
      saveChatbot(current);
      const engineLabel = arg1 === "gpt" ? "GPT (OpenRouter)" : "Gemini";
      return sock.sendMessage(from, {
        text: `✅ AI Chatbot switched to *${engineLabel}* and turned *ON*`
      }, { quoted: msg });
    }
    // Just switching engine without on/off
    current.engine = arg1;
    saveChatbot(current);
    const engineLabel = arg1 === "gpt" ? "GPT (OpenRouter)" : "Gemini";
    const status = current.enabled ? "ON ✅" : "OFF ❌";
    return sock.sendMessage(from, {
      text: `🔄 AI Engine switched to *${engineLabel}*\n🤖 Chatbot is *${status}*`
    }, { quoted: msg });
  }

  // ── Standard on/off: .chatbot on / .chatbot off ──
  if (arg1 === "on" || arg1 === "off") {
    current.enabled = arg1 === "on";
    saveChatbot(current);
    const engineLabel = current.engine === "gemini" ? "Gemini" : "GPT (OpenRouter)";
    return sock.sendMessage(from, {
      text: `✅ AI Chatbot turned *${arg1.toUpperCase()}*\n⚙️ Engine: *${engineLabel}*`
    }, { quoted: msg });
  }

  // ── Status: .chatbot ──
  const status = current.enabled ? "ON ✅" : "OFF ❌";
  const engineLabel = current.engine === "gemini" ? "Gemini" : "GPT (OpenRouter)";
  return sock.sendMessage(from, {
    text: `🤖 *CHATBOT STATUS*\n\n` +
      `📌 Status: *${status}*\n` +
      `⚙️ Engine: *${engineLabel}*\n\n` +
      `*Usage:*\n` +
      `▸ .chatbot on / off\n` +
      `▸ .chatbot gpt on\n` +
      `▸ .chatbot gemini on`
  }, { quoted: msg });
};
