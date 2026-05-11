// =============================================
// 🧹 Azahrabot Group Remove Command (v2.0 FINAL)
// =============================================

const settings = require("../settings");

function pureNum(jid = "") {
  return (jid.split("@")[0] || "").split(":")[0].replace(/\D/g, "");
}

async function isBotAdmin(sock, groupId) {
  try {
    const meta = await sock.groupMetadata(groupId);
    const botNum = pureNum(sock.user.id);
    return meta.participants.some(
      (p) =>
        pureNum(p.id) === botNum &&
        (p.admin === "admin" || p.admin === "superadmin")
    );
  } catch (e) {
    console.log("⚠️ botAdminCheck error:", e.message);
    return false;
  }
}

async function isSenderAdmin(sock, groupId, sender) {
  try {
    const meta = await sock.groupMetadata(groupId);
    const senderNum = pureNum(sender);
    return meta.participants.some(
      (p) =>
        pureNum(p.id) === senderNum &&
        (p.admin === "admin" || p.admin === "superadmin")
    );
  } catch (e) {
    console.log("⚠️ senderAdminCheck error:", e.message);
    return false;
  }
}

module.exports = async (sock, msg, from, text, args = []) => {
  try {
    // ✅ Group-only check
    if (!from.endsWith("@g.us"))
      return sock.sendMessage(from, { text: "❌ This command only works in group chats." }, { quoted: msg });

    const ownerNum = (settings.ownerNumber || "").replace(/[^0-9]/g, "");
    const ownerJid = `${ownerNum}@s.whatsapp.net`;
    const senderJid = msg.key.participant || msg.key.remoteJid || "";

    const senderIsOwner = msg.key.fromMe || senderJid.includes(ownerNum);
    const senderIsAdmin = await isSenderAdmin(sock, from, senderJid);
    const botIsAdmin = await isBotAdmin(sock, from);

    if (!senderIsAdmin && !senderIsOwner)
      return sock.sendMessage(from, { text: "❌ Only group admins can use this command." }, { quoted: msg });

    if (!botIsAdmin)
      return sock.sendMessage(from, { text: "⚠️ I need admin right to remove members. Make me admin and try again." }, { quoted: msg });

    // 🧠 Parse argument
    const code = (args[0] || "").replace(/\D/g, "");
    if (!code)
      return sock.sendMessage(from, { text: "❗ Usage: `.remove +<country_code>`\nExample: `.remove +91`" }, { quoted: msg });

    const meta = await sock.groupMetadata(from);
    const participants = meta.participants || [];
    const targets = participants.filter((p) => pureNum(p.id).startsWith(code));

    if (!targets.length)
      return sock.sendMessage(from, { text: `⚠️ No members found with +${code}.` }, { quoted: msg });

    const victims = targets.map((v) => v.id);
    await sock.sendMessage(from, {
      text: `🚨 Removing ${victims.length} member(s) with +${code}...`,
      mentions: victims,
    }, { quoted: msg });

    // remove one by one safely
    for (const jid of victims) {
      try {
        await sock.groupParticipantsUpdate(from, [jid], "remove");
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        console.log("⚠ remove failed:", jid, err.message);
      }
    }

    await sock.sendMessage(from, { text: `✅ Finished removing +${code} members.` }, { quoted: msg });
  } catch (err) {
    console.error("❌ .remove error:", err);
    await sock.sendMessage(from, { text: `⚠️ Error: ${err.message}` }, { quoted: msg });
  }
};
