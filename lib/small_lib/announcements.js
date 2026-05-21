const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "../../../data/announcements_config.json");

function isAnnouncementsEnabled(groupId) {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return false;
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH));
    return !!config[groupId];
  } catch (e) {
    return false;
  }
}

async function handleAnnouncements(sock, type, update) {
  try {
    const groupId = update.id || update.key?.remoteJid;
    if (!isAnnouncementsEnabled(groupId)) return;

    let msgText = "";

    if (type === "participants") {
      const { action, author, participants } = update;
      if (action !== "promote" && action !== "demote") return;

      const promoter = author ? `@${author.split("@")[0]}` : "Someone";
      const victims = participants.map(p => `@${p.split("@")[0]}`).join(", ");
      
      const mentions = [];
      if (author) mentions.push(author);
      participants.forEach(p => mentions.push(p));

      if (action === "promote") {
        msgText = `📢 *Group Announcement*\n\nUser ${victims} has been promoted to Admin by ${promoter}! 🎉`;
      } else if (action === "demote") {
        msgText = `📢 *Group Announcement*\n\nUser ${victims} has been demoted by ${promoter}. ⬇️`;
      }

      await sock.sendMessage(groupId, { text: msgText, mentions });
    } else if (type === "groups") {
      const { subject, desc, announce, restrict, icon, memberAddMode, joinApprovalMode } = update;
      const changes = [];
      
      if (subject) changes.push(`*Subject Changed:* ${subject}`);
      if (desc) changes.push(`*Description Changed*`);
      if (announce === true) changes.push(`*Group Closed* (Only Admins can send messages)`);
      if (announce === false) changes.push(`*Group Opened* (All members can send messages)`);
      if (restrict === true) changes.push(`*Settings Restricted* (Only Admins can edit group info)`);
      if (restrict === false) changes.push(`*Settings Opened* (All members can edit group info)`);
      if (icon) changes.push(`*Group Icon Changed*`);
      if (memberAddMode === true) changes.push(`*Member Add Mode Enabled* (All members can add members)`);
      if (memberAddMode === false) changes.push(`*Member Add Mode Disabled* (Only Admins can add members)`);
      if (joinApprovalMode === true) changes.push(`*Join Approval Enabled* (Admins must approve new members)`);
      if (joinApprovalMode === false) changes.push(`*Join Approval Disabled* (New members can join instantly)`);
      
      if (changes.length > 0) {
        msgText = `📢 *Group Update*\n\n${changes.join("\n")}`;
        await sock.sendMessage(groupId, { text: msgText });
      }
      return;
    } else if (type === "stub") {
      const msg = update;
      const stubType = msg.messageStubType;
      const params = msg.messageStubParameters || [];
      const author = msg.key.participant || msg.key.remoteJid;
      const authorMention = author ? `@${author.split("@")[0]}` : "Someone";
      const mentions = author ? [author] : [];

      console.log(`[DEBUG] StubType detected: ${stubType}, params:`, params);

      let change = "";
      if (stubType === 21) change = `*Subject Changed* by ${authorMention}`;
      else if (stubType === 22) change = `*Group Icon Changed* by ${authorMention}`;
      else if (stubType === 24) change = `*Description Changed* by ${authorMention}`;
      else if (stubType === 25) change = params[0] === "on" ? `*Settings Restricted* (Only Admins can edit info) by ${authorMention}` : `*Settings Opened* (All members can edit info) by ${authorMention}`;
      else if (stubType === 26) change = params[0] === "on" ? `*Group Closed* (Only Admins can send messages) by ${authorMention}` : `*Group Opened* (All members can send messages) by ${authorMention}`;
      else if (stubType === 171) change = params[0] === "on" ? `*Member Add Mode Enabled* (All members can add members) by ${authorMention}` : `*Member Add Mode Disabled* (Only Admins can add members) by ${authorMention}`;

      if (change) {
        msgText = `📢 *Group Update*\n\n${change}`;
        await sock.sendMessage(groupId, { text: msgText, mentions });
      }
    }
  } catch (err) {
    console.error("Announcements Error:", err);
  }
}

module.exports = { handleAnnouncements };
