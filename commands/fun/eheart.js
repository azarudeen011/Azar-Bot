// ==============================================
// ❤️ E-Heart Animated Emoji
// ==============================================

module.exports = async (sock, msg, from) => {
  const frames = ["🤍", "🩷", "💖", "💗", "💓", "💞", "💕", "💘", "💝"];
  try {
    const sentMsg = await sock.sendMessage(from, { text: frames[0] }, { quoted: msg });
    for (let i = 1; i < frames.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      await sock.sendMessage(from, { text: frames[i], edit: sentMsg.key });
    }
  } catch (err) {
    console.error("Emoji animation error:", err.message);
  }
};
