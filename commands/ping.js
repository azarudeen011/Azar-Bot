// ==============================================
// ⚡ Azahrabot Ping (One-Line Sharp Style)
// ==============================================

module.exports = async (sock, msg, from) => {
  try {
    const latency = Math.abs(Date.now() - (msg.messageTimestamp * 1000));
    const finalText = `*🚀 sᴘᴇᴇᴅ : [ ${latency} ᴍs ] ⏤͟͟͞͞★ ᴀᴢᴀʜʀᴀ ʙᴏᴛ 🐉*`;

    await sock.sendMessage(from, { text: finalText }, { quoted: msg });
  } catch (err) {
    console.error("❌ Ping error:", err.message);
    await sock.sendMessage(
      from,
      { text: "⚠️ Ping test failed." },
      { quoted: msg }
    );
  }
};
