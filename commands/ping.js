// ==============================================
// ⚡ Azahrabot Ping (Pure Kontal Style)
// ==============================================

const kontolreply = require("../kontal"); // kontal handles branding

module.exports = async (sock, msg, from) => {
  try {
    // ⚡ React first
    await sock.sendMessage(from, {
      react: { text: "⚡", key: msg.key }
    }).catch(() => {});
  } catch {}

  try {
    const start = Date.now();

    await sock.sendMessage(
      from,
      { text: "⏳ *Calculating speed...*" },
      { quoted: msg }
    );

    const ping = Date.now() - start;

    const finalText = `
╭━━━〔 🐉 AZAHRA BOT STATUS 〕━━━⬣
┃ 🚀 Speed : ${ping} ms
╰━━━━━━━━━━━━━━━━━━━━⬣
`;

    // 🔥 Uses kontal.js EXACT branding style
    await kontolreply(sock, msg, finalText);

  } catch (err) {
    console.error("❌ Ping error:", err.message);
    await sock.sendMessage(
      from,
      { text: "⚠️ Ping test failed." },
      { quoted: msg }
    );
  }
};
