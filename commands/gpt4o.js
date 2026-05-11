// ==============================================
// 🤖 Azahrabot — GPT-4o Command (PrinceTechn API)
// With persistent conversation memory
// ==============================================

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const secure = require("../lib/small_lib");
const settings = require("../settings");

const MEMORY_PATH = path.join(__dirname, "../data/gpt4o_memory.json");

// 🧠 Load memory on startup
let chatMemory = {};
if (fs.existsSync(MEMORY_PATH)) {
  try {
    chatMemory = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8"));
  } catch {
    chatMemory = {};
  }
} else {
  fs.mkdirSync(path.dirname(MEMORY_PATH), { recursive: true });
  fs.writeFileSync(MEMORY_PATH, JSON.stringify({}, null, 2));
}

// 🧩 Save memory
function saveMemory() {
  try {
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(chatMemory, null, 2));
  } catch (err) {
    console.error("⚠️ Failed to save GPT-4o memory:", err.message);
  }
}

module.exports = async (sock, msg, from, text, args = []) => {
  const prompt = args.join(" ").trim();

  if (!prompt) {
    await sock.sendMessage(
      from,
      {
        text:
          `💬 *${secure.botName || "Azahra Bot"} GPT-4o*\n\n` +
          `Type something after ${settings.prefix || "."}gpt4o like:\n` +
          `\`${settings.prefix || "."}gpt4o explain quantum physics\``,
      },
      { quoted: msg }
    );
    return;
  }

  // React + typing
  await sock.sendMessage(from, { react: { text: "🤖", key: msg.key } }).catch(() => {});
  await sock.sendPresenceUpdate("composing", from);

  // 🧠 Initialize user memory
  if (!chatMemory[from]) chatMemory[from] = [];
  chatMemory[from].push({ role: "user", content: prompt });

  // Limit memory to last 10 messages to keep URL short
  if (chatMemory[from].length > 10) {
    chatMemory[from].splice(0, chatMemory[from].length - 10);
  }

  try {
    // 🔗 Compile chat history into a string for the GET request
    const chatContext = chatMemory[from]
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join("\n");
      
    // Raw AI model prompt without bot-specific instructions
    const fullPrompt = chatContext;

    const url = `https://api.princetechn.com/api/ai/gpt4o?apikey=prince&q=${encodeURIComponent(fullPrompt)}`;
    
    const res = await axios.get(url, { timeout: 30000 });
    
    const reply = res.data?.result?.trim();
    
    if (!reply) throw new Error("Empty response from API");

    // Store reply in memory
    chatMemory[from].push({ role: "assistant", content: reply });
    saveMemory();

    await sock.sendMessage(from, { text: reply }, { quoted: msg });
  } catch (err) {
    console.error("❌ GPT-4o Error:", err.message);
    
    // Attempt rollback of the failed user message from memory if api fails
    if(chatMemory[from] && chatMemory[from].length > 0) {
        chatMemory[from].pop(); 
    }

    await sock.sendMessage(from, { text: "😕 GPT-4o servers are currently busy — try again soon." }, { quoted: msg });
  } finally {
    await sock.sendPresenceUpdate("paused", from);
  }
};
