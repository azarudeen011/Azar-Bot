const fs = require("fs");
const path = require("path");
const { jidNormalizedUser } = require("@whiskeysockets/baileys");
const { isSudo } = require("../../guards");

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const PROMOTE_FILE = path.join(DATA_DIR, "antipromote_config.json");
const DEMOTE_FILE = path.join(DATA_DIR, "antidemote_config.json");

function getConfig(file) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) { }
  return {};
}

function setConfig(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Ensure the bot itself is admin
async function isBotAdmin(sock, groupId) {
  try {
    const meta = await sock.groupMetadata(groupId);
    const botId = jidNormalizedUser(sock.user.id);
    const botLid = sock.user.lid ? jidNormalizedUser(sock.user.lid) : null;

    const botParticipant = meta.participants.find(p => {
      const pId = p.id ? jidNormalizedUser(p.id) : null;
      const pLid = p.lid ? jidNormalizedUser(p.lid) : null;
      return pId === botId || pLid === botId || 
             (p.id && p.id.includes(botId.split('@')[0])) ||
             (botLid && pId === botLid) || (botLid && pLid === botLid);
    });

    if (!botParticipant) {
      console.log(`[AntiPromote/Demote] isBotAdmin: Bot not found in participants list (LID issue). Assuming true to test action. botId=${botId}`);
      return true; // Permissive fallback
    }
    
    const isAdmin = !!(botParticipant.admin || botParticipant.isAdmin || botParticipant.isSuperAdmin);
    return isAdmin;
  } catch (e) {
    console.error("isBotAdmin Error:", e);
    return true; // Permissive fallback
  }
}

async function handlePromoteDemote(sock, update) {
  const { id: groupId, participants, action, author } = update;
  console.log("🛠️ Anti-Promote/Demote triggered:", JSON.stringify(update));

  const promoter = author ? jidNormalizedUser(author) : null;
  const botId = jidNormalizedUser(sock.user.id);
  const botLid = sock.user.lid ? jidNormalizedUser(sock.user.lid) : null;

  let isBotThePromoter = false;
  if (promoter) {
    if (promoter === botId || (botLid && promoter === botLid) || promoter.includes(botId.split('@')[0])) {
      isBotThePromoter = true;
    } else {
      try {
        const meta = await sock.groupMetadata(groupId);
        const promoterMatch = meta.participants.find(p => p.lid === promoter || p.id === promoter);
        if (promoterMatch && (promoterMatch.id === botId || promoterMatch.id.includes(botId.split('@')[0]))) {
          isBotThePromoter = true;
        }
      } catch (e) {}
    }
  }

  // ignore if the bot itself did it
  if (isBotThePromoter) {
    console.log("AntiPromote/Demote: Ignored because the bot itself performed the action.");
    return;
  }

  // check if promoter is sudo/owner
  if (promoter) {
    const isSudoPromoter = await isSudo(sock, { key: { remoteJid: groupId, participant: promoter } });
    if (isSudoPromoter) return; // sudo/owners are exempt
  }

  if (action === "promote") {
    const config = getConfig(PROMOTE_FILE);
    const groupConfig = config[groupId];
    if (!groupConfig) { console.log("AntiPromote: not enabled for group", groupId); return; }

    const { kick, warn, silent } = groupConfig;
    if (!kick && !warn && !silent) { console.log("AntiPromote: no penalty set"); return; }

    const hasBotAdmin = await isBotAdmin(sock, groupId);
    if (!hasBotAdmin) { console.log("AntiPromote: bot is not admin"); return; }

    console.log("AntiPromote: Check passed. Executing action...");
    let targets = participants.map(p => jidNormalizedUser(p));
    
    // Ignore if the bot is the ONLY target (someone is just making the bot admin)
    targets = targets.filter(t => t !== botId && t !== botLid && !t.includes(botId.split('@')[0]));
    if (targets.length === 0) {
      console.log("AntiPromote: The bot was the only target being promoted. Ignoring to allow bot setup.");
      return; 
    }
    
    // Action to take
    const victims = [];
    if (promoter) victims.push(promoter);
    targets.forEach(t => victims.push(t));
    const uniqueVictims = [...new Set(victims)];

    try {
      // 1. Demote everyone involved
      await sock.groupParticipantsUpdate(groupId, uniqueVictims, "demote");

      if (!silent) {
        const who = promoter ? `@${promoter.split("@")[0]}` : "Someone";
        let msg = `🚨 *Anti-Promote Triggered* 🚨\n\n${who} tried to promote members!\n`;
        if (kick) msg += `Action: Demote & Kick.`;
        else if (warn) msg += `Action: Demote & Warn.`;
        await sock.sendMessage(groupId, { text: msg, mentions: uniqueVictims });
      }

      if (kick) {
        await sock.groupParticipantsUpdate(groupId, uniqueVictims, "remove");
      }
    } catch (e) {
      console.error("AntiPromote Error:", e);
    }
  }

  if (action === "demote") {
    const config = getConfig(DEMOTE_FILE);
    const groupConfig = config[groupId];
    if (!groupConfig) { console.log("AntiDemote: not enabled for group", groupId); return; }

    const { kick, warn, silent } = groupConfig;
    if (!kick && !warn && !silent) { console.log("AntiDemote: no penalty set"); return; }

    const hasBotAdmin = await isBotAdmin(sock, groupId);
    if (!hasBotAdmin) { console.log("AntiDemote: bot is not admin"); return; }

    console.log("AntiDemote: Check passed. Executing action...");
    let targets = participants.map(p => jidNormalizedUser(p));
    
    // Ignore if the bot is the ONLY target (someone is just demoting the bot)
    targets = targets.filter(t => t !== botId && t !== botLid && !t.includes(botId.split('@')[0]));
    if (targets.length === 0) {
      console.log("AntiDemote: The bot was the only target being demoted. Ignoring.");
      return; 
    }
    
    try {
      // Demote the offender
      if (promoter) await sock.groupParticipantsUpdate(groupId, [promoter], "demote");
      
      // Re-promote the victims
      await sock.groupParticipantsUpdate(groupId, targets, "promote");

      if (!silent) {
        const who = promoter ? `@${promoter.split("@")[0]}` : "Someone";
        let msg = `🚨 *Anti-Demote Triggered* 🚨\n\n${who} tried to demote members!\n`;
        if (kick) msg += `Action: Offender demoted & kicked, victims restored.`;
        else if (warn) msg += `Action: Offender demoted & warned, victims restored.`;
        
        const mentions = [...targets];
        if (promoter) mentions.push(promoter);
        await sock.sendMessage(groupId, { text: msg, mentions });
      }

      if (kick && promoter) {
        await sock.groupParticipantsUpdate(groupId, [promoter], "remove");
      }
    } catch (e) {
      console.error("AntiDemote Error:", e);
    }
  }
}

module.exports = {
  getConfig,
  setConfig,
  PROMOTE_FILE,
  DEMOTE_FILE,
  handlePromoteDemote
};
