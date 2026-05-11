// ==============================================
// 📬 Mail Inbox Checker (FIXED FINAL)
// ==============================================

const axios = require("axios");

module.exports = async (sock, msg, from, text, args) => {
  try {

    const email = args[0];

    if (!email) {
      return sock.sendMessage(
        from,
        { text: "❌ Usage: .mailinbox <email>" },
        { quoted: msg }
      );
    }

    const res = await axios.get(
      `https://eliteprotech-apis.zone.id/tempemail?email=${encodeURIComponent(email)}`
    );

    if (!res.data?.success) {
      throw new Error("API failed");
    }

    const mail = res.data.inbox;

    // ❌ No mail
    if (!mail || !mail.from) {
      return sock.sendMessage(
        from,
        { text: "📭 Inbox is empty." },
        { quoted: msg }
      );
    }

    // ✅ Extract details
    const fromUser = mail.from || "Unknown";
    const subject = mail.subject || "No subject";
    const time = mail.time || "Unknown";
    const content = mail.html
      ? mail.html.replace(/<[^>]+>/g, "").slice(0, 500)
      : "No content";

    const textMsg = `
📬 *Inbox for ${email}*

👤 *From:* ${fromUser}
📝 *Subject:* ${subject}
⏱ *Time:* ${time}

📩 *Message:*
${content}
`.trim();

    await sock.sendMessage(from, { text: textMsg }, { quoted: msg });

  } catch (err) {
    console.error("❌ mailinbox error:", err.message);

    await sock.sendMessage(
      from,
      { text: "❌ Failed to fetch inbox." },
      { quoted: msg }
    );
  }
};