// ==============================================
// ⚙️ Azahrabot Menu Command (v5.4 — Attached Native View Button)
// One Message • Clean Banner • Native WhatsApp “View Channel” Button
// ==============================================

const fs = require("fs");
const path = require("path");
const { banner, menuText } = require("../utils/menuData");
const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from) => {
  try {
    // 📜 React to show bot received the command
    await sock.sendMessage(from, { react: { text: "📜", key: msg.key } }).catch(() => { });
  } catch (e) {
    console.log("Reaction failed:", e?.message || e);
  }

  // 🚀 Loading Animation
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    const frames = [
      "💠 *𝗔𝗭𝗔𝗛𝗥𝗔𝗕𝗢𝗧* [▱▱▱▱▱▱▱▱▱▱] 0%",
      "💠 *𝗔𝗭𝗔𝗛𝗥𝗔𝗕𝗢𝗧* [▰▰▱▱▱▱▱▱▱▱] 20%",
      "💠 *𝗔𝗭𝗔𝗛𝗥𝗔𝗕𝗢𝗧* [▰▰▰▰▱▱▱▱▱▱] 40%",
      "💠 *𝗔𝗭𝗔𝗛𝗥𝗔𝗕𝗢𝗧* [▰▰▰▰▰▰▱▱▱▱] 60%",
      "💠 *𝗔𝗭𝗔𝗛𝗥𝗔𝗕𝗢𝗧* [▰▰▰▰▰▰▰▰▱▱] 80%",
      "💠 *𝗔𝗭𝗔𝗛𝗥𝗔𝗕𝗢𝗧* [▰▰▰▰▰▰▰▰▰▰] 100%",
      "✅ *𝗔𝗭𝗔𝗛𝗥𝗔𝗕𝗢𝗧 𝗜𝗦 𝗛𝗘𝗥𝗘!*"
    ];

    let loadMsg = await sock.sendMessage(from, { text: frames[0] }, { quoted: msg });

    for (let i = 1; i < frames.length; i++) {
      await delay(500);
      await sock.sendMessage(from, { text: frames[i], edit: loadMsg.key });
    }

    await delay(200); // Tiny pause before blasting the menu
  } catch (err) {
    console.log("Loading animation error:", err?.message || err);
  }

  // 🧠 Ensure /data folder exists
  const dataDir = path.join(__dirname, "../data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // ⚙️ Get bot mode safely
  const modeFile = path.join(dataDir, "botMode.json");
  let currentMode = "public";

  try {
    if (fs.existsSync(modeFile)) {
      const modeData = JSON.parse(fs.readFileSync(modeFile, "utf8"));
      if (modeData?.mode && typeof modeData.mode === "string") {
        currentMode = modeData.mode.toLowerCase();
      }
    } else {
      fs.writeFileSync(modeFile, JSON.stringify({ mode: "public" }, null, 2));
    }
  } catch (err) {
    console.warn("⚠️ Mode file error:", err.message);
  }

  // 🕒 Date & time
  const now = new Date();
  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString();

  // 📜 Build dynamic menu
  const text = menuText(dateStr, timeStr, currentMode).trim();

  // 📰 Channel JID (for native view button)
  const newsletterJid = secure.channel?.jid;

  try {
    await sock.sendMessage(
      from,
      {
        image: { url: banner },
        caption: text,
        headerType: 4,
        contextInfo: {
          // ✅ The magic combo that attaches native “View Channel” button
          forwardedNewsletterMessageInfo: {
            newsletterJid, // Your channel ID e.g. 120363404914980672@newsletter
            serverMessageId: 1,
            // newsletterName: secure.channel?.name, // optional, can hide if you want only button
          },
          isForwarded: true,
          forwardingScore: 1,
        },
      },
      { quoted: msg }
    );
  } catch (err) {
    console.error("❌ Menu send failed:", err?.message || err);
    await sock.sendMessage(from, { text: "⚠️ Could not send menu." }, { quoted: msg });
  }
};
