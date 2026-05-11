// =============================================
// 🪪 Azahrabot — WhatsApp Real Profile Info (v10.0 Final)
// Uses internal contact IQ query for real name + bio
// =============================================

module.exports = async (sock, msg, from, text, args) => {
  try {
    const ctx = msg.message?.extendedTextMessage?.contextInfo || {};
    const mentioned = ctx.mentionedJid?.[0];
    const replied = ctx.participant;
    const sender = msg.key.participant || msg.key.remoteJid;

    // ✅ Pick target JID
    let targetJid;
    if (mentioned) targetJid = mentioned;
    else if (replied) targetJid = replied;
    else if (args[0]) {
      const num = args[0].replace(/[^0-9]/g, "");
      if (num.length < 6) return sock.sendMessage(from, { text: "❗ Invalid number format." }, { quoted: msg });
      targetJid = `${num}@s.whatsapp.net`;
    } else targetJid = sender;

    // 🧠 Validate WhatsApp existence
    const [exists] = await sock.onWhatsApp(targetJid);
    if (!exists?.exists) {
      return sock.sendMessage(from, { text: `❌ This number is not registered on WhatsApp.` }, { quoted: msg });
    }

    // 📡 Internal query to pull full contact details (real name + about)
    let nameFound = "Unknown";
    let about = "—";

    try {
      const iq = {
        tag: "iq",
        attrs: { type: "get", xmlns: "jabber:iq:privacy", to: "s.whatsapp.net", id: "get_contact_info" },
        content: [
          {
            tag: "query",
            attrs: { xmlns: "w:profile:picture" },
            content: [
              { tag: "picture", attrs: { type: "image", jid: targetJid } },
              { tag: "picture", attrs: { type: "status", jid: targetJid } },
            ],
          },
        ],
      };

      await sock.query(iq).catch(() => {});

      const status = await sock.fetchStatus(targetJid).catch(() => null);
      about = status?.status || "Hidden";

      const nameQuery = sock?.store?.contacts?.[targetJid];
      if (nameQuery?.name) nameFound = nameQuery.name;
      else if (nameQuery?.verifiedName) nameFound = nameQuery.verifiedName;
      else if (nameQuery?.notify) nameFound = nameQuery.notify;
      else nameFound = targetJid.split("@")[0];

    } catch (e) {
      console.error("⚠️ Profile query error:", e);
    }

    // 🖼 Profile Picture
    let pfp;
    try {
      pfp = await sock.profilePictureUrl(targetJid, "image");
    } catch {
      pfp = "https://i.ibb.co/fDZbVYM/user-placeholder.png";
    }

    const numDisplay = targetJid.replace("@s.whatsapp.net", "");

    // 🧾 Profile Card
    const caption = `
╭━━━〔 *👤 WhatsApp Profile* 〕━━━╮
│ 🪪 *Name:* ${nameFound}
│ 📞 *Number:* wa.me/${numDisplay}
│ 💬 *Bio:* ${about}
│ 🕒 *Checked:* ${new Date().toLocaleString()}
╰━━━━━━━━━━━━━━━━━━━━━━╯
> powered by *Azahra Bot* ⚡
`.trim();

    await sock.sendMessage(from, {
      image: { url: pfp },
      caption,
      mimetype: "image/jpeg",
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ getname serious error:", err);
    await sock.sendMessage(from, { text: `⚠️ Failed to fetch WhatsApp profile.\n${err.message}` }, { quoted: msg });
  }
};
