// ==============================================
// 🌐 Azahrabot — .trt Command (v6.3 Reply Edition)
// Translate text between languages (Auto Detect)
// Now supports replying to any message
// ==============================================

const axios = require("axios");

module.exports = async (sock, msg, from, text, args = []) => {
  try {
    // 📝 Extract replied message if exists
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const repliedText =
      quoted?.conversation ||
      quoted?.extendedTextMessage?.text ||
      quoted?.imageMessage?.caption ||
      quoted?.videoMessage?.caption ||
      null;

    // 🧠 If replying: treat message like ".trt <lang>"
    if (repliedText) {
      const targetLang = (args[0] || "").toLowerCase();
      if (!targetLang || targetLang.length < 2) {
        return await sock.sendMessage(
          from,
          { text: "🌍 Usage (reply):\n.trt <language-code>\n\nExample:\n.trt en" },
          { quoted: msg }
        );
      }

      await sock.sendMessage(from, { react: { text: "🌐", key: msg.key } }).catch(() => {});

      // Google Translate HTTP API
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
        targetLang
      )}&dt=t&q=${encodeURIComponent(repliedText)}`;

      const res = await axios.get(url);
      const data = res.data;

      const translated = Array.isArray(data) && Array.isArray(data[0])
        ? data[0].map((item) => item[0]).join("")
        : null;

      const fromLang = (data[2] ? data[2] : "auto").toUpperCase();

      if (!translated) {
        return await sock.sendMessage(from, { text: "⚠️ Translation failed." }, { quoted: msg });
      }

      const replyMsg = `
🌐 *AzarTech Translate Result*
━━━━━━━━━━━━━━━━━━━
📝 *Input:* ${repliedText}
🔤 *From:* ${fromLang}
🌎 *To:* ${targetLang.toUpperCase()}
💬 *Translated:* ${translated}
━━━━━━━━━━━━━━━━━━━
> Powered by AzahraBot ⚡
      `.trim();

      return await sock.sendMessage(from, { text: replyMsg }, { quoted: msg });
    }

    // ==================================================================
    // NORMAL MODE (No reply) — same as your original code
    // ==================================================================

    const input = args.join(" ").trim();

    if (!input) {
      const usageText = `
🌍 *Usage:* .trt <text> <language-code>
━━━━━━━━━━━━━━━━━━━
💡 Popular codes:
en – English
hi – Hindi
ta – Tamil
es – Spanish
fr – French
de – German
ar – Arabic
ru – Russian
ja – Japanese
it – Italian
pt – Portuguese
id – Indonesian
━━━━━━━━━━━━━━━━━━━
> Example: .trt Good night ta
      `.trim();

      await sock.sendMessage(from, { text: usageText }, { quoted: msg });
      return;
    }

    const parts = input.split(" ");
    const targetLang = parts.pop().toLowerCase();
    const query = parts.join(" ").trim();

    if (!query || targetLang.length < 2) {
      return await sock.sendMessage(
        from,
        { text: "❌ Please provide both text and target language.\nExample: `.trt Hello ta`" },
        { quoted: msg }
      );
    }

    await sock.sendMessage(from, { react: { text: "🌐", key: msg.key } }).catch(() => {});

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
      targetLang
    )}&dt=t&q=${encodeURIComponent(query)}`;

    const res = await axios.get(url);
    const data = res.data;

    const translated = Array.isArray(data) && Array.isArray(data[0])
      ? data[0].map((item) => item[0]).join("")
      : null;

    if (!translated) {
      return await sock.sendMessage(from, { text: "⚠️ Failed to translate." }, { quoted: msg });
    }

    const fromLangCode = (data[2] ? data[2] : "auto").toUpperCase();

    const replyMsg = `
🌐 *AzarTech Translate Result*
━━━━━━━━━━━━━━━━━━━
📝 *Input:* ${query}
🔤 *From:* ${fromLangCode}
🌎 *To:* ${targetLang.toUpperCase()}
💬 *Translated:* ${translated}
━━━━━━━━━━━━━━━━━━━
> Powered by AzahraBot ⚡
    `.trim();

    await sock.sendMessage(from, { text: replyMsg }, { quoted: msg });

  } catch (err) {
    console.error("❌ .trt error:", err);
    await sock.sendMessage(from, { text: "⚠️ Translation failed. Try again later." }, { quoted: msg });
  }
};
