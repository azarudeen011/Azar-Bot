// ==============================================
// 💘 Azahrabot — .ship Command (Group Only + Reply Support)
// Ships two users with heart and love meter
// ==============================================

module.exports = async (sock, msg, from) => {
  try {
    if (!from.endsWith("@g.us")) {
      return sock.sendMessage(from, { text: "❌ This command works only in groups." }, { quoted: msg });
    }

    const group = await sock.groupMetadata(from);
    const participants = group.participants.map(p => p.id);

    // Mentions + reply detection
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const mentions = ctx?.mentionedJid || [];
    const repliedUser = ctx?.participant;

    // Combine both (reply has priority)
    let finalTargets = [...mentions];
    if (repliedUser && !finalTargets.includes(repliedUser)) {
      finalTargets.unshift(repliedUser);
    }

    // Remove duplicates
    finalTargets = [...new Set(finalTargets)];

    const pickRandom = () =>
      participants[Math.floor(Math.random() * participants.length)];

    // ===========================
    // 0️⃣ No mentions & no reply → pick random 2
    // ===========================
    if (finalTargets.length === 0) {
      if (participants.length < 2) {
        return sock.sendMessage(from, { text: "❌ Not enough users to ship." }, { quoted: msg });
      }

      let A = pickRandom();
      let B = pickRandom();
      while (B === A) B = pickRandom();

      const shipScore = Math.floor(Math.random() * 101);

      return sock.sendMessage(from, {
        text: `💘 *Love Match Found!*\n\n❤️ @${A.split("@")[0]}  +  @${B.split("@")[0]} ❤️\n\n*💕 Compatibility:* ${shipScore}%`,
        mentions: [A, B]
      }, { quoted: msg });
    }

    // ===========================
    // 1️⃣ One user detected → random second
    // ===========================
    if (finalTargets.length === 1) {
      const A = finalTargets[0];

      const others = participants.filter(x => x !== A);
      if (others.length === 0) {
        return sock.sendMessage(from, { text: "❌ No one else available to ship with." }, { quoted: msg });
      }

      const B = others[Math.floor(Math.random() * others.length)];
      const shipScore = Math.floor(Math.random() * 101);

      return sock.sendMessage(from, {
        text: `💘 *Love Match Found!*\n\n❤️ @${A.split("@")[0]}  +  @${B.split("@")[0]} ❤️\n\n*💕 Compatibility:* ${shipScore}%`,
        mentions: [A, B]
      }, { quoted: msg });
    }

    // ===========================
    // 2️⃣ Two users detected → use them
    // ===========================
    if (finalTargets.length >= 2) {
      const A = finalTargets[0];
      const B = finalTargets[1];
      const shipScore = Math.floor(Math.random() * 101);

      return sock.sendMessage(from, {
        text: `💘 *Perfect Match?*\n\n❤️ @${A.split("@")[0]}  +  @${B.split("@")[0]} ❤️\n\n*💕 Compatibility:* ${shipScore}%`,
        mentions: [A, B]
      }, { quoted: msg });
    }

  } catch (err) {
    console.error(".ship error:", err);
    await sock.sendMessage(from, { text: "❌ Failed to ship users." }, { quoted: msg });
  }
};
