// ==============================================
// 🧹 Azahrabot — .delete Command (v5.5 Silent Build)
// Admin-Only • Deletes messages silently • Clean & Fast
// ==============================================

const { canRunAdminCommand } = require("../lib/guards");
const { jidNormalizedUser } = require("@whiskeysockets/baileys");
const store = require("../lib/lightweight_store");

module.exports = async (sock, msg, from, text, args) => {
  try {
    // 🧠 Only for groups
    if (!from.endsWith("@g.us")) return;

    // 🔐 Admin check (Manual 'AntiLink trick' for maximum stability)
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;
    const botId = jidNormalizedUser(sock.user.id);

    // 🕵️ Find the bot in participants list
    const me = participants.find(p => 
      jidNormalizedUser(p.id) === botId || 
      p.id.includes(botId.split('@')[0]) ||
      (p.lid && p.lid === botId)
    );

    // 🛡️ Permissive check: If we can't find the bot in metadata, assume it MIGHT be admin
    const isBotAdmin = me ? (me.admin === "admin" || me.admin === "superadmin" || !!me.admin) : true;

    if (!isBotAdmin) {
      return await sock.sendMessage(from, { text: "❌ *ERROR:* I need to be a *Group Admin* to delete messages!" }, { quoted: msg });
    }

    const senderNum = sender.split('@')[0].split(':')[0];
    const isSenderAdmin = participants.some(p => 
      (p.id.includes(senderNum) || (p.lid && p.lid === sender)) && 
      (p.admin === "admin" || p.admin === "superadmin" || !!p.admin)
    );

    const { isPairedOwner } = require("../lib/guards");
    const isOwner = await isPairedOwner(sock, msg);

    if (!isSenderAdmin && !isOwner) {
      return await sock.sendMessage(from, { text: "❌ Only *group admins* can use this command." }, { quoted: msg });
    }

    // 📦 Parse message text and reply info
    const body = text || "";
    const parts = body.trim().split(/\s+/);
    let countArg = null;

    // 🧮 Extract number
    if (args[0]) {
      const num = parseInt(args[0], 10);
      if (!isNaN(num) && num > 0) countArg = Math.min(num, 50);
    }

    const ctx = msg.message?.extendedTextMessage?.contextInfo || {};
    const repliedParticipant = ctx.participant || null;
    const mentioned = Array.isArray(ctx.mentionedJid) && ctx.mentionedJid.length > 0 ? ctx.mentionedJid[0] : null;

    // ℹ️ Help / Usage info
    if (!ctx.stanzaId && !args[0] && !mentioned) {
        let help = `🧹 *DELETE COMMAND USAGE* 🧹\n`;
        help += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        help += `*1. Reply Delete:*\nReply to a message with \`.delete\`\n\n`;
        help += `*2. Bulk Delete:*\n\`.delete <number>\` (e.g. \`.delete 10\`)\n\n`;
        help += `*3. Targeted Delete:*\n\`.delete @user <number>\`\n\n`;
        help += `_Note: Max delete limit is 50 messages at once._`;
        
        return sock.sendMessage(from, { text: help }, { quoted: msg });
    }

    if (!countArg) countArg = 1; // fallback to 1 if nothing else

    // 🎯 Target selection
    let targetUser = null;
    let repliedMsgId = null;
    let deleteAll = false;

    if (repliedParticipant && ctx.stanzaId) {
      targetUser = repliedParticipant;
      repliedMsgId = ctx.stanzaId;
    } else if (mentioned) {
      targetUser = mentioned;
    } else {
      deleteAll = true;
    }

    // 🧱 Load chat messages
    const chatMessages = store.messages[from] ? Array.from(store.messages[from].values()) : [];
    const toDelete = [];
    const seen = new Set();

    if (deleteAll) {
      // delete last N messages (group-wide)
      for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg; i--) {
        const m = chatMessages[i];
        if (!seen.has(m.key.id) && !m.message?.protocolMessage && !m.key.fromMe && m.key.id !== msg.key.id) {
          toDelete.push(m);
          seen.add(m.key.id);
        }
      }
    } else {
      // delete from specific user
      if (repliedMsgId) {
        const repliedMsg = chatMessages.find(
          (m) => m.key.id === repliedMsgId && (m.key.participant || m.key.remoteJid) === targetUser
        );
        if (repliedMsg) {
          toDelete.push(repliedMsg);
          seen.add(repliedMsg.key.id);
        } else {
          try {
            await sock.sendMessage(from, {
              delete: {
                remoteJid: from,
                fromMe: false,
                id: repliedMsgId,
                participant: repliedParticipant,
              },
            });
            countArg = Math.max(0, countArg - 1);
          } catch {}
        }
      }

      for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg; i--) {
        const m = chatMessages[i];
        const user = m.key.participant || m.key.remoteJid;
        if (user === targetUser && !seen.has(m.key.id) && !m.message?.protocolMessage) {
          toDelete.push(m);
          seen.add(m.key.id);
        }
      }
    }

    // 🧨 Execute silent deletion (no reply message)
    for (const m of toDelete) {
      try {
        const msgParticipant = jidNormalizedUser(deleteAll
          ? m.key.participant || m.key.remoteJid
          : targetUser);
        await sock.sendMessage(from, {
          delete: {
            remoteJid: from,
            fromMe: false,
            id: m.key.id,
            participant: msgParticipant,
          },
        });
        await new Promise((r) => setTimeout(r, 120)); // quick delay
      } catch {}
    }

  } catch (err) {
    console.error("❌ Delete command error:", err);
  }
};
