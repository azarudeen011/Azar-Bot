const axios = require("axios");

module.exports = async (sock, msg, from, text, args = []) => {
  try {
    const word = args.join(" ").trim();
    
    if (!word) {
      return await sock.sendMessage(
        from,
        { text: "📚 *Usage:* .dictionary <word>\nExample: `.dictionary hello`" },
        { quoted: msg }
      );
    }

    await sock.sendMessage(from, { react: { text: "📚", key: msg.key } }).catch(() => {});

    let res;
    try {
      res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    } catch (e) {
      if (e.response && e.response.status === 404) {
        return await sock.sendMessage(
          from,
          { text: `❌ Could not find a definition for *${word}*.` },
          { quoted: msg }
        );
      }
      throw e;
    }

    const data = res.data[0];
    
    let reply = `📚 *Dictionary: ${data.word}*\n\n`;

    // Group by partOfSpeech or just iterate meaning
    data.meanings.forEach(meaning => {
      reply += `*${meaning.partOfSpeech}*\n`;
      meaning.definitions.slice(0, 3).forEach(def => {
        reply += `• ${def.definition}\n`;
      });
      reply += `\n`;
    });

    reply += `⚡AZAHRABOT`;

    await sock.sendMessage(from, { text: reply.trim() }, { quoted: msg });

  } catch (err) {
    console.error("Dictionary API Error:", err.message);
    await sock.sendMessage(from, { text: "⚠️ Failed to fetch definition." }, { quoted: msg });
  }
};
