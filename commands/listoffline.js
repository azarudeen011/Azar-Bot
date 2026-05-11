// ==============================================
// 💤 Azahrabot ListOffline (v7.0 Ultra-Stable)
// Accurate inactivity scan • JID normalized • Store-safe
// ==============================================

const { jidNormalizedUser } = require("@whiskeysockets/baileys");
const secure = require("../lib/small_lib");
const store = require("../lib/lightweight_store");

module.exports = async (sock, msg, from, text) => {
  try {
    // Group check
    if (!from.endsWith("@g.us"))
      return sock.sendMessage(from, { text: "❌ Group only." }, { quoted: msg });

    // Metadata
    const meta = await sock.groupMetadata(from);
    const participants = meta.participants || [];

    // Sender normalized
    const sender = jidNormalizedUser(msg.key.participant || msg.key.remoteJid);

    // Admin check
    const adminList = participants
      .filter(p => p.admin)
      .map(p => jidNormalizedUser(p.id));

    const isAdmin = adminList.includes(sender) || msg.key.fromMe;
    if (!isAdmin)
      return sock.sendMessage(from, { text: "❌ Admins only!" }, { quoted: msg });

    // Days threshold
    let days = 1;
    const match = text.match(/(\d+)\s*d?/i);
    if (match) days = parseInt(match[1]);

    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;

    // 🔍 Load messages (store → fallback)
    let messages = [];

    // FROM LIGHTWEIGHT STORE (MAP)
    if (store.messages[from]) {
      messages = Array.from(store.messages[from].values());
    }

    // FALLBACK: Baileys dynamic history
    if (messages.length === 0 && sock.store?.loadMessages) {
      try {
        messages = await sock.store.loadMessages(from, 250);
      } catch (e) {
        console.log("⚠️ Could not dynamically load history:", e.message);
      }
    }

    if (!messages.length) {
      return sock.sendMessage(from, {
        text: "⚠️ No stored messages yet. Allow bot to stay longer in group.",
      }, { quoted: msg });
    }

    // 🔥 Build active-user set
    const active = new Set();

    for (const m of messages) {
      const rawJid = m?.key?.participant;
      if (!rawJid) continue;

      const user = jidNormalizedUser(rawJid);
      const ts = (Number(m.messageTimestamp) || 0) * 1000;

      if (ts >= threshold) active.add(user);
    }

    // ❌ Filter inactive users
    const inactive = participants
      .map(p => jidNormalizedUser(p.id))
      .filter(id => !active.has(id));

    if (!inactive.length) {
      return sock.sendMessage(
        from,
        { text: `✅ No inactive members in the last *${days} day${days>1?"s":""}*.` },
        { quoted: msg }
      );
    }

    // 📋 List formatting
    const list = inactive
      .map((id, i) => `${i + 1}. @${id.split("@")[0]}`)
      .join("\n");

    const caption = `
💤 *Inactive Members (${days} day${days > 1 ? "s" : ""})*
────────────────────
${list}
────────────────────
🙈 *Total:* ${inactive.length}
> powered by *${secure.author || "AzarTech"}* ⚡
    `.trim();

    await sock.sendMessage(
      from,
      { text: caption, mentions: inactive },
      { quoted: msg }
    );

  } catch (err) {
    console.error("❌ .listoffline error:", err);
    await sock.sendMessage(
      from,
      { text: `⚠️ Error: ${err.message}` },
      { quoted: msg }
    );
  }
};
