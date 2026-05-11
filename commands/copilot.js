// ==============================================
// 🤖 Azahrabot Copilot AI (v1.0)
// Uses ElitePro Copilot API + Memory
// ==============================================

const fs = require("fs");
const path = require("path");
const axios = require("axios");

const MEMORY_PATH = path.join(__dirname, "../data/copilot_memory.json");

// 🧠 Load memory
let memory = {};
if (fs.existsSync(MEMORY_PATH)) {
  try {
    memory = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8"));
  } catch {
    memory = {};
  }
} else {
  fs.mkdirSync(path.dirname(MEMORY_PATH), { recursive: true });
  fs.writeFileSync(MEMORY_PATH, JSON.stringify({}, null, 2));
}

// 💾 Save memory
function saveMemory() {
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
}

module.exports = async (sock, msg, from, text, args) => {
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return sock.sendMessage(
      from,
      {
        text: "🤖 *Copilot AI*\n\nUsage:\n.copilot <your question>",
      },
      { quoted: msg }
    );
  }

  try {
    await sock.sendMessage(from, {
      react: { text: "🤖", key: msg.key },
    });

    await sock.sendPresenceUpdate("composing", from);

    // 🧠 Init memory
    if (!memory[from]) memory[from] = [];

    // Add user input
    memory[from].push(prompt);

    // Keep last 10 messages
    if (memory[from].length > 10) {
      memory[from].shift();
    }

    // Combine context
    const fullPrompt = memory[from].join("\n");

    // 📡 API call
    const res = await axios.get(
      `https://eliteprotech-apis.zone.id/copilot?q=${encodeURIComponent(fullPrompt)}`,
      { timeout: 30000 }
    );

    if (!res.data?.success) {
      throw new Error("API failed");
    }

    const reply = res.data.text || "😅 No response";

    // Save AI reply too
    memory[from].push(reply);
    saveMemory();

    await sock.sendMessage(
      from,
      { text: reply },
      { quoted: msg }
    );

  } catch (err) {
    console.error("❌ copilot error:", err.message);

    await sock.sendMessage(
      from,
      { text: "⚠️ AI is busy. Try again." },
      { quoted: msg }
    );
  } finally {
    await sock.sendPresenceUpdate("paused", from);
  }
};